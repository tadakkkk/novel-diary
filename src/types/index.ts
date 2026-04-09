// ── 전역 타입 (docs/01-plan/schema.md 기반) ────────────────────────────────

export interface User {
  id: string
  name: string
  createdAt: string
}

export interface StyleReference {
  id: string
  userId: string
  title: string
  content: string      // 최대 10,000자
  excerpt: string      // 앞 200자 미리보기
  createdAt: string
}

export type FlameLevel = 0 | 1 | 2 | 3 | 4 | 5

export type SessionStatus = 'collecting' | 'ready' | 'generated'

export interface DiarySession {
  id: string
  userId: string
  date: string
  status: SessionStatus
  kindlingCount: number
  flameLevel: FlameLevel
  keyImage?: KeyImage
  generatedDiary?: NovelDiary
  createdAt: string
  updatedAt: string
}

export interface Kindling {
  id: string
  sessionId: string
  text: string
  order: number
  mediaAttachments: MediaAttachment[]
  createdAt: string
}

export interface MediaAttachment {
  id: string
  sessionId: string
  kindlingId: string
  type: 'image' | 'video'
  dataUrl: string
  fileName: string
  fileSizeBytes: number
  aiDescription?: string
  createdAt: string
}

export interface KeyImage {
  id: string
  sessionId: string
  dataUrl: string
  base64Data?: string   // Claude API 용
  mediaType?: string    // Claude API 용
  fileName: string
  fileSizeBytes: number
  aiAtmosphereDescription?: string
  createdAt: string
}

export type ProcessingLevel = 1 | 2 | 3 | 4 | 5

export type Perspective =
  | '1인칭주인공'
  | '1인칭관찰자'
  | '3인칭관찰자'
  | '3인칭전지적'

export interface GenerationOptions {
  perspective: Perspective
  processingLevel: ProcessingLevel
  styleReferenceIds: string[]
  duration?: Duration
  nickname?: string
  weather?: string | null
  styleRefIds?: string[]  // 호환용 (diary.html)
}

export type Duration = '하루' | '2~3일' | '일주일' | '한 달' | '그 이상' | string

// ── Character ──────────────────────────────────────────────────────────────
export interface AvatarData {
  seed?: number
  hairColor?: string
  skinTone?: string
  eyeColor?: string
  clothColor?: string
}

export interface Character {
  name: string
  relationship: string
  role?: string
  appearances: string[]
  episodes: Array<{ date: string; summary: string }>
  avatarData: AvatarData
  description?: string
}

// ── NovelDiary ─────────────────────────────────────────────────────────────
export interface NovelDiary {
  id: string
  sessionId?: string
  content: string
  generationOptions: GenerationOptions
  continuityContext: string
  previousDiaryId?: string
  wordCount?: number
  createdAt: string
  updatedAt?: string

  // 저장 시 스냅샷
  date?: string
  kindlings?: Array<{ id: string; text: string; order?: number }>
  kindlingSnapshot?: string[]
  characters?: Array<{ name: string; relationship: string }>
  characterNames?: string[]
  keyImage?: string | { dataUrl: string } | null
  title?: string
}

// ── UserPrefs ──────────────────────────────────────────────────────────────
export interface UserPrefs {
  nickname?: string
  apiKey?: string
}

// ── Drawer ─────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sourceDate?: string   // 근거 일기 날짜
  createdAt: string
}

export interface Badge {
  id: string
  title: string
  desc: string
  tag: string
  earnedAt: string
  diaryId: string
}

export interface CharacterProfile {
  story: string
  stats: Array<{ label: string; value: number }>
  generatedAt: string
}
