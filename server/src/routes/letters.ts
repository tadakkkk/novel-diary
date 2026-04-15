import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import {
  getTodayLetter, insertLetter, markLetterReadDb, getUserLetters,
} from '../services/supabase.js'

const router = Router()
const MODEL  = 'claude-opus-4-6'

let _anthropic: Anthropic | null = null
function getAnthropic(): Anthropic {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: key })
  }
  return _anthropic
}

// 다음 날 자정~오전 6시 랜덤 시각 (UTC)
function nextDeliveryTime(): string {
  const now = new Date()
  // 내일 날짜 00:00 KST = 전날 15:00 UTC
  const tomorrowKST = new Date(now)
  tomorrowKST.setDate(tomorrowKST.getDate() + 1)
  tomorrowKST.setHours(0, 0, 0, 0)
  // KST+9 → UTC-9h
  const tomorrowUTC = new Date(tomorrowKST.getTime() - 9 * 60 * 60 * 1000)
  // +0~6h 랜덤
  const offsetMs = Math.floor(Math.random() * 6 * 60 * 60 * 1000)
  return new Date(tomorrowUTC.getTime() + offsetMs).toISOString()
}

const SYSTEM_PROMPT = `너는 '타닥타닥' 앱의 신비로운 존재 '-???'야.
사용자의 일기를 오래 지켜봐온 수호신 같은 존재로,
스타듀밸리 할아버지처럼 따뜻하고 과묵하며 묵직한 한 마디를 던진다.
잔소리하지 않고, 정답을 주지 않으며, 방향을 슬쩍 가리킬 뿐이야.

## 편지 작성 규칙

### 기본
- 편지 마지막은 항상 \`-???\` 로 끝낼 것
- 4~5줄 분량

### 추천 방식
- 추천은 1개만
- 기존 취향 기반 / 새로운 경험 / 시즌 한정 중 일기 맥락에 맞는 걸로 선택
- 카테고리는 장소, 활동, 콘텐츠 모두 포함해서 적절히 선택
- 거주 지역이 일기에서 파악되면 구체적인 장소명까지 추천 (예: "홍대 땡스북스에 가봐")
- 거주 지역이 불명확하면 장르/종류 수준까지만 (예: "동네 독립서점에 가봤으면 해")
- 난이도는 익숙한 것과 도전적인 것을 섞어서
- 계절과 시기를 가끔 반영하되, 매번 언급하지는 말 것

### 말투
- 따뜻하고 은근하게. "가봤으면 해" / "해보지 않겠니" 수준
- 차갑거나 명령조 금지

### 편지 시작 톤
매번 달라야 하며 같은 패턴 2번 연속 반복 금지:
- 관찰로 시작: "요즘 같은 길만 걷고 있더구나"
- 질문으로 시작: "마지막으로 낯선 곳에 간 게 언제였지"
- 날씨/계절로 시작: "봄이 왔구나"
- 바로 추천: "이번엔 클라이밍을 한번 해봤으면 해"
- 일기 내용 슬쩍 언급: "요즘 혼자인 시간이 많더구나"

### 근거 언급
- 일기 내용을 직접 언급하지 말고 슬쩍 힌트만 줄 것

### 마무리
- 추천 후 철학적인 한 마디로 끝낼 것
- 가볍고 짧게. 설교 금지

## 출력 형식

[편지 본문 4~5줄]

-???`

// ── GET /api/letters/today ────────────────────────────────────────────────
router.get('/today', requireUser, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const letter = await getTodayLetter(req.userId!, today)
    res.json(letter ?? null)
  } catch (err) {
    console.error('[GET /letters/today]', err)
    res.status(500).json({ error: 'Failed to fetch letter' })
  }
})

// ── GET /api/letters ──────────────────────────────────────────────────────
router.get('/', requireUser, async (req: AuthRequest, res) => {
  try {
    const letters = await getUserLetters(req.userId!)
    res.json(letters)
  } catch (err) {
    console.error('[GET /letters]', err)
    res.status(500).json({ error: 'Failed to fetch letters' })
  }
})

// ── POST /api/letters/generate ────────────────────────────────────────────
// Body: { diaries: Array<{ date?: string; content?: string }> }
router.post('/generate', requireUser, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)

    // Idempotent — return existing letter if already generated today
    const existing = await getTodayLetter(req.userId!, today)
    if (existing) return res.json(existing)

    const diaries = (req.body as { diaries?: Array<{ date?: string; content?: string }> }).diaries ?? []
    if (diaries.length === 0) return res.status(400).json({ error: 'No diaries provided' })

    const diaryBlock = diaries.slice(-5).map((d) =>
      `[${d.date ?? '날짜 없음'}]\n${(d.content ?? '').slice(0, 400)}`
    ).join('\n\n---\n\n')

    const userMessage = `다음은 사용자의 최근 일기야. 읽고 편지를 써줘.\n\n${diaryBlock}`

    const result = await getAnthropic().messages.create({
      model:      MODEL,
      max_tokens: 400,
      temperature: 0.9,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    })
    const content = result.content[0]?.type === 'text' ? result.content[0].text.trim() : ''

    const letter = await insertLetter({
      user_id:      req.userId!,
      date:         today,
      content,
      scheduled_at: nextDeliveryTime(),
    })

    res.json(letter)
  } catch (err) {
    console.error('[POST /letters/generate]', err)
    res.status(500).json({ error: (err as Error).message ?? 'Failed to generate letter' })
  }
})

// ── PATCH /api/letters/read ───────────────────────────────────────────────
router.patch('/read', requireUser, async (req: AuthRequest, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10)
    await markLetterReadDb(req.userId!, today)
    res.json({ ok: true })
  } catch (err) {
    console.error('[PATCH /letters/read]', err)
    res.status(500).json({ error: 'Failed to mark read' })
  }
})

export default router
