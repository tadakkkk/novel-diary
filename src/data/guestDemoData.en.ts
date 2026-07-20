// ── Guest (browse) mode demo data — English ────────────────────────────────
// English mirror of guestDemoData.ts. Same structure, types, and date helpers.
// Selected over the Korean data when getAppLanguage() === 'en'.
//
// Voice: understated, no emotions named outright, at most one lyrical image per
// scene, quiet endings. No melodrama, no exclamation marks.

import type {
  Badge, Character, CharacterProfile, DiarySession, Kindling, Letter, NovelDiary,
} from '@/types'

// ── Date helpers (relative to today) ───────────────────────────────────────
function daysAgo(n: number, hour = 20, minute = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}
function ymd(d: Date): string { return d.toISOString().slice(0, 10) }

const DIARY1_DATE = daysAgo(3, 16, 30)   // Coffee with Ellie — 3 days ago
const DIARY2_DATE = daysAgo(1, 19, 10)   // Running alone — 1 day ago

// ── Demo diary 1: features the character 'Ellie' ───────────────────────────
// (Written directly; do not edit.)
const DIARY1_CONTENT = `I met Ellie for the first time in a while.

There was no real plan. It was raining, and I just wanted to sit somewhere. We took the window seat, ordered two lattes, and talked for a long time about nothing in particular — what she's been watching, how work is going, the small unimportant things.

Maybe it was the sound of the rain, but we both spoke slower than usual. It was a conversation with nowhere to be. I'd forgotten how rare that is.`

const DIARY1_KINDLINGS = ['Coffee with Ellie after a while', 'Rainy-day chatting', 'Two lattes']

// ── Demo diary 2: alone, no characters ─────────────────────────────────────
const DIARY2_CONTENT = `I went out for a run, first time in a while.

There was no grand plan. I just wanted to move a little before the light went. I started slow, telling myself three kilometers would do, and then stopping felt more awkward than carrying on, so I went a bit further.

Along the river the sunset was spreading. The orange deepened until, at some point, the color settled onto the water too. My breath was short, but I didn't stop walking. I think I wanted to watch it a little longer.

Back home, washed and still, my body felt heavy in a good way. I had a feeling I'd sleep well.`

const DIARY2_KINDLINGS = ['Went for a run', 'Just 3km', 'The sunset was beautiful']

// ── Character: Ellie ───────────────────────────────────────────────────────
export const DEMO_CHARACTERS: Character[] = [
  {
    name: 'Ellie',
    relationship: 'friend',
    role: 'A friend met again after a while, at a café on a rainy day',
    aliases: [],
    appearances: [ymd(DIARY1_DATE)],
    episodes: [
      { date: ymd(DIARY1_DATE), summary: 'Ordered two lattes at a café on a rainy day and caught up after a long while.' },
    ],
    avatarData: { seed: 7, hairColor: 'dark brown', skinTone: 'light', eyeColor: 'brown', clothColor: 'beige' },
    description: 'An old friend whose eyes crease first when she smiles.',
  },
]

// ── Diaries (newest first: getDiaries puts the latest diary in front) ───────
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
    continuityContext: 'Ran alone along the river and watched the sunset for a long time. A calm, full day.',
    wordCount: DIARY2_CONTENT.length,
    createdAt: DIARY2_DATE.toISOString(),
    date: ymd(DIARY2_DATE),
    kindlings: DIARY2_KINDLINGS.map((text, i) => ({ id: `guest-d2-k${i}`, text, order: i })),
    kindlingSnapshot: DIARY2_KINDLINGS,
    characters: [],
    characterNames: [],
    keyImage: null,
    title: 'The Evening I Chased the Sunset',
  },
  {
    id: 'guest-diary-1',
    sessionId: 'guest-session-1',
    content: DIARY1_CONTENT,
    generationOptions: {
      perspective: '1인칭주인공',
      processingLevel: 3,
      styleReferenceIds: [],
      weather: 'Rain',
    },
    continuityContext: 'Spent a rainy afternoon with an old friend, Ellie, at a café. An easy, welcome meeting.',
    wordCount: DIARY1_CONTENT.length,
    createdAt: DIARY1_DATE.toISOString(),
    date: ymd(DIARY1_DATE),
    kindlings: DIARY1_KINDLINGS.map((text, i) => ({ id: `guest-d1-k${i}`, text, order: i })),
    kindlingSnapshot: DIARY1_KINDLINGS,
    characters: [{ name: 'Ellie', relationship: 'friend' }],
    characterNames: ['Ellie'],
    keyImage: null,
    title: 'A Rainy Day, with Ellie',
  },
]

// ── Badges ─────────────────────────────────────────────────────────────────
export const DEMO_BADGES: Badge[] = [
  {
    id: 'guest-badge-1',
    title: 'Rainy Day',
    desc: 'Sat across from someone, blaming the rain.',
    tag: 'two lattes today',
    earnedAt: DIARY1_DATE.toISOString(),
    diaryId: 'guest-diary-1',
  },
  {
    id: 'guest-badge-2',
    title: 'The Extra Mile',
    desc: 'Planned 3km, ran further anyway.',
    tag: 'too awkward to stop',
    earnedAt: DIARY2_DATE.toISOString(),
    diaryId: 'guest-diary-2',
  },
]

// ── Home (bonfire) active session — guest browses this session's kindling ───
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

// ── Character codex: profile + trait stats ─────────────────────────────────
export const DEMO_CHARACTER_PROFILE: CharacterProfile = {
  story: "Someone who isn't unsettled by time alone, yet draws warmth from small, pointless talk with the people close to them. " +
    'Moves by the mood of the day rather than any plan, and lingers over little scenes — rain, a sunset — longer than most. ' +
    'Not one for many words, but keeps an honest record of their own days.',
  stats: [
    { label: 'Feeling', value: 78 },
    { label: 'Reason', value: 52 },
    { label: 'Connection', value: 60 },
    { label: 'Solitude', value: 68 },
    { label: 'Courage', value: 55 },
    { label: 'Care', value: 82 },
  ],
  generatedAt: DIARY2_DATE.toISOString(),
}

// ── Next chapter: a letter from ??? (one, already arrived and unread) ───────
export const DEMO_LETTERS: Letter[] = [
  {
    id: 'guest-letter-1',
    date: new Date().toISOString().slice(0, 10),
    content: `You've been spending more of your hours walking or running alone lately.\n` +
      `I know that quiet suits you well.\n` +
      `Still — this weekend, won't you stop by the little bookshop you always pass without going in.\n` +
      `Between unfamiliar shelves, you might meet another version of yourself.\n\n` +
      `-???`,
    arrivedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // arrived 1 hour ago
    read: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
]
