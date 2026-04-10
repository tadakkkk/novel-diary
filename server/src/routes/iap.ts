// ── Apple In-App Purchase Receipt Validation ─────────────────────────────
// Called by RevenueCat webhooks or directly from the client after purchase.
// RevenueCat handles the Apple receipt validation — we just listen to RC webhooks
// to update our own subscription status in Supabase.

import { Router } from 'express'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { updateSubscription } from '../services/supabase.js'

const router = Router()

// ── POST /api/iap/webhook — RevenueCat 웹훅 처리 ─────────────────────────
// RevenueCat sends events when purchases are made, renewed, or cancelled.
// Configure this URL in RevenueCat dashboard → Project Settings → Webhooks
router.post('/webhook', async (req, res) => {
  const rcSecret = process.env.REVENUECAT_WEBHOOK_SECRET
  const authHeader = req.headers.authorization

  // Verify RevenueCat webhook secret if configured
  if (rcSecret && authHeader !== rcSecret) {
    console.warn('[iap/webhook] Unauthorized webhook attempt')
    return res.status(401).send('Unauthorized')
  }

  const event = req.body as {
    event: {
      type: string
      app_user_id: string
      product_id?: string
      period_type?: string
      expiration_at_ms?: number
    }
  }

  const { type, app_user_id: userId, product_id } = event.event

  console.log(`[iap/webhook] event=${type} userId=${userId} product=${product_id}`)

  try {
    switch (type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION': {
        const plan = product_id?.includes('monthly') ? 'monthly'
                   : product_id?.includes('weekly')  ? 'weekly'
                   : null
        if (plan) {
          await updateSubscription(userId, {
            subscription_status: 'active',
            subscription_plan: plan,
          })
        }
        break
      }

      case 'CANCELLATION':
      case 'EXPIRATION': {
        await updateSubscription(userId, {
          subscription_status: 'canceled',
          subscription_plan: null,
        })
        break
      }
    }
  } catch (err) {
    console.error('[iap/webhook] DB update failed:', (err as Error).message)
  }

  res.json({ received: true })
})

// ── GET /api/iap/status — 현재 구독 상태 확인 ────────────────────────────
// Client calls this after IAP purchase to sync subscription state from our DB.
router.get('/status', requireUser, async (req: AuthRequest, res) => {
  try {
    const { getUsage } = await import('../services/supabase.js')
    const usage = await getUsage(req.userId!)
    res.json({ status: usage.subscription_status, plan: usage.subscription_plan })
  } catch (err) {
    console.error('[iap/status]', err)
    res.status(500).json({ error: 'Failed to fetch subscription status' })
  }
})

export default router
