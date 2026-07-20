// ── Claude API 서비스 ─────────────────────────────────────────────────────
// Server mode (VITE_API_URL set): routes through backend → no API key on client
// Dev fallback (no VITE_API_URL): direct Anthropic call with user's own key
import { getApiKey } from '@/services/storage'
import { serverChat, QuotaExceededError, type ActionType } from '@/services/api/api-client'
import { isGuest, GuestBlockedError } from '@/services/guest/guest-mode'
import { getPrompts, getAppLanguage, type BuildPromptOptions, type ExistingCharacterHint } from './prompts'

export { QuotaExceededError }

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-sonnet-4-6'
const USE_SERVER = !!import.meta.env.VITE_API_URL

interface ContentBlock {
  type: 'text' | 'image'
  text?: string
  source?: { type: 'base64'; media_type: string; data: string }
}

interface CallOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }>
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
  signal?: AbortSignal
  action_type: ActionType
}

async function callApi(opts: CallOptions): Promise<string> {
  // 게스트(둘러보기) 모드는 절대 AI/서버 호출을 하지 않는다.
  if (isGuest()) throw new GuestBlockedError()

  if (USE_SERVER) {
    const { text } = await serverChat({
      messages: opts.messages as Parameters<typeof serverChat>[0]['messages'],
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      signal: opts.signal,
      action_type: opts.action_type,
    })
    return text
  }

  // Dev fallback: direct Anthropic call
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('API_KEY_MISSING')

  const body: Record<string, unknown> = {
    model:      MODEL,
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.9,
    messages:   opts.messages,
  }
  if (opts.systemPrompt) body.system = opts.systemPrompt

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }

  const data = await res.json() as { content?: Array<{ text: string }> }
  return data.content?.[0]?.text || ''
}

// ── 재시도 래퍼 (최대 2회, 1초 간격) ────────────────────────────────────────
async function callApiWithRetry(opts: CallOptions): Promise<string> {
  const MAX = 2
  let lastErr: Error = new Error('unknown')
  for (let attempt = 0; attempt <= MAX; attempt++) {
    try {
      return await callApi(opts)
    } catch (err) {
      lastErr = err as Error
      const msg = lastErr.message ?? ''
      // 재시도 불필요한 오류: abort, 인증, 할당량, API 키 없음
      if (
        lastErr.name === 'AbortError' || msg.includes('AbortError') ||
        msg === 'QUOTA_EXCEEDED' || msg === 'API_KEY_MISSING' ||
        msg.includes('401') || msg.includes('402')
      ) throw lastErr
      if (opts.signal?.aborted) throw lastErr
      if (attempt < MAX) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastErr
}

// ── 공개 API ──────────────────────────────────────────────────────────────

interface KeyImageObj { mediaType: string; base64Data: string; dataUrl: string }
interface AttachmentObj { mediaType?: string; base64Data?: string; dataUrl?: string }

interface GenerateDiaryOptions extends BuildPromptOptions {
  keyImageObj?: KeyImageObj | null
  attachments?: AttachmentObj[]
  signal?: AbortSignal
}

export async function generateDiary(
  opts: GenerateDiaryOptions
): Promise<{ content: string; continuityContext: string }> {
  const p           = getPrompts(getAppLanguage())
  const prompt      = p.buildDiaryPrompt(opts)
  const keyImageObj = opts.keyImageObj
  const attachments = opts.attachments ?? []
  const hasKeyImage = !!(keyImageObj?.base64Data && keyImageObj.base64Data.length >= 100)
  const hasAttachments = attachments.length > 0

  function buildContent(): ContentBlock[] {
    const parts: ContentBlock[] = []
    if (hasKeyImage) {
      parts.push({ type: 'image', source: { type: 'base64', media_type: keyImageObj!.mediaType, data: keyImageObj!.base64Data } })
    }
    for (const att of attachments) {
      const b64  = att.base64Data ?? att.dataUrl?.split(',')[1] ?? ''
      const mime = att.mediaType ?? att.dataUrl?.match(/^data:([^;,]+)/)?.[1] ?? 'image/jpeg'
      if (b64.length >= 100) parts.push({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } })
    }
    const imageInstruction = p.buildImageInstruction(hasKeyImage, hasAttachments)
    parts.push({ type: 'text', text: imageInstruction + prompt })
    return parts
  }

  const messageContent = (hasKeyImage || hasAttachments) ? buildContent() : prompt

  const content = await callApiWithRetry({
    temperature: 0.85,
    systemPrompt: p.diarySystemPrompt,
    messages: [{ role: 'user', content: messageContent }],
    signal: opts.signal,
    action_type: 'generate_diary',
  })

  const ctxPrompt = p.buildContinuityPrompt(content)
  const continuityContext = await callApiWithRetry({
    temperature: 0.3,
    messages: [{ role: 'user', content: ctxPrompt }],
    signal: opts.signal,
    action_type: 'extract_characters',
  }).catch(() => '')

  return { content, continuityContext }
}

export interface ExtractedCharacter {
  name: string
  relationship: string
  role: string
  aliases: string[]
  matched_existing: boolean
  hairColor: string
  skinTone: 'light' | 'medium' | 'tan' | 'dark'
  eyeColor: string
  clothColor: string
  gender: 'male' | 'female' | 'unknown'
  appearances: string[]
  episodes: Array<{ date: string; summary: string }>
  avatarData: { hairColor: string; skinTone: string; eyeColor: string; clothColor: string }
}

export async function extractCharacters(
  diaryContent: string,
  sessionDate: string,
  existingCharacters: ExistingCharacterHint[] = []
): Promise<ExtractedCharacter[]> {
  const prompt = getPrompts(getAppLanguage()).buildExtractCharactersPrompt(diaryContent, existingCharacters)

  try {
    const raw  = await callApiWithRetry({ temperature: 0.2, maxTokens: 1024, messages: [{ role: 'user', content: prompt }], action_type: 'extract_characters' })
    const json = raw.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    const chars = JSON.parse(json) as ExtractedCharacter[]
    return chars.map((c) => ({
      ...c,
      aliases: Array.isArray(c.aliases) ? c.aliases.filter((a) => a && a !== c.name) : [],
      matched_existing: c.matched_existing === true,
      appearances: [sessionDate],
      episodes: [{ date: sessionDate, summary: c.role }],
      avatarData: { hairColor: c.hairColor, skinTone: c.skinTone, eyeColor: c.eyeColor, clothColor: c.clothColor },
    }))
  } catch {
    return []
  }
}

export interface ReviewResult {
  comments: Array<{ text: string }>
  rating: number
  criticReview: string
}

export async function generateReviews(
  diaries: Array<{ date?: string; content?: string }>,
  prevReviews?: ReviewResult | null
): Promise<ReviewResult | null> {
  const summary = diaries.slice(-8).map((d, i) =>
    `[${i + 1}] ${d.date ?? ''}\n${(d.content ?? '').slice(0, 300)}`
  ).join('\n\n---\n\n')

  const prompt = getPrompts(getAppLanguage()).buildReviewsPrompt(summary, prevReviews)

  try {
    const raw    = await Promise.race([
      callApiWithRetry({ temperature: 0.95, maxTokens: 500, messages: [{ role: 'user', content: prompt }], action_type: 'generate_feedback' }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
    ])
    return JSON.parse(raw.replace(/```json|```/g, '').trim()) as ReviewResult
  } catch {
    return null
  }
}

// ── 과거의 주인공에게 묻기 ────────────────────────────────────────────────
export async function askPastSelf(
  question: string,
  diaries: Array<{ date?: string; content?: string; kindlingSnapshot?: string[]; kindlings?: Array<{ id: string; text: string }> }>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ answer: string; sourceDate?: string }> {
  const p = getPrompts(getAppLanguage())
  const diaryBlock = diaries.slice(-15).map((d) =>
    `[${d.date ?? p.noDateLabel}]\n${(d.content ?? '').slice(0, 500)}`
  ).join('\n\n---\n\n')

  // 사용자가 직접 쓴 원문 땔감 텍스트 수집 (AI가 가공하기 전 날것의 말투)
  const rawKindlings = diaries.flatMap((d) =>
    (d.kindlingSnapshot ?? d.kindlings?.map((k) => k.text) ?? []).filter(Boolean)
  )
  const kindlingStyleBlock = rawKindlings.length > 0
    ? `${p.kindlingStyleHeader}${rawKindlings.slice(-30).map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : ''

  const systemPrompt = p.buildPastSelfSystemPrompt(diaryBlock, kindlingStyleBlock)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.slice(-10),
    { role: 'user', content: question },
  ]

  const raw = await callApiWithRetry({ systemPrompt, messages, maxTokens: 400, temperature: 0.85, action_type: 'character_chat' })

  // 날짜 파싱 시도
  const dateMatch = raw.match(/\{\s*date:\s*['"]([^'"]+)['"]\s*\}/)
  const sourceDate = dateMatch?.[1]
  const answer = raw.replace(/\{\s*date:\s*['"][^'"]*['"]\s*\}/g, '').trim()

  return { answer, sourceDate }
}

// ── 주인공 도감: 캐릭터 스토리 ───────────────────────────────────────────
export async function generateCharacterStory(
  diaries: Array<{ date?: string; content?: string }>
): Promise<string> {
  const p = getPrompts(getAppLanguage())
  if (diaries.length < 2) return p.characterStoryFallback

  const block = diaries.slice(-20).map((d) =>
    `[${d.date ?? ''}]\n${(d.content ?? '').slice(0, 400)}`
  ).join('\n---\n')

  const prompt = p.buildCharacterStoryPrompt(block)

  return callApiWithRetry({ messages: [{ role: 'user', content: prompt }], maxTokens: 600, temperature: 0.85, action_type: 'generate_codex' })
}

// ── 주인공 도감: 성향 스탯 ───────────────────────────────────────────────
export async function generateCharacterStats(
  diaries: Array<{ date?: string; content?: string }>
): Promise<Array<{ label: string; value: number }>> {
  if (diaries.length === 0) return []

  const p = getPrompts(getAppLanguage())
  const block = diaries.slice(-15).map((d) =>
    `[${d.date ?? ''}]\n${(d.content ?? '').slice(0, 300)}`
  ).join('\n---\n')

  const prompt = p.buildCharacterStatsPrompt(block)

  try {
    const raw = await callApiWithRetry({ messages: [{ role: 'user', content: prompt }], maxTokens: 100, temperature: 0.3, action_type: 'generate_codex' })
    const obj = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Record<string, number>
    return Object.entries(obj).map(([label, value]) => ({ label, value: Math.min(100, Math.max(0, value)) }))
  } catch {
    return p.characterStatsFallback
  }
}

// ── 업적 배지 감지 ────────────────────────────────────────────────────────
export async function detectBadge(
  diary: { date?: string; content?: string }
): Promise<{ title: string; desc: string; tag: string } | null> {
  const prompt = getPrompts(getAppLanguage()).buildBadgePrompt(diary.date ?? '', (diary.content ?? '').slice(0, 600))

  try {
    const raw = await callApiWithRetry({ messages: [{ role: 'user', content: prompt }], maxTokens: 150, temperature: 0.7, action_type: 'extract_characters' })
    const cleaned = raw.replace(/```json|```/g, '').trim()
    if (cleaned === 'null' || !cleaned.startsWith('{')) return null
    return JSON.parse(cleaned) as { title: string; desc: string; tag: string }
  } catch {
    return null
  }
}

// ── 땔감 반문 질문 생성 ───────────────────────────────────────────────────
export async function generateKindlingQuestion(text: string): Promise<string> {
  const prompt = getPrompts(getAppLanguage()).buildKindlingQuestionPrompt(text)

  try {
    const raw = await callApiWithRetry({ messages: [{ role: 'user', content: prompt }], maxTokens: 60, temperature: 0.9, action_type: 'generate_kindling_question' })
    return raw.trim().replace(/^["']|["']$/g, '')
  } catch {
    return ''
  }
}

// ── 다음 챕터: -??? 편지 생성 ─────────────────────────────────────────────
export async function generateNextChapterLetter(
  diaries: Array<{ date?: string; content?: string }>
): Promise<string> {
  const p = getPrompts(getAppLanguage())
  const systemPrompt = p.letterSystemPrompt

  const diaryBlock = diaries.slice(-5).map((d) =>
    `[${d.date ?? p.noDateLabel}]\n${(d.content ?? '').slice(0, 400)}`
  ).join('\n\n---\n\n')

  const userMessage = p.buildLetterUserMessage(diaryBlock)

  const raw = await callApiWithRetry({
    messages: [{ role: 'user', content: userMessage }],
    systemPrompt,
    maxTokens: 400,
    temperature: 0.9,
    action_type: 'generate_letter',
  })
  return raw.trim()
}
