import { Router } from 'express'
import { Paddle, EventName, Environment } from '@paddle/paddle-node-sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import {
  getUsage,
  updateSubscription,
  getUserByPaddleCustomer,
} from '../services/supabase.js'

const router = Router()

// Lazy Paddle client — avoids crash if env var missing at module load
let _paddle: Paddle | null = null
function getPaddle(): Paddle {
  if (!_paddle) {
    const key = process.env.PADDLE_API_KEY
    if (!key) throw new Error('PADDLE_API_KEY not set')
    const isSandbox = key.startsWith('pdl_sdbx_')
    const env = isSandbox ? Environment.sandbox : Environment.production
    console.log(`[billing] Paddle init: ${isSandbox ? 'SANDBOX' : 'LIVE'} mode`)
    _paddle = new Paddle(key, { environment: env })
  }
  return _paddle
}

const PRICES: Record<string, string | undefined> = {
  weekly:  process.env.PADDLE_PRICE_WEEKLY,
  monthly: process.env.PADDLE_PRICE_MONTHLY,
}

// ── GET /api/billing/ping — Paddle 환경 진단 ─────────────────────────────
router.get('/ping', async (_req, res) => {
  const key = process.env.PADDLE_API_KEY ?? ''
  const isSandbox = key.startsWith('pdl_sdbx_')
  const info = {
    keyType:      isSandbox ? 'sandbox' : key.startsWith('pdl_live_') ? 'live' : 'unknown',
    keyPrefix:    key.slice(0, 18) + '...',
    priceWeekly:  process.env.PADDLE_PRICE_WEEKLY ?? 'NOT SET',
    priceMonthly: process.env.PADDLE_PRICE_MONTHLY ?? 'NOT SET',
    environment:  isSandbox ? 'sandbox' : 'production',
  }
  console.log('[billing/ping]', JSON.stringify(info))

  // Try to verify connectivity by listing 1 price
  try {
    const paddle = getPaddle()
    const weekly = process.env.PADDLE_PRICE_WEEKLY
    if (weekly) {
      const price = await paddle.prices.get(weekly)
      res.json({ ok: true, ...info, priceWeeklyStatus: price.status })
    } else {
      res.json({ ok: true, ...info, priceWeeklyStatus: 'not checked' })
    }
  } catch (err) {
    const e = err as Error & { code?: string; detail?: string; errors?: unknown }
    res.status(500).json({
      ok: false, ...info,
      error: e.message,
      code:  e.code,
      detail: e.detail,
      errors: e.errors,
    })
  }
})

// ── POST /api/billing/checkout — Paddle 결제 링크 생성 ────────────────────
router.post('/checkout', requireUser, async (req: AuthRequest, res) => {
  try {
    const { plan } = req.body as { plan: 'weekly' | 'monthly' }
    const priceId = PRICES[plan]
    if (!priceId) return res.status(400).json({ error: 'Invalid plan' })

    const paddle = getPaddle()

    const txParams: Parameters<typeof paddle.transactions.create>[0] = {
      items: [{ priceId, quantity: 1 }],
      customData: { userId: req.userId!, plan },
      checkout: {
        url: `${process.env.CLIENT_ORIGIN ?? 'https://tadakkkk.github.io'}/novel-diary/?checkout=success`,
      },
    }

    // Reuse existing Paddle customer if available
    try {
      const usage = await getUsage(req.userId!)
      if (usage?.paddle_customer_id) txParams.customerId = usage.paddle_customer_id
    } catch {
      // No usage row yet — that's fine, proceed without customerId
    }

    const transaction = await paddle.transactions.create(txParams)

    // Use the checkout URL from the transaction response
    const checkoutUrl = (transaction as unknown as { checkout?: { url?: string } }).checkout?.url
      ?? `https://checkout.paddle.com/checkout/buy/${transaction.id}`

    console.log(`[billing] checkout created: plan=${plan} txId=${transaction.id} url=${checkoutUrl}`)
    res.json({ url: checkoutUrl })
  } catch (err) {
    const e = err as Error & { code?: string; detail?: string; errors?: unknown; type?: string }
    const errDetail = {
      message: e.message,
      code:    e.code,
      type:    e.type,
      detail:  e.detail,
      errors:  e.errors,
    }
    console.error('[billing/checkout] ERROR:', JSON.stringify(errDetail))
    // Return detail in dev/debug mode so we can see it in the browser
    res.status(500).json({ error: e.message ?? '결제 페이지를 생성할 수 없어요.', detail: errDetail })
  }
})

// ── POST /api/billing/webhook — Paddle 웹훅 처리 ─────────────────────────
router.post('/webhook', async (req, res) => {
  const signature   = req.headers['paddle-signature'] as string | undefined
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET

  let eventData: { event_type: string; data: Record<string, unknown> }

  if (webhookSecret && signature) {
    try {
      const rawBody = (req as unknown as { rawBody: string }).rawBody ?? ''
      getPaddle().webhooks.unmarshal(rawBody, webhookSecret, signature)
      eventData = req.body as typeof eventData
    } catch {
      return res.status(400).send('Webhook signature verification failed')
    }
  } else {
    eventData = req.body as typeof eventData
  }

  const { event_type, data } = eventData

  try {
    switch (event_type) {
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionUpdated: {
        const sub = data as {
          customer_id?: string
          id?: string
          status?: string
          custom_data?: { userId?: string; plan?: string }
        }
        const userId = sub.custom_data?.userId
        if (!userId) break

        await updateSubscription(userId, {
          subscription_status:    sub.status === 'active' ? 'active' : 'canceled',
          subscription_plan:      sub.status === 'active' ? (sub.custom_data?.plan as 'weekly' | 'monthly' ?? null) : null,
          paddle_customer_id:     sub.customer_id ?? null,
          paddle_subscription_id: sub.id ?? null,
        })
        break
      }

      case EventName.SubscriptionCanceled: {
        const sub = data as { customer_id?: string }
        if (!sub.customer_id) break
        const usage = await getUserByPaddleCustomer(sub.customer_id)
        if (!usage) break
        await updateSubscription(usage.user_id, {
          subscription_status: 'canceled',
          subscription_plan:   null,
        })
        break
      }

      case EventName.TransactionCompleted: {
        const tx = data as {
          customer_id?: string
          subscription_id?: string
          custom_data?: { userId?: string; plan?: string }
        }
        const userId = tx.custom_data?.userId
        if (!userId || !tx.customer_id) break
        try {
          const usage = await getUsage(userId)
          if (!usage.paddle_customer_id) {
            await updateSubscription(userId, {
              paddle_customer_id:     tx.customer_id,
              paddle_subscription_id: tx.subscription_id ?? null,
            })
          }
        } catch { /* usage row might not exist */ }
        break
      }
    }
  } catch (err) {
    console.error('[billing/webhook]', event_type, (err as Error).message)
  }

  res.json({ received: true })
})

// ── GET /api/billing/subscription ────────────────────────────────────────
router.get('/subscription', requireUser, async (req: AuthRequest, res) => {
  try {
    const usage = await getUsage(req.userId!)
    res.json({ status: usage.subscription_status, plan: usage.subscription_plan })
  } catch (err) {
    console.error('[billing/subscription]', err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

export default router
