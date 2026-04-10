import { Router } from 'express'
import Stripe from 'stripe'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import {
  getUsage,
  updateSubscription,
  getUserByStripeCustomer,
} from '../services/supabase.js'

const router = Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES = {
  weekly:  process.env.STRIPE_PRICE_WEEKLY!,
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
}

// ── POST /api/billing/checkout — create Stripe Checkout session ───────────
router.post('/checkout', requireUser, async (req: AuthRequest, res) => {
  const { plan } = req.body as { plan: 'weekly' | 'monthly' }
  if (!PRICES[plan]) return res.status(400).json({ error: 'Invalid plan' })

  const usage = await getUsage(req.userId!)

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICES[plan], quantity: 1 }],
    success_url: `${process.env.CLIENT_ORIGIN}/diary?checkout=success`,
    cancel_url:  `${process.env.CLIENT_ORIGIN}/diary?checkout=cancel`,
    metadata: { userId: req.userId!, plan },
    subscription_data: {
      metadata: { userId: req.userId!, plan },
    },
  }

  // Reuse existing Stripe customer if available
  if (usage.stripe_customer_id) {
    sessionParams.customer = usage.stripe_customer_id
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  res.json({ url: session.url })
})

// ── POST /api/billing/portal — customer billing portal ───────────────────
router.post('/portal', requireUser, async (req: AuthRequest, res) => {
  const usage = await getUsage(req.userId!)
  if (!usage.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' })
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: usage.stripe_customer_id,
    return_url: `${process.env.CLIENT_ORIGIN}/diary`,
  })
  res.json({ url: session.url })
})

// ── POST /api/billing/webhook — Stripe webhooks ───────────────────────────
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return res.status(400).send('Webhook signature verification failed')
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId  = session.metadata?.userId
      const plan    = session.metadata?.plan as 'weekly' | 'monthly' | undefined
      if (!userId) break

      await updateSubscription(userId, {
        subscription_status:  'active',
        subscription_plan:    plan ?? null,
        stripe_customer_id:   session.customer as string,
        stripe_subscription_id: session.subscription as string,
      })
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const usage = await getUserByStripeCustomer(customerId)
      if (!usage) break

      const isActive = sub.status === 'active'
      await updateSubscription(usage.user_id, {
        subscription_status: isActive ? 'active' : (sub.status as 'canceled' | 'past_due'),
        subscription_plan: isActive
          ? (sub.metadata?.plan as 'weekly' | 'monthly' ?? usage.subscription_plan)
          : null,
      })
      break
    }
  }

  res.json({ received: true })
})

export default router
