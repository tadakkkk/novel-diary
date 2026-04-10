// ── Storage Service (localStorage 전용 접근 레이어) ─────────────────────
import {
  type Badge, type Character, type CharacterProfile, type ChatMessage,
  type DiarySession, type KeyImage, type Kindling,
  type MediaAttachment, type NovelDiary, type StyleReference, type UserPrefs,
} from '@/types'

// ── 키 상수 ──────────────────────────────────────────────────────────────
const P = 'novel-diary:'
const K = {
  API_KEY:      'novel-diary:api-key',
  PREFS:        `${P}user-prefs`,
  STYLE_REFS:   `${P}style-references`,
  SESSIONS:     `${P}sessions`,
  DIARIES:      `${P}diaries`,
  CHARACTERS:   `${P}characters`,
  BLOCKED:      `${P}blocked-chars`,
  CHAT:         `${P}drawer-chat`,
  BADGES:       `${P}drawer-badges`,
  CHAR_PROFILE: `${P}drawer-char-profile`,
  kindlings:    (id: string) => `${P}kindlings:${id}`,
  keyImage:     (id: string) => `${P}key-image:${id}`,
  attachments:  (id: string) => `${P}attachments:${id}`,
}

// ── 기본 헬퍼 ─────────────────────────────────────────────────────────────
function read<T>(key: string): T | null {
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : null }
  catch { return null }
}

function write<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch (e) {
    if ((e as DOMException).name === 'QuotaExceededError') {
      console.error('[StorageService] QuotaExceededError:', key)
      window.dispatchEvent(new CustomEvent('storage-quota-exceeded'))
    }
    throw e
  }
}

// ── Device ID (anonymous user identifier) ────────────────────────────────
const DEVICE_ID_KEY = 'novel-diary:device-id'
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    // Generate a stable random ID using crypto
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0')).join('')
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

// ── API Key (kept for legacy/dev fallback) ────────────────────────────────
export function getApiKey(): string | null {
  return localStorage.getItem(K.API_KEY) || null
}
export function saveApiKey(key: string): void {
  localStorage.setItem(K.API_KEY, key)
}

// ── User Prefs ─────────────────────────────────────────────────────────────
export function getPrefs(): UserPrefs { return read<UserPrefs>(K.PREFS) ?? {} }
export function savePrefs(prefs: Partial<UserPrefs>): void {
  write(K.PREFS, { ...getPrefs(), ...prefs })
}

// ── Sessions ──────────────────────────────────────────────────────────────
export function getSessions(): DiarySession[] { return read<DiarySession[]>(K.SESSIONS) ?? [] }
export function getSession(id: string): DiarySession | null { return getSessions().find((s) => s.id === id) ?? null }
export function saveSession(session: DiarySession): void {
  const list = getSessions()
  const idx  = list.findIndex((s) => s.id === session.id)
  if (idx >= 0) list[idx] = session; else list.push(session)
  write(K.SESSIONS, list)
}
export function getTodaySession(): DiarySession | null {
  const today = new Date().toISOString().slice(0, 10)
  return getSessions().find((s) => s.date === today) ?? null
}

// ── Kindlings ─────────────────────────────────────────────────────────────
export function getKindlings(sessionId: string): Kindling[] {
  return read<Kindling[]>(K.kindlings(sessionId)) ?? []
}
export function saveKindlings(sessionId: string, kindlings: Kindling[]): void {
  write(K.kindlings(sessionId), kindlings)
}

// ── Key Image ─────────────────────────────────────────────────────────────
export function getKeyImage(sessionId: string): KeyImage | null {
  const raw = localStorage.getItem(K.keyImage(sessionId))
         ?? sessionStorage.getItem(K.keyImage(sessionId))
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'string') {
      return { id: sessionId, sessionId, dataUrl: parsed, fileName: 'image', fileSizeBytes: 0, createdAt: new Date().toISOString() }
    }
    return parsed as KeyImage
  } catch { return null }
}
export function saveKeyImage(sessionId: string, ki: KeyImage): void {
  // 구형 키 정리
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i)
    if (k?.startsWith(`${P}key-image:`) && k !== K.keyImage(sessionId)) localStorage.removeItem(k)
  }
  try { write(K.keyImage(sessionId), ki) }
  catch (e) {
    if ((e as DOMException).name === 'QuotaExceededError') sessionStorage.setItem(K.keyImage(sessionId), JSON.stringify(ki))
    else throw e
  }
}
export function removeKeyImage(sessionId: string): void {
  localStorage.removeItem(K.keyImage(sessionId))
  sessionStorage.removeItem(K.keyImage(sessionId))
}

// ── Media Attachments ──────────────────────────────────────────────────────
export function getAttachments(sessionId: string): MediaAttachment[] {
  return read<MediaAttachment[]>(K.attachments(sessionId)) ?? []
}
export function saveAttachments(sessionId: string, atts: MediaAttachment[]): void {
  write(K.attachments(sessionId), atts)
}

// ── Style References ──────────────────────────────────────────────────────
export function getStyleReferences(): StyleReference[] {
  return read<StyleReference[]>(K.STYLE_REFS) ?? []
}
export function saveStyleReferences(refs: StyleReference[]): void {
  write(K.STYLE_REFS, refs)
}
export function saveStyleReference(ref: StyleReference): void {
  const list = getStyleReferences()
  const idx  = list.findIndex((r) => r.id === ref.id)
  if (idx >= 0) list[idx] = ref; else list.push(ref)
  write(K.STYLE_REFS, list)
}
export function deleteStyleReference(id: string): void {
  write(K.STYLE_REFS, getStyleReferences().filter((r) => r.id !== id))
}

// ── Diaries ───────────────────────────────────────────────────────────────
export function getDiaries(): NovelDiary[] { return read<NovelDiary[]>(K.DIARIES) ?? [] }
export function getDiary(id: string): NovelDiary | null { return getDiaries().find((d) => d.id === id) ?? null }
export function saveDiary(diary: NovelDiary): void {
  const list = getDiaries()
  const idx  = list.findIndex((d) => d.id === diary.id)
  if (idx >= 0) list[idx] = diary; else list.unshift(diary)  // 최신순
  write(K.DIARIES, list)
}
export function deleteDiary(id: string): void {
  write(K.DIARIES, getDiaries().filter((d) => d.id !== id))
}

// ── Characters ─────────────────────────────────────────────────────────────
export function getCharacters(): Character[] { return read<Character[]>(K.CHARACTERS) ?? [] }
export function getCharacter(name: string): Character | null {
  return getCharacters().find((c) => c.name === name) ?? null
}
export function upsertCharacter(char: Character): void {
  const list = getCharacters()
  const idx  = list.findIndex((c) => c.name === char.name)
  if (idx >= 0) {
    const existing = list[idx]
    list[idx] = {
      ...existing, ...char,
      appearances: [...new Set([...(existing.appearances ?? []), ...(char.appearances ?? [])])],
      episodes: (() => {
        const merged = [...(existing.episodes ?? []), ...(char.episodes ?? [])]
        const seen   = new Set<string>()
        return merged.filter((e) => {
          const key = (e.date ?? '') + '|' + (e.summary ?? '')
          if (seen.has(key)) return false
          seen.add(key); return true
        }).slice(-20)
      })(),
      avatarData: char.avatarData ?? existing.avatarData,
    }
  } else { list.push(char) }
  write(K.CHARACTERS, list)
}
export function saveCharacterAvatar(name: string, avatarData: Character['avatarData']): void {
  const list = getCharacters()
  const idx  = list.findIndex((c) => c.name === name)
  if (idx >= 0) { list[idx].avatarData = avatarData; write(K.CHARACTERS, list) }
}
export function deleteCharacter(name: string): void {
  write(K.CHARACTERS, getCharacters().filter((c) => c.name !== name))
}

// ── Blocked Characters ─────────────────────────────────────────────────────
export function getBlockedChars(): string[] { return read<string[]>(K.BLOCKED) ?? [] }
export function blockChar(name: string): void {
  const list = getBlockedChars()
  if (!list.includes(name)) { list.push(name); write(K.BLOCKED, list) }
}
export function unblockChar(name: string): void {
  write(K.BLOCKED, getBlockedChars().filter((n) => n !== name))
}
export function isBlocked(name: string): boolean {
  return getBlockedChars().includes(name)
}

// ── Data Export / Import ───────────────────────────────────────────────────
export interface ExportData {
  version: 1
  exportedAt: string
  diaries: ReturnType<typeof getDiaries>
  styleReferences: ReturnType<typeof getStyleReferences>
  characters: ReturnType<typeof getCharacters>
  blockedChars: ReturnType<typeof getBlockedChars>
  prefs: ReturnType<typeof getPrefs>
}

export function exportAllData(): ExportData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    diaries: getDiaries(),
    styleReferences: getStyleReferences(),
    characters: getCharacters(),
    blockedChars: getBlockedChars(),
    prefs: getPrefs(),
  }
}

export function importAllData(data: ExportData): void {
  if (data.version !== 1) throw new Error('지원하지 않는 버전이에요.')
  write(K.DIARIES, data.diaries ?? [])
  write(K.STYLE_REFS, data.styleReferences ?? [])
  write(K.CHARACTERS, data.characters ?? [])
  write(K.BLOCKED, data.blockedChars ?? [])
  write(K.PREFS, data.prefs ?? {})
}

// ── Drawer: Chat Messages ─────────────────────────────────────────────────
export function getChatMessages(): ChatMessage[] { return read<ChatMessage[]>(K.CHAT) ?? [] }
export function saveChatMessages(msgs: ChatMessage[]): void { write(K.CHAT, msgs) }
export function appendChatMessage(msg: ChatMessage): void {
  const list = getChatMessages()
  list.push(msg)
  write(K.CHAT, list.slice(-200)) // 최대 200개 보관
}

// ── Drawer: Badges ────────────────────────────────────────────────────────
export function getBadges(): Badge[] { return read<Badge[]>(K.BADGES) ?? [] }
export function saveBadge(badge: Badge): void {
  const list = getBadges()
  if (!list.find((b) => b.id === badge.id)) { list.push(badge); write(K.BADGES, list) }
}

// ── Drawer: Character Profile ─────────────────────────────────────────────
export function getCharacterProfile(): CharacterProfile | null { return read<CharacterProfile>(K.CHAR_PROFILE) }
export function saveCharacterProfile(profile: CharacterProfile): void { write(K.CHAR_PROFILE, profile) }
