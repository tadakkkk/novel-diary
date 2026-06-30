// ── 게스트(둘러보기) 모드 데모 데이터 ──────────────────────────────────────
// App Store 심사관이 로그인 없이 앱 기능을 확인할 수 있도록, 게스트 모드에서
// storage 읽기를 이 데모 데이터로 대체한다. 실제 AI 생성·서버 호출은 없다.
//
// 타입은 src/types/index.ts에 정확히 맞춘다 (타입 에러 없게).

import type {
  Badge, Character, CharacterProfile, DiarySession, Kindling, Letter, NovelDiary,
} from '@/types'

// ── 날짜 헬퍼 (오늘 기준 상대일) ────────────────────────────────────────────
function daysAgo(n: number, hour = 20, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}
function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

const DIARY1_DATE = daysAgo(3, 16, 30)   // 지은이와 카페 — 3일 전
const DIARY2_DATE = daysAgo(1, 19, 10)   // 혼자 러닝 — 1일 전

// ── 데모 일기 1: 등장인물 '지은' 등장 ───────────────────────────────────────
const DIARY1_CONTENT = `오랜만에 지은이를 만났다.

특별한 약속이 있었던 건 아니고, 비가 오니까 그냥 어딘가 앉고 싶었다.
창가 자리에 앉아 라떼를 두 잔 시켜놓고, 별다른 주제도 없이 한참을
떠들었다. 요즘 뭐 보는지, 회사는 어떤지, 그런 시시한 이야기들.

빗소리 때문인지 평소보다 말이 느려졌다. 급할 게 없는 대화였다.
지은이는 여전히 웃을 때 눈이 먼저 휘었고, 나는 그게 익숙하면서도
오랜만이라 조금 반가웠다.

헤어질 때쯤 비가 그쳤다. 우산을 챙겨 나왔는데 쓸 일이 없어서,
괜히 손에 든 채로 걸었다.`

const DIARY1_KINDLINGS = ['오랜만에 지은이랑 카페', '비 와서 그냥 수다', '라떼 두 잔']

// ── 데모 일기 2: 혼자, 등장인물 없음 ────────────────────────────────────────
const DIARY2_CONTENT = `오랜만에 뛰러 나갔다.

거창한 계획은 없었다. 그냥 해 지기 전에 잠깐 몸을 움직이고 싶었다.
3km만 채우자는 생각으로 천천히 시작했는데, 막상 뛰다 보니
멈추기가 애매해서 조금 더 갔다.

강변을 따라 뛰는 동안 노을이 번지고 있었다. 주황색이 점점
짙어지다가, 어느 순간 강물에까지 색이 내려앉았다. 숨은 찼지만
걸음을 멈추진 않았다. 이 풍경을 조금 더 보고 싶었던 것 같다.

집에 돌아와 씻고 나니 몸이 노곤했다. 잘 자겠다는 예감이 들었다.`

const DIARY2_KINDLINGS = ['오랜만에 러닝', '3km만', '노을 예뻤음']

// ── 등장인물: 지은 ──────────────────────────────────────────────────────────
export const DEMO_CHARACTERS: Character[] = [
  {
    name: '지은',
    relationship: '친구',
    role: '비 오는 날 카페에서 오랜만에 만난 친구',
    aliases: [],
    appearances: [ymd(DIARY1_DATE)],
    episodes: [
      { date: ymd(DIARY1_DATE), summary: '비 오는 날 카페에서 라떼를 두 잔 시켜놓고 오랜만에 수다를 떨었다.' },
    ],
    avatarData: { seed: 7, hairColor: 'dark brown', skinTone: 'light', eyeColor: 'brown', clothColor: 'beige' },
    description: '웃을 때 눈이 먼저 휘는 오랜 친구.',
  },
]

// ── 일기 (최신순: getDiaries는 최신 일기를 앞에 둔다) ───────────────────────
export const DEMO_DIARIES: NovelDiary[] = [
  {
    id: 'guest-diary-2',
    sessionId: 'guest-session-2',
    content: DIARY2_CONTENT,
    generationOptions: {
      perspective: '1인칭주인공',
      processingLevel: 4,
      styleReferenceIds: [],
      weather: null,
    },
    continuityContext: '혼자 강변을 달리며 노을을 오래 바라봤다. 잔잔하고 충만한 하루.',
    wordCount: DIARY2_CONTENT.length,
    createdAt: DIARY2_DATE.toISOString(),
    date: ymd(DIARY2_DATE),
    kindlings: DIARY2_KINDLINGS.map((text, i) => ({ id: `guest-d2-k${i}`, text, order: i })),
    kindlingSnapshot: DIARY2_KINDLINGS,
    characters: [],
    characterNames: [],
    keyImage: null,
    title: '노을을 따라 달린 저녁',
  },
  {
    id: 'guest-diary-1',
    sessionId: 'guest-session-1',
    content: DIARY1_CONTENT,
    generationOptions: {
      perspective: '1인칭주인공',
      processingLevel: 3,
      styleReferenceIds: [],
      weather: '비',
    },
    continuityContext: '오랜만에 친구 지은이와 비 오는 날 카페에서 시간을 보냈다. 편안하고 반가운 만남.',
    wordCount: DIARY1_CONTENT.length,
    createdAt: DIARY1_DATE.toISOString(),
    date: ymd(DIARY1_DATE),
    kindlings: DIARY1_KINDLINGS.map((text, i) => ({ id: `guest-d1-k${i}`, text, order: i })),
    kindlingSnapshot: DIARY1_KINDLINGS,
    characters: [{ name: '지은', relationship: '친구' }],
    characterNames: ['지은'],
    keyImage: null,
    title: '비 오는 날, 지은이와',
  },
]

// ── 배지 ────────────────────────────────────────────────────────────────────
export const DEMO_BADGES: Badge[] = [
  {
    id: 'guest-badge-1',
    title: '비 오는 날',
    desc: '비를 핑계로 누군가와 마주 앉은 날',
    tag: '오늘은 라떼 두 잔',
    earnedAt: DIARY1_DATE.toISOString(),
    diaryId: 'guest-diary-1',
  },
  {
    id: 'guest-badge-2',
    title: '운동',
    desc: '3km만 뛰려다 결국 더 달린 날',
    tag: '멈추기 애매해서요',
    earnedAt: DIARY2_DATE.toISOString(),
    diaryId: 'guest-diary-2',
  },
]

// ── 홈(모닥불) 활성 세션 — 게스트는 이 세션의 땔감을 열람한다 ───────────────
export const DEMO_ACTIVE_KINDLINGS: Kindling[] = DIARY2_KINDLINGS.map((text, i) => ({
  id: `guest-active-k${i}`,
  sessionId: 'guest-active',
  text,
  order: i,
  mediaAttachments: [],
  createdAt: DIARY2_DATE.toISOString(),
}))

export const DEMO_SESSIONS: DiarySession[] = [
  {
    id: 'guest-active',
    userId: 'guest',
    date: ymd(new Date()),
    status: 'collecting',
    kindlingCount: DEMO_ACTIVE_KINDLINGS.length,
    flameLevel: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ── 주인공 도감: 캐릭터 프로필 + 성향 스탯 ─────────────────────────────────
export const DEMO_CHARACTER_PROFILE: CharacterProfile = {
  story: '혼자 있는 시간을 어색해하지 않으면서도, 가까운 사람과의 시시한 대화에서 온기를 얻는 사람. ' +
    '계획보다 그날의 마음을 따라 움직이며, 비나 노을 같은 작은 풍경을 오래 들여다본다. ' +
    '말수는 많지 않지만 자기 하루를 정직하게 기록할 줄 안다.',
  stats: [
    { label: '감성', value: 78 },
    { label: '논리', value: 52 },
    { label: '사교', value: 60 },
    { label: '내향', value: 68 },
    { label: '도전', value: 55 },
    { label: '공감', value: 82 },
  ],
  generatedAt: DIARY2_DATE.toISOString(),
}

// ── 다음 챕터: ???의 편지 (1통, 이미 도착·미열람) ───────────────────────────
export const DEMO_LETTERS: Letter[] = [
  {
    id: 'guest-letter-1',
    date: new Date().toISOString().slice(0, 10),
    content: `요즘 혼자 걷거나 달리는 시간이 늘었더구나.\n` +
      `그 고요함이 너에게 잘 어울린다는 것도 안다.\n` +
      `다만 이번 주말엔, 늘 지나치기만 하던 동네 책방에 한번 들러보지 않겠니.\n` +
      `낯선 책장 사이에서 너는 또 다른 너를 만날지도 모른단다.\n\n` +
      `-???`,
    arrivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1시간 전 도착
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
]
