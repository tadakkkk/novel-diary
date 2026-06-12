import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { checkQuota, recordDiaryGeneration, getUsage } from '../services/supabase.js'

const router = Router()

const SONNET = 'claude-sonnet-4-6'
const HAIKU  = 'claude-haiku-4-5-20251001'

const MODEL_BY_ACTION: Record<string, string> = {
  generate_diary:             SONNET,
  generate_codex:             SONNET,
  generate_feedback:          SONNET,
  generate_letter:            SONNET,
  extract_characters:         HAIKU,
  character_chat:             HAIKU,
  generate_kindling_question: HAIKU,
}
const DEFAULT_MODEL = HAIKU

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

// ── POST /api/ai/chat ─────────────────────────────────────────────────────
router.post('/chat', requireUser, async (req: AuthRequest, res) => {
  try {
    const { messages, systemPrompt, maxTokens = 2048, temperature = 0.9, action_type } = req.body as {
      messages: Anthropic.MessageParam[]
      systemPrompt?: string
      maxTokens?: number
      temperature?: number
      action_type?: string
    }

    // Quota only applies to diary generation.
    // 차감(record)은 생성 성공 후로 미루고, 여기서는 읽기 전용 확인만 한다.
    // (Anthropic 호출 실패 + 클라이언트 재시도로 인한 과다 차감 방지)
    if (action_type === 'generate_diary') {
      try {
        const { allowed } = await checkQuota(req.userId!)
        if (!allowed) return res.status(402).json({ error: 'QUOTA_EXCEEDED', remaining: 0 })
      } catch (quotaErr) {
        console.error('[checkQuota]', quotaErr)
        // Don't block on quota errors — let the call through
      }
    }

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages required' })
    }

    const params: Anthropic.MessageCreateParams = {
      model: MODEL_BY_ACTION[action_type ?? ''] ?? DEFAULT_MODEL,
      max_tokens: maxTokens,
      temperature,
      messages,
    }
    if (systemPrompt) params.system = systemPrompt

    const result = await getAnthropic().messages.create(params)
    const text = result.content[0]?.type === 'text' ? result.content[0].text : ''

    // 생성이 성공한 경우에만 차감 — 차감 실패는 로그만 남기고 사용자를 차단하지 않는다.
    if (action_type === 'generate_diary') {
      try {
        const { remaining } = await recordDiaryGeneration(req.userId!)
        res.setHeader('x-calls-remaining', String(remaining))
      } catch (recErr) {
        console.error('[recordDiaryGeneration]', recErr)
      }
    }

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
