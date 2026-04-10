// ── Claude API 서비스 ─────────────────────────────────────────────────────
// Server mode (VITE_API_URL set): routes through backend → no API key on client
// Dev fallback (no VITE_API_URL): direct Anthropic call with user's own key
import { type Kindling, type Perspective, type ProcessingLevel, type StyleReference } from '@/types'
import { getApiKey } from '@/services/storage'
import { serverChat, QuotaExceededError } from '@/services/api/api-client'

export { QuotaExceededError }

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-opus-4-6'
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
}

async function callApi(opts: CallOptions): Promise<string> {
  if (USE_SERVER) {
    const { text } = await serverChat({
      messages: opts.messages as Parameters<typeof serverChat>[0]['messages'],
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      signal: opts.signal,
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

// ── 프롬프트 빌더 ─────────────────────────────────────────────────────────

const PERSPECTIVE_DESC: Record<string, string> = {
  '1인칭주인공': '"나는..." 으로 서술. 화자가 주인공 본인. 가장 내밀하고 주관적.',
  '1인칭관찰자': '화자가 등장하지만 주인공을 외부에서 관찰. 거리감 있는 쓸쓸한 시선.',
  '3인칭관찰자': '외부에서 행동과 장면만 묘사. 내면 서술 없음. 영화적·건조한 문체.',
  '3인칭전지적': '모든 것을 아는 전지적 화자. 복선·아이러니 연출 가능. 주인공 이름 사용.',
}

const LEVEL_DESC: Record<number, string> = {
  1: '있었던 일을 그대로. 최소한의 문장 다듬기만. 감정 서술 없이 사실만.',
  2: '자연스러운 일상 문체. 감정은 최소화하여 담백하게.',
  3: '자연스러운 일상 문체, 감정은 담되 담백하게. 과장 없이.',
  4: '감성적으로. 절제된 문학적 표현. 사실은 유지.',
  5: '문학적으로 표현하되 사실을 과장하지 말 것. 실제 사건이 중심.',
}

interface BuildPromptOptions {
  kindlings: Kindling[]
  perspective: Perspective
  processingLevel: ProcessingLevel
  styleRefs?: StyleReference[]
  weather?: string | null
  nickname?: string | null
  continuityContext?: string | null
  keyImageDescription?: string | null
  mediaDescriptions?: string[]
}

function buildDiaryPrompt(opts: BuildPromptOptions): string {
  const { kindlings, perspective, processingLevel, styleRefs, weather,
          nickname, continuityContext, keyImageDescription, mediaDescriptions } = opts

  const pvDesc = PERSPECTIVE_DESC[perspective] ?? PERSPECTIVE_DESC['1인칭주인공']
  const lvDesc = LEVEL_DESC[processingLevel]   ?? LEVEL_DESC[3]

  const nicknameNote = (perspective.startsWith('3인칭') && nickname)
    ? `\n주인공의 이름(호칭)은 "${nickname}"이야. 소설 전체에서 이 이름으로 불러줘.`
    : ''

  const kindlingBlock = kindlings.map((k, i) => `[사건 ${i + 1}] ${k.text}`).join('\n')

  let styleBlock = ''
  if (styleRefs && styleRefs.length > 0) {
    styleBlock = '\n\n[참고 문체 - 아래 글들의 문체와 어휘 선택, 문장 리듬을 참고해서 써줘]\n'
    styleRefs.forEach((sr, i) => {
      styleBlock += `\n--- 참고 문체 ${i + 1}: ${sr.title} ---\n${sr.content.slice(0, 1500)}\n`
    })
  }

  let mediaBlock = ''
  if (keyImageDescription) {
    mediaBlock += `\n\n[오늘의 대표 이미지 분위기 - 이 색감·빛·공간감·분위기를 일기 전반에 녹여줘]\n${keyImageDescription}`
  }
  if (mediaDescriptions && mediaDescriptions.length > 0) {
    mediaBlock += '\n\n[장면 이미지 묘사 - 해당 사건 서술 시 아래 장면 묘사를 녹여줘]\n'
    mediaDescriptions.forEach((d, i) => { mediaBlock += `[이미지 ${i + 1}] ${d}\n` })
  }

  const continuityBlock = continuityContext
    ? `\n\n[이전 일기와의 연속성 - 이 맥락에서 자연스럽게 이어지게 써줘]\n${continuityContext}`
    : ''

  const wn = weather ? `\n- 날씨: ${weather}` : ''
  const wi = weather ? `\n3. 오늘 날씨는 "${weather}"야. 날씨가 배경, 감각 묘사, 문장의 분위기에 자연스럽게 배어들게 써줘. 날씨를 직접 설명하지 말고 글 안에 녹여낼 것.` : ''
  const n3 = weather ? '4' : '3'
  const n4 = weather ? '5' : '4'

  return `일기를 써줘.

[최우선 원칙] 아래 사건들의 실제 내용과 감정을 왜곡하거나 과장하지 않는다. 사실이 최우선.

[생성 조건]
- 서술 시점: ${perspective} — ${pvDesc}${nicknameNote}
- 가공 정도 ${processingLevel}/5: ${lvDesc}${wn}${styleBlock}

[오늘의 사건들 — 반드시 모두 포함해서 자연스럽게 연결할 것]
${kindlingBlock}
${mediaBlock}${continuityBlock}

[지시사항]
1. 위 사건들을 반드시 빠짐없이 포함할 것. 누락된 사건이 있으면 실패야.
2. 사건의 실제 내용과 감정을 유지하면서 가공 정도에 맞게 표현할 것.${wi}
${n3}. 이전과 다른 표현, 다른 문장 구조, 다른 도입부를 사용해줘.
${n4}. 일기 본문만 작성해줘. 제목, 날짜, "일기:", "시점:" 같은 메타 텍스트 없이.`
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
  const prompt      = buildDiaryPrompt(opts)
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
    let imageInstruction = ''
    if (hasKeyImage) imageInstruction += '위 첫 번째 이미지는 오늘 하루의 대표 이미지야.\n이 이미지의 색감, 빛, 공간감, 전체적인 분위기를 일기 전반에 감각적으로 녹여줘.\n\n'
    if (hasAttachments) {
      const startIdx = hasKeyImage ? '두 번째' : '위'
      imageInstruction += `${startIdx} 이미지들은 오늘의 특정 장면이야.\n각 이미지를 보고 그 장면을 소설적으로 묘사해서 해당 사건과 연결해줘.\n\n`
    }
    parts.push({ type: 'text', text: imageInstruction + prompt })
    return parts
  }

  const messageContent = (hasKeyImage || hasAttachments) ? buildContent() : prompt

  const content = await callApi({
    temperature: 0.85,
    systemPrompt: '당신은 개인 일기를 써주는 작가입니다. 실제 일어난 사건과 감정을 왜곡 없이 전달하는 것이 최우선입니다. 지시사항을 정확히 따르고, 요청된 모든 사건을 포함하며, 매번 다른 표현과 구성으로 씁니다.',
    messages: [{ role: 'user', content: messageContent }],
    signal: opts.signal,
  })

  const ctxPrompt = `아래 일기를 읽고, 다음 일기 작성 시 연속성을 위한 맥락 요약을 2-3문장으로 써줘. (등장인물, 감정 상태, 미완의 이야기 등)\n\n${content}`
  const continuityContext = await callApi({
    temperature: 0.3,
    messages: [{ role: 'user', content: ctxPrompt }],
    signal: opts.signal,
  }).catch(() => '')

  return { content, continuityContext }
}

export interface ExtractedCharacter {
  name: string
  relationship: string
  role: string
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
  sessionDate: string
): Promise<ExtractedCharacter[]> {
  const prompt = `아래 일기에서 등장하는 인물들을 추출해줘.
주인공(화자) 본인은 제외하고, 언급된 다른 사람만 추출해.

[일기]
${diaryContent}

JSON 배열로만 응답해줘 (코드 블록 없이, 다른 텍스트 없이):
[
  {
    "name": "이름 또는 호칭 (예: 민준, 카페 직원)",
    "relationship": "주인공과의 관계 (예: 친구, 낯선 사람)",
    "role": "이 일기에서의 역할/에피소드 한 줄 요약",
    "hairColor": "머리카락 색 (예: dark brown, unknown)",
    "skinTone": "light / medium / tan / dark (모르면 medium)",
    "eyeColor": "눈색 (예: brown, unknown)",
    "clothColor": "옷 색상 (예: navy, unknown)",
    "gender": "male / female / unknown"
  }
]
인물이 없으면 []`

  try {
    const raw  = await callApi({ temperature: 0.2, maxTokens: 1024, messages: [{ role: 'user', content: prompt }] })
    const json = raw.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
    const chars = JSON.parse(json) as ExtractedCharacter[]
    return chars.map((c) => ({
      ...c,
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

  let prevBlock = ''
  if (prevReviews) {
    const prevComments = (prevReviews.comments ?? []).map((c) => `"${c.text}"`).join(', ')
    prevBlock = `\n[이전에 생성한 결과 — 반드시 아래와 완전히 다르게 새로 작성할 것]\n이전 댓글: ${prevComments}\n이전 한 줄 평: "${prevReviews.criticReview ?? ''}"\n→ 위 내용과 겹치는 표현, 단어, 뉘앙스 사용 금지.\n`
  }

  const prompt = `아래 일기들을 읽은 독자 댓글을 생성해줘.\n\n[일기 모음]\n${summary}\n${prevBlock}\n규칙:\n- 댓글 3~4개\n- 각 댓글은 반드시 15자 이내 (절대 넘기지 마)\n- 감성적이거나 문학적인 표현 절대 금지\n- SNS 댓글처럼 짧고 직관적으로\n- 요즘 트렌드 말투 사용 (갓생, MBTI, 드립 등)\n\n별점은 일기 내용 기반으로 1~5점 산정.\n이동진 스타일 한 줄 평은 20자 이내, 시적이고 짧게.\n\nJSON으로만 반환:\n{\n  "comments": [{"text":"15자 이내"}],\n  "rating": 4,\n  "criticReview": "20자 이내"\n}`

  try {
    const raw    = await Promise.race([
      callApi({ temperature: 0.95, maxTokens: 500, messages: [{ role: 'user', content: prompt }] }),
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
  diaries: Array<{ date?: string; content?: string }>,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{ answer: string; sourceDate?: string }> {
  const diaryBlock = diaries.slice(-15).map((d) =>
    `[${d.date ?? '날짜 없음'}]\n${(d.content ?? '').slice(0, 500)}`
  ).join('\n\n---\n\n')

  const systemPrompt = `너는 사용자의 과거 일기를 모두 읽은 '과거의 주인공'이야.
사용자가 현재의 고민을 말하면, 과거 일기 속 경험과 감정을 근거로 답변해줘.
말투는 담담하고 솔직하게. 설교하지 말고, 과거의 내가 현재의 나에게 말하듯이.
답변은 150자 이내로 짧게.
답변 마지막에 근거로 사용한 일기의 날짜를 { date: 'YYYY.MM.DD' } 형식으로 JSON 덧붙여줘. 날짜를 특정하기 어려우면 JSON 없이 끝내도 돼.
참고할 일기가 없거나 부족하더라도 질문을 무시하지 마.
일기가 없을 땐 '아직 많은 걸 겪진 않았지만,' 같은 식으로 자연스럽게 운을 떼고, 질문에 공감하며 담담하게 답해줘. 단답으로 끊지 말 것.

[과거 일기 목록]
${diaryBlock || '(아직 일기가 없음)'}`

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.slice(-10),
    { role: 'user', content: question },
  ]

  const raw = await callApi({ systemPrompt, messages, maxTokens: 400, temperature: 0.85 })

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
  if (diaries.length < 2) return '아직 이야기가 쌓이는 중입니다.'

  const block = diaries.slice(-20).map((d) =>
    `[${d.date ?? ''}]\n${(d.content ?? '').slice(0, 400)}`
  ).join('\n---\n')

  const prompt = `다음 일기들을 읽고 이 사람을 하나의 캐릭터로 묘사해줘.
직업이나 환경은 일기 내용에서 자연스럽게 유추해서 붙여줘. 억지로 게임 직업명을 쓰지 말 것.
문체는 아래 예시처럼 3~5문장, 3인칭, 건조하고 문학적으로.
성격·습관·대인관계·고민의 결을 녹여낼 것.
예시: '세련된 화술과 겸손한 성격을 가진, 수려한 외모의 떠돌이 방랑기사.
재치 있고 상황을 잘 판단하여 원정대의 판단을 돕는다.
방랑기사라는 것 외에는 모든 것이 베일에 싸여 있다.'
일기가 부족하면 '아직 이야기가 쌓이는 중입니다.' 만 출력.
반드시 완성된 문장으로 끝내줘. 문장이 잘리면 안 돼.

[일기]
${block}`

  return callApi({ messages: [{ role: 'user', content: prompt }], maxTokens: 600, temperature: 0.85 })
}

// ── 주인공 도감: 성향 스탯 ───────────────────────────────────────────────
export async function generateCharacterStats(
  diaries: Array<{ date?: string; content?: string }>
): Promise<Array<{ label: string; value: number }>> {
  if (diaries.length === 0) return []

  const block = diaries.slice(-15).map((d) =>
    `[${d.date ?? ''}]\n${(d.content ?? '').slice(0, 300)}`
  ).join('\n---\n')

  const prompt = `다음 일기들을 읽고 이 사람의 성향을 수치화해줘.
아래 6가지 항목 각각을 0~100 사이 정수로 평가해.
반드시 아래 JSON 형식 그대로 반환 (코드 블록, 설명 없이):
{"감성":75,"논리":60,"사교":55,"내향":70,"도전":50,"공감":80}

[일기]
${block}`

  try {
    const raw = await callApi({ messages: [{ role: 'user', content: prompt }], maxTokens: 100, temperature: 0.3 })
    const obj = JSON.parse(raw.replace(/```json|```/g, '').trim()) as Record<string, number>
    return Object.entries(obj).map(([label, value]) => ({ label, value: Math.min(100, Math.max(0, value)) }))
  } catch {
    return [
      { label: '감성', value: 60 }, { label: '논리', value: 50 },
      { label: '사교', value: 55 }, { label: '내향', value: 65 },
      { label: '도전', value: 45 }, { label: '공감', value: 70 },
    ]
  }
}

// ── 업적 배지 감지 ────────────────────────────────────────────────────────
export async function detectBadge(
  diary: { date?: string; content?: string }
): Promise<{ title: string; desc: string; tag: string } | null> {
  const prompt = `다음 일기에서 사용자의 삶에 의미 있는 전환점, 도전, 실패, 성취, 인간관계 사건이 있었는지 판단해줘.
있다면 아래 형식으로 배지를 1개 생성해. 없다면 null만 반환해.
- 제목: 4~8자, 사건을 함축하는 명사형
- 설명: 한 줄, 건조하거나 유머러스한 문체
- 태그: 짧고 위트 있는 한 마디
배지는 자주 주면 안 됨. 웬만한 일기엔 null 반환.
JSON 형식으로만 반환: { "title": "팀플 조장", "desc": "오늘부터 내가 버스 운전합니다", "tag": "버스 출발합니다" }
또는 null

[일기 - ${diary.date ?? ''}]
${(diary.content ?? '').slice(0, 600)}`

  try {
    const raw = await callApi({ messages: [{ role: 'user', content: prompt }], maxTokens: 150, temperature: 0.7 })
    const cleaned = raw.replace(/```json|```/g, '').trim()
    if (cleaned === 'null' || !cleaned.startsWith('{')) return null
    return JSON.parse(cleaned) as { title: string; desc: string; tag: string }
  } catch {
    return null
  }
}

// ── 땔감 반문 질문 생성 ───────────────────────────────────────────────────
export async function generateKindlingQuestion(text: string): Promise<string> {
  const prompt = `사용자가 일기에 다음 내용을 적었어: "${text}"
이 내용에서 더 구체적인 이야기를 끌어낼 수 있는 질문 1개만 만들어줘.
질문은 20자 이내, 따뜻하고 자연스럽게.
질문만 출력 (다른 텍스트 없이).`

  try {
    const raw = await callApi({ messages: [{ role: 'user', content: prompt }], maxTokens: 60, temperature: 0.9 })
    return raw.trim().replace(/^["']|["']$/g, '')
  } catch {
    return ''
  }
}
