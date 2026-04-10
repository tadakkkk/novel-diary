import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { incrementCallCount } from '../services/supabase.js'

const router = Router()

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-opus-4-6'

// ── Quota check middleware ────────────────────────────────────────────────
async function checkQuota(req: AuthRequest, res: any, next: any) {
  const { allowed, remaining } = await incrementCallCount(req.userId!)
  if (!allowed) {
    return res.status(402).json({ error: 'QUOTA_EXCEEDED', remaining: 0 })
  }
  res.setHeader('x-calls-remaining', String(remaining))
  next()
}

// ── POST /api/ai/chat — generic Claude call ───────────────────────────────
router.post('/chat', requireUser, checkQuota, async (req: AuthRequest, res) => {
  const { messages, systemPrompt, maxTokens = 2048, temperature = 0.9 } = req.body as {
    messages: Anthropic.MessageParam[]
    systemPrompt?: string
    maxTokens?: number
    temperature?: number
  }

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages required' })
  }

  const params: Anthropic.MessageCreateParams = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    messages,
  }
  if (systemPrompt) params.system = systemPrompt

  const result = await anthropic.messages.create(params)
  const text = result.content[0]?.type === 'text' ? result.content[0].text : ''

  res.json({ text })
})

// ── POST /api/ai/usage — get current call count & quota status ─────────────
router.get('/usage', requireUser, async (req: AuthRequest, res) => {
  const { getUsage } = await import('../services/supabase.js')
  const usage = await getUsage(req.userId!)
  res.json({
    callCount: usage.call_count,
    subscriptionStatus: usage.subscription_status,
    subscriptionPlan: usage.subscription_plan,
    freeQuota: 30,
    remaining: usage.subscription_status === 'active'
      ? -1
      : Math.max(0, 30 - usage.call_count),
  })
})

export default router
