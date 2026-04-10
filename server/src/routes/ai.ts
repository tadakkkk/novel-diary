import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { incrementCallCount, getUsage } from '../services/supabase.js'

const router = Router()
const MODEL = 'claude-opus-4-6'

// Lazy Anthropic client — avoids crash if env var missing at module load
let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: key })
  }
  return _anthropic
}

// ── Quota check middleware ────────────────────────────────────────────────
async function checkQuota(req: AuthRequest, res: any, next: any) {
  try {
    const { allowed, remaining } = await incrementCallCount(req.userId!)
    if (!allowed) return res.status(402).json({ error: 'QUOTA_EXCEEDED', remaining: 0 })
    res.setHeader('x-calls-remaining', String(remaining))
    next()
  } catch (err) {
    console.error('[checkQuota]', err)
    // Don't block on quota errors — let the call through
    next()
  }
}

// ── POST /api/ai/chat ─────────────────────────────────────────────────────
router.post('/chat', requireUser, checkQuota, async (req: AuthRequest, res) => {
  try {
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

    const result = await getAnthropic().messages.create(params)
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''

    res.json({ text })
  } catch (err) {
    console.error('[/api/ai/chat]', err)
    const msg = (err as Error).message ?? 'Internal server error'
    res.status(500).json({ error: msg })
  }
})

// ── GET /api/ai/usage ─────────────────────────────────────────────────────
router.get('/usage', requireUser, async (req: AuthRequest, res) => {
  try {
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
  } catch (err) {
    console.error('[/api/ai/usage]', err)
    res.status(500).json({ error: 'Failed to fetch usage' })
  }
})

export default router
