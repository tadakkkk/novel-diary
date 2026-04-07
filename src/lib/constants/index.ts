// ── 앱 전역 상수 ──────────────────────────────────────────────────────────

export const DEFAULT_GENERATION_THRESHOLD = 3

export const FLAME_THRESHOLDS = [0, 1, 2, 3, 5, 7] as const
// index = FlameLevel (0~5), value = 최소 땔감 수

export const MAX_STYLE_REFERENCES = 10
export const MAX_STYLE_REFERENCE_LENGTH = 10_000
export const MAX_MEDIA_ATTACHMENTS_PER_SESSION = 3
export const MAX_KINDLING_LENGTH = 500

// ── localStorage 키 접두사 ─────────────────────────────────────────────
export const STORAGE_PREFIX = 'novel-diary'

export const STORAGE_KEYS = {
  user:            `${STORAGE_PREFIX}:user`,
  styleReferences: `${STORAGE_PREFIX}:style-references`,
  sessions:        `${STORAGE_PREFIX}:sessions`,
  kindlings:       (sessionId: string) => `${STORAGE_PREFIX}:kindlings:${sessionId}`,
  attachments:     (sessionId: string) => `${STORAGE_PREFIX}:attachments:${sessionId}`,
  keyImage:        (sessionId: string) => `${STORAGE_PREFIX}:key-image:${sessionId}`,
  diaries:         `${STORAGE_PREFIX}:diaries`,
  userPrefs:       `${STORAGE_PREFIX}:user-prefs`,
} as const
