'use strict'
// ── Claude API 서비스 + 프롬프트 빌더 ─────────────────────────────────────────
const ClaudeService = (() => {
  const API_URL = 'https://api.anthropic.com/v1/messages'
  const MODEL   = 'claude-opus-4-6'

  // ── 기본 API 호출 ─────────────────────────────────────────────────────────
  async function call({ messages, maxTokens = 2048, temperature = 0.9, systemPrompt }) {
    const apiKey = StorageService.getApiKey()
    if (!apiKey) throw new Error('API_KEY_MISSING')

    // ── 디버그 로그: payload 구조 확인 (이미지 data는 길이만 출력) ────────────
    const debugMessages = messages.map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.map(c => c.type === 'image'
            ? { type: 'image', media_type: c.source?.media_type, data_len: c.source?.data?.length ?? 0 }
            : { type: c.type, text_preview: String(c.text || '').slice(0, 80) })
        : (typeof m.content === 'string' ? m.content.slice(0, 80) + '…' : m.content),
    }))
    console.log('[ClaudeService.call] payload 구조:', JSON.stringify(debugMessages, null, 2))
    const imageCount = Array.isArray(messages[0]?.content)
      ? messages[0].content.filter(c => c.type === 'image').length
      : 0
    if (imageCount > 0) {
      console.log(`[ClaudeService.call] ✅ 이미지 ${imageCount}개 포함하여 API 호출`)
    } else {
      console.log('[ClaudeService.call] 텍스트 전용 API 호출')
    }
    // 체크 2: payload에 이미지 블록 실제 확인
    if (Array.isArray(messages[0]?.content)) {
      const imgBlks = messages[0].content.filter(b => b.type === 'image')
      console.log('[ClaudeService.call] 체크2 - content 블록 수:', messages[0].content.length, '/ 이미지 블록 수:', imgBlks.length)
      if (imgBlks.length > 0) console.log('[ClaudeService.call] 체크2 - 이미지 블록:', imgBlks.map(b => ({ media_type: b.source?.media_type, data_len: b.source?.data?.length ?? 0 })))
    }

    const body = {
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages,
    }
    if (systemPrompt) body.system = systemPrompt

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message || `HTTP ${res.status}`)
    }

    const data = await res.json()
    return data.content?.[0]?.text || ''
  }

  // ── 프롬프트 빌더 ─────────────────────────────────────────────────────────
  const PERSPECTIVE_DESC = {
    '1인칭주인공': '"나는..." 으로 서술. 화자가 주인공 본인. 가장 내밀하고 주관적.',
    '1인칭관찰자': '화자가 등장하지만 주인공을 외부에서 관찰. 거리감 있는 쓸쓸한 시선.',
    '3인칭관찰자': '외부에서 행동과 장면만 묘사. 내면 서술 없음. 영화적·건조한 문체.',
    '3인칭전지적': '모든 것을 아는 전지적 화자. 복선·아이러니 연출 가능. 주인공 이름 사용.',
  }

  const LEVEL_DESC = {
    1: '있었던 일을 그대로. 최소한의 문장 다듬기만. 감정 서술 없이 사실만.',
    2: '자연스러운 일상 문체. 감정은 최소화하여 담백하게.',
    3: '자연스러운 일상 문체, 감정은 담되 담백하게. 과장 없이.',
    4: '감성적으로. 절제된 문학적 표현. 사실은 유지.',
    5: '문학적으로 표현하되 사실을 과장하지 말 것. 실제 사건이 중심.',
  }

  function buildDiaryPrompt({ kindlings, perspective, processingLevel, styleRefs,
    weather, nickname, continuityContext, mediaDescriptions, keyImageDescription }) {

    const pvDesc = PERSPECTIVE_DESC[perspective] || PERSPECTIVE_DESC['1인칭주인공']
    const lvDesc = LEVEL_DESC[processingLevel]   || LEVEL_DESC[3]

    // Nickname for 3rd person
    const nicknameNote = (perspective.startsWith('3인칭') && nickname)
      ? `\n주인공의 이름(호칭)은 "${nickname}"이야. 소설 전체에서 이 이름으로 불러줘.`
      : ''

    // Kindlings block
    const kindlingBlock = kindlings.map((k, i) =>
      `[사건 ${i + 1}] ${k.text}`
    ).join('\n')

    // Style references
    let styleBlock = ''
    if (styleRefs && styleRefs.length > 0) {
      styleBlock = '\n\n[참고 문체 - 아래 글들의 문체와 어휘 선택, 문장 리듬을 참고해서 써줘]\n'
      styleRefs.forEach((sr, i) => {
        styleBlock += `\n--- 참고 문체 ${i + 1}: ${sr.title} ---\n${sr.content.slice(0, 1500)}\n`
      })
    }

    // Media descriptions
    let mediaBlock = ''
    if (keyImageDescription) {
      mediaBlock += `\n\n[오늘의 대표 이미지 분위기 - 이 색감·빛·공간감·분위기를 일기 전반에 녹여줘]\n${keyImageDescription}`
    }
    if (mediaDescriptions && mediaDescriptions.length > 0) {
      mediaBlock += '\n\n[장면 이미지 묘사 - 해당 사건 서술 시 아래 장면 묘사를 녹여줘]\n'
      mediaDescriptions.forEach((d, i) => { mediaBlock += `[이미지 ${i + 1}] ${d}\n` })
    }

    // Continuity
    let continuityBlock = ''
    if (continuityContext) {
      continuityBlock = `\n\n[이전 일기와의 연속성 - 이 맥락에서 자연스럽게 이어지게 써줘]\n${continuityContext}`
    }

    const prompt = `일기를 써줘.

[최우선 원칙] 아래 사건들의 실제 내용과 감정을 왜곡하거나 과장하지 않는다. 사실이 최우선.

[생성 조건]
- 서술 시점: ${perspective} — ${pvDesc}${nicknameNote}
- 가공 정도 ${processingLevel}/5: ${lvDesc}${weather ? `\n- 날씨: ${weather}` : ''}${styleBlock}

[오늘의 사건들 — 반드시 모두 포함해서 자연스럽게 연결할 것]
${kindlingBlock}
${mediaBlock}${continuityBlock}

[지시사항]
1. 위 사건들을 반드시 빠짐없이 포함할 것. 누락된 사건이 있으면 실패야.
2. 사건의 실제 내용과 감정을 유지하면서 가공 정도에 맞게 표현할 것.${weather ? `\n3. 오늘 날씨는 "${weather}"야. 날씨가 배경, 감각 묘사, 문장의 분위기에 자연스럽게 배어들게 써줘. 날씨를 직접 설명하지 말고 글 안에 녹여낼 것.` : ''}
${weather ? '4' : '3'}. 이전과 다른 표현, 다른 문장 구조, 다른 도입부를 사용해줘.
${weather ? '5' : '4'}. 일기 본문만 작성해줘. 제목, 날짜, "일기:", "시점:" 같은 메타 텍스트 없이.`

    return prompt
  }

  // ── 미디어 묘사 ──────────────────────────────────────────────────────────
  async function describeMedia(base64DataUrl, type = 'scene') {
    const imageData = base64DataUrl.replace(/^data:[^;]+;base64,/, '')
    const mimeType  = base64DataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg'

    const promptText = type === 'keyImage'
      ? '이 이미지의 색감, 빛, 공간감, 계절감, 전반적인 분위기를 감각적으로 묘사해줘. 소설적 배경 묘사에 활용할 수 있게. 3-4문장.'
      : '이 이미지의 장면을 소설적으로 묘사해줘. 시각적 디테일, 분위기, 감각적 요소를 포함해서. 2-3문장.'

    return call({
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageData } },
          { type: 'text',  text: promptText },
        ],
      }],
    })
  }

  // ── 일기 생성 (핵심) ─────────────────────────────────────────────────────
  async function generateDiary(options) {
    const prompt = buildDiaryPrompt(options)

    const attachments = options.attachments || []
    const keyImageObj = options.keyImageObj  // { mediaType, base64Data, dataUrl }
    const hasKeyImage = !!(keyImageObj?.base64Data && keyImageObj.base64Data.length >= 100)
    const hasAttachments = attachments.length > 0

    console.log('[ClaudeService.generateDiary]', {
      hasKeyImage,
      keyImageMediaType: keyImageObj?.mediaType,
      keyImageBase64Len: keyImageObj?.base64Data?.length,
      kindlings:   options.kindlings?.length,
      level:       options.processingLevel,
      perspective: options.perspective,
    })

    // buildContent: 이미지 블록 + 텍스트 블록을 명시적으로 조립
    function buildContent(promptText) {
      const parts = []

      // KeyImage 블록
      if (hasKeyImage) {
        console.log('[ClaudeService] 블록 추가: KeyImage ▸ mediaType:', keyImageObj.mediaType, '/ base64 길이:', keyImageObj.base64Data.length)
        parts.push({ type: 'image', source: { type: 'base64', media_type: keyImageObj.mediaType, data: keyImageObj.base64Data } })
      }

      // Attachment 블록들
      for (const att of attachments) {
        // 구형(string) / 신형(object) 모두 처리
        const attUrl  = typeof att === 'string' ? att : att.dataUrl
        const attB64  = typeof att === 'string' ? att.split(',')[1] : att.base64Data
        const attMime = typeof att === 'string' ? (att.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg') : (att.mediaType || 'image/jpeg')
        if (attB64 && attB64.length >= 100) {
          console.log('[ClaudeService] 블록 추가: Attachment ▸ mediaType:', attMime, '/ base64 길이:', attB64.length)
          parts.push({ type: 'image', source: { type: 'base64', media_type: attMime, data: attB64 } })
        }
      }

      // 이미지 지시문 + 프롬프트 텍스트 블록
      let imageInstruction = ''
      if (hasKeyImage) {
        imageInstruction += '위 첫 번째 이미지는 오늘 하루의 대표 이미지야.\n'
        imageInstruction += '이 이미지의 색감, 빛, 공간감, 전체적인 분위기를 일기 전반에 감각적으로 녹여줘.\n\n'
      }
      if (hasAttachments) {
        const startIdx = hasKeyImage ? '두 번째' : '위'
        imageInstruction += `${startIdx} 이미지들은 오늘의 특정 장면이야.\n`
        imageInstruction += '각 이미지를 보고 그 장면을 소설적으로 묘사해서 해당 사건과 연결해줘.\n\n'
      }
      parts.push({ type: 'text', text: imageInstruction + promptText })

      console.log('[ClaudeService] buildContent 완료 ▸ 총 블록:', parts.length, '/ 이미지 블록:', parts.filter(p => p.type === 'image').length)
      return parts
    }

    let messageContent
    if (hasKeyImage || hasAttachments) {
      messageContent = buildContent(prompt)
    } else {
      console.log('[ClaudeService] 텍스트 전용 모드 (이미지 없음)')
      messageContent = prompt
    }

    const content = await call({
      temperature: 0.85,
      systemPrompt: '당신은 개인 일기를 써주는 작가입니다. 실제 일어난 사건과 감정을 왜곡 없이 전달하는 것이 최우선입니다. 지시사항을 정확히 따르고, 요청된 모든 사건을 포함하며, 매번 다른 표현과 구성으로 씁니다.',
      messages: [{ role: 'user', content: messageContent }],
    })

    console.log('[ClaudeService] 일기 생성 완료 ▸ 글자 수:', content.length)
    if (hasKeyImage) {
      console.log('[ClaudeService] 이미지 반영 확인 ▸ 앞부분:', content.slice(0, 120))
    }

    // continuityContext 생성 (다음 일기 연속성용)
    const ctxPrompt = `아래 일기를 읽고, 다음 일기 작성 시 연속성을 위한 맥락 요약을 2-3문장으로 써줘. (등장인물, 감정 상태, 미완의 이야기 등)\n\n${content}`
    const continuityContext = await call({
      temperature: 0.3,
      messages: [{ role: 'user', content: ctxPrompt }],
    }).catch(() => '')

    return { content, continuityContext }
  }

  // ── 등장인물 추출 ─────────────────────────────────────────────────────────
  async function extractCharacters(diaryContent, sessionDate) {
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
    "skinTone": "피부톤: light / medium / tan / dark (모르면 medium)",
    "eyeColor": "눈색 (예: brown, unknown)",
    "clothColor": "옷 색상 (예: navy, unknown)",
    "gender": "male / female / unknown"
  }
]
인물이 없으면 []`

    try {
      const raw = await call({ temperature: 0.2, maxTokens: 1024, messages: [{ role: 'user', content: prompt }] })
      const json = raw.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '')
      const chars = JSON.parse(json)
      return chars.map(c => ({
        ...c,
        appearances: [sessionDate],
        episodes: [{ date: sessionDate, summary: c.role }],
        avatarData: {
          hairColor: c.hairColor,
          skinTone: c.skinTone,
          eyeColor: c.eyeColor,
          clothColor: c.clothColor,
        },
      }))
    } catch { return [] }
  }

  // ── 아바타 색상 재생성 ────────────────────────────────────────────────────
  async function describeAvatarColors(character) {
    const prompt = `"${character.name}" (${character.relationship || '인물'})의 픽셀 아트 아바타를 위한 색상 정보를 JSON으로 줘.
외모 특징: ${character.role || '일반적인 인물'}

JSON만 응답해줘:
{"hairColor": "예: dark brown", "skinTone": "light/medium/tan/dark", "eyeColor": "예: brown", "clothColor": "예: navy"}`

    try {
      const raw = await call({ temperature: 0.5, maxTokens: 200, messages: [{ role: 'user', content: prompt }] })
      return JSON.parse(raw.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, ''))
    } catch { return null }
  }

  // ── 독자 반응 생성 (불멍 독자석) ────────────────────────────────────────
  async function generateReviews(diaries, prevReviews = null) {
    console.log('독자 반응 API 호출 시작')
    console.log('전달할 일기 수:', diaries.length)

    const summary = diaries.slice(-8).map((d, i) =>
      `[${i + 1}] ${d.date}\n${(d.content || '').slice(0, 300)}`
    ).join('\n\n---\n\n')

    // 이전 결과가 있으면 프롬프트에 포함
    let prevBlock = ''
    if (prevReviews) {
      const prevComments = (prevReviews.comments || []).map(c => `"${c.text}"`).join(', ')
      const prevCritic   = prevReviews.criticReview || ''
      prevBlock = `
[이전에 생성한 결과 — 반드시 아래와 완전히 다르게 새로 작성할 것]
이전 댓글: ${prevComments}
이전 한 줄 평: "${prevCritic}"
→ 위 내용과 겹치는 표현, 단어, 뉘앙스 사용 금지. 완전히 새로운 댓글로 생성해줘.
`
    }

    const prompt = `아래 일기들을 읽은 독자 댓글을 생성해줘.

[일기 모음]
${summary}
${prevBlock}
규칙:
- 댓글 3~4개
- 각 댓글은 반드시 15자 이내 (절대 넘기지 마)
- 감성적이거나 문학적인 표현 절대 금지
- SNS 댓글처럼 짧고 직관적으로
- 요즘 트렌드 말투 사용 (갓생, MBTI, 드립 등)

댓글 예시 톤 (이 길이와 느낌으로):
"주인공 갓생력 십점"
"남주 왜저러는 거야"
"등장인물 너무 많음"
"주인공 NF인듯ㅋㅋ"
"그래서 둘이 사귀냐고"
"공감 백퍼 소름"

별점은 일기 내용 기반으로 1~5점 산정.
이동진 스타일 한 줄 평은 20자 이내, 시적이고 짧게.
예: "삶이라는 롱테이크를 견뎌내는 당신에게."
예: "오늘도 아무 일 없었다는 듯, 모든 것이 있었다."

JSON으로만 반환 (다른 텍스트 없이):
{
  "comments": [
    { "text": "15자 이내 댓글" },
    { "text": "15자 이내 댓글" },
    { "text": "15자 이내 댓글" }
  ],
  "rating": 4,
  "criticReview": "20자 이내 한 줄 평"
}`

    let rawResponse = null
    try {
      rawResponse = await Promise.race([
        call({ temperature: 0.95, maxTokens: 500, messages: [{ role: 'user', content: prompt }] }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
      ])
      console.log('API 응답:', rawResponse)
      const clean = rawResponse.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      return parsed
    } catch (e) {
      if (rawResponse) console.error('파싱 실패 - raw:', rawResponse)
      console.error('generateReviews 오류:', e)
      return null
    }
  }

  // ── 공개 API ─────────────────────────────────────────────────────────────
  return { generateDiary, describeMedia, extractCharacters, describeAvatarColors, buildDiaryPrompt, generateReviews }
})()
