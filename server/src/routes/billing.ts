import { Router } from 'express'
import { Paddle, EventName } from '@paddle/paddle-node-sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import {
  getUsage,
  updateSubscription,
  getUserByPaddleCustomer,
} from '../services/supabase.js'

const router = Router()

const paddle = new Paddle(process.env.PADDLE_API_KEY!)

const PRICES: Record<string, string> = {
  weekly:  process.env.PADDLE_PRICE_WEEKLY!,
  monthly: process.env.PADDLE_PRICE_MONTHLY!,
}

// ── POST /api/billing/checkout — Paddle 결제 링크 생성 ────────────────────
router.post('/checkout', requireUser, async (req: AuthRequest, res) => {
  const { plan } = req.body as { plan: 'weekly' | 'monthly' }
  if (!PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })

  const usage = await getUsage(req.userId!)

  const txParams: Parameters<typeof paddle.transactions.create>[0] = {
    items: [{ priceId: PRICES[plan], quantity: 1 }],
    customData: { userId: req.userId!, plan },
    checkout: { url: `${process.env.CLIENT_ORIGIN}/diary?checkout=success` },
  }

  // Reuse existing Paddle customer if available
  if (usage.paddle_customer_id) {
    txParams.customerId = usage.paddle_customer_id
  }

  const transaction = await paddle.transactions.create(txParams)
  // Paddle hosted checkout URL
  const checkoutUrl = `https://checkout.paddle.com/checkout/buy/${transaction.id}`

  res.json({ url: checkoutUrl })
})

// ── POST /api/billing/webhook — Paddle 웹훅 처리 ─────────────────────────
router.post('/webhook', async (req, res) => {
  const signature = req.headers['paddle-signature'] as string | undefined
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET

  let eventData: { event_type: string; data: Record<string, unknown> }

  if (webhookSecret && signature) {
    try {
      const rawBody = (req as unknown as { rawBody: string }).rawBody ?? ''
      paddle.webhooks.unmarshal(rawBody, webhookSecret, signature)
      eventData = req.body as typeof eventData
    } catch {
      return res.status(400).send('Webhook signature verification failed')
    }
  } else {
    // Webhook secret not yet configured — accept without verification (dev only)
    eventData = req.body as typeof eventData
  }

  const { event_type, data } = eventData

  switch (event_type) {
    case EventName.SubscriptionActivated:
    case EventName.SubscriptionUpdated: {
      const sub = data as {
        customer_id?: string
        id?: string
        status?: string
        custom_data?: { userId?: string; plan?: string }
        items?: Array<{ price?: { id?: string } }>
      }
      const customerId = sub.customer_id
      const subscriptionId = sub.id
      const isActive = sub.status === 'active'

      const userId = sub.custom_data?.userId
      if (!userId) break

      const plan = sub.custom_data?.plan as 'weekly' | 'monthly' | undefined

      await updateSubscription(userId, {
        subscription_status:    isActive ? 'active' : 'canceled',
        subscription_plan:      isActive ? (plan ?? null) : null,
        paddle_customer_id:     customerId ?? null,
        paddle_subscription_id: subscriptionId ?? null,
      })
      break
    }

    case EventName.SubscriptionCanceled: {
      const sub = data as {
        customer_id?: string
        custom_data?: { userId?: string }
      }
      const customerId = sub.customer_id
      if (!customerId) break

      const usage = await getUserByPaddleCustomer(customerId)
      if (!usage) break

      await updateSubscription(usage.user_id, {
        subscription_status: 'canceled',
        subscription_plan:   null,
      })
      break
    }

    case EventName.TransactionCompleted: {
      // Subscription activation is handled by SubscriptionActivated
      // TransactionCompleted fires for every payment — update customer ID if missing
      const tx = data as {
        customer_id?: string
        subscription_id?: string
        custom_data?: { userId?: string; plan?: string }
      }
      const userId = tx.custom_data?.userId
      if (!userId || !tx.customer_id) break

      const usage = await getUsage(userId)
      if (!usage.paddle_customer_id) {
        await updateSubscription(userId, {
          paddle_customer_id:     tx.customer_id,
          paddle_subscription_id: tx.subscription_id ?? null,
        })
      }
      break
    }
  }

  res.json({ received: true })
})

// ── GET /api/billing/subscription — 현재 구독 상태 ────────────────────────
router.get('/subscription', requireUser, async (req: AuthRequest, res) => {
  const usage = await getUsage(req.userId!)
  res.json({
    status: usage.subscription_status,
    plan:   usage.subscription_plan,
  })
})

export default router
