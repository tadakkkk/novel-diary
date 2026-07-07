// ── Storage Service (localStorage 전용 접근 레이어) ─────────────────────
import {
  type Badge, type Character, type CharacterProfile, type ChatMessage,
  type DiarySession, type KeyImage, type Kindling, type Letter,
  type MediaAttachment, type NovelDiary, type SavedNovel, type StyleReference, type UserPrefs,
} from '@/types'
import { isGuest } from '@/services/guest/guest-mode'
import * as demo from '@/data/guestDemoData'

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
  LETTERS:      `${P}letters`,
  SAVED_NOVELS: `${P}saved-novels`,
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
  if (isGuest()) return
  localStorage.setItem(K.API_KEY, key)
}

// ── User Prefs ─────────────────────────────────────────────────────────────
export function getPrefs(): UserPrefs { return read<UserPrefs>(K.PREFS) ?? {} }
export function savePrefs(prefs: Partial<UserPrefs>): void {
  if (isGuest()) return
  write(K.PREFS, { ...getPrefs(), ...prefs })
}

// ── Sessions ──────────────────────────────────────────────────────────────
export function getSessions(): DiarySession[] {
  if (isGuest()) return demo.DEMO_SESSIONS
  return read<DiarySession[]>(K.SESSIONS) ?? []
}
export function getSession(id: string): DiarySession | null { return getSessions().find((s) => s.id === id) ?? null }
export function saveSession(session: DiarySession): void {
  if (isGuest()) return
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
  if (isGuest()) return demo.DEMO_ACTIVE_KINDLINGS
  return read<Kindling[]>(K.kindlings(sessionId)) ?? []
}
export function saveKindlings(sessionId: string, kindlings: Kindling[]): void {
  if (isGuest()) return
  write(K.kindlings(sessionId), kindlings)
}

// ── Key Image ─────────────────────────────────────────────────────────────
export function getKeyImage(sessionId: string): KeyImage | null {
  if (isGuest()) return null
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
  if (isGuest()) return
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
  if (isGuest()) return
  localStorage.removeItem(K.keyImage(sessionId))
  sessionStorage.removeItem(K.keyImage(sessionId))
}

// ── Media Attachments ──────────────────────────────────────────────────────
export function getAttachments(sessionId: string): MediaAttachment[] {
  if (isGuest()) return []
  return read<MediaAttachment[]>(K.attachments(sessionId)) ?? []
}
export function saveAttachments(sessionId: string, atts: MediaAttachment[]): void {
  if (isGuest()) return
  write(K.attachments(sessionId), atts)
}

// ── Style References ──────────────────────────────────────────────────────
export function getStyleReferences(): StyleReference[] {
  if (isGuest()) return []
  return read<StyleReference[]>(K.STYLE_REFS) ?? []
}
export function saveStyleReferences(refs: StyleReference[]): void {
  if (isGuest()) return
  write(K.STYLE_REFS, refs)
}
export function saveStyleReference(ref: StyleReference): void {
  if (isGuest()) return
  const list = getStyleReferences()
  const idx  = list.findIndex((r) => r.id === ref.id)
  if (idx >= 0) list[idx] = ref; else list.push(ref)
  write(K.STYLE_REFS, list)
}
export function deleteStyleReference(id: string): void {
  if (isGuest()) return
  write(K.STYLE_REFS, getStyleReferences().filter((r) => r.id !== id))
}

// ── Diaries ───────────────────────────────────────────────────────────────
export function getDiaries(): NovelDiary[] {
  if (isGuest()) return demo.DEMO_DIARIES
  return read<NovelDiary[]>(K.DIARIES) ?? []
}
export function getDiary(id: string): NovelDiary | null { return getDiaries().find((d) => d.id === id) ?? null }
export function saveDiary(diary: NovelDiary): void {
  if (isGuest()) return
  const list = getDiaries()
  const idx  = list.findIndex((d) => d.id === diary.id)
  if (idx >= 0) list[idx] = diary; else list.unshift(diary)  // 최신순
  write(K.DIARIES, list)
}
export function deleteDiary(id: string): void {
  if (isGuest()) return
  write(K.DIARIES, getDiaries().filter((d) => d.id !== id))
}
// 동기화 병합 결과를 로컬에 일괄 반영 (클라우드 sync 전용)
export function setDiaries(list: NovelDiary[]): void {
  if (isGuest()) return
  write(K.DIARIES, list)
}

// ── Characters ─────────────────────────────────────────────────────────────
export function getCharacters(): Character[] {
  if (isGuest()) return demo.DEMO_CHARACTERS
  return read<Character[]>(K.CHARACTERS) ?? []
}
export function getCharacter(name: string): Character | null {
  return getCharacters().find((c) => c.name === name) ?? null
}
export function upsertCharacter(char: Character): void {
  if (isGuest()) return
  const list = getCharacters()
  const idx  = list.findIndex((c) => c.name === char.name)
  if (idx >= 0) {
    const existing = list[idx]
    list[idx] = {
      ...existing, ...char,
      // 동일인의 다른 호칭(별칭) 누적 — 정식 name과 중복되는 별칭은 제외
      aliases: [...new Set([...(existing.aliases ?? []), ...(char.aliases ?? [])])].filter((a) => a && a !== existing.name),
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
      // 이미 등록된 인물은 처음 본 아바타를 유지 (동일인이 매번 다르게 보이지 않도록)
      avatarData: existing.avatarData ?? char.avatarData,
    }
  } else { list.push(char) }
  write(K.CHARACTERS, list)
}
export function saveCharacterAvatar(name: string, avatarData: Character['avatarData']): void {
  if (isGuest()) return
  const list = getCharacters()
  const idx  = list.findIndex((c) => c.name === name)
  if (idx >= 0) { list[idx].avatarData = avatarData; write(K.CHARACTERS, list) }
}
export function deleteCharacter(name: string): void {
  if (isGuest()) return
  write(K.CHARACTERS, getCharacters().filter((c) => c.name !== name))
}
// 동기화 병합 결과를 로컬에 일괄 반영 (클라우드 sync 전용)
export function setCharacters(list: Character[]): void {
  if (isGuest()) return
  write(K.CHARACTERS, list)
}

// ── Blocked Characters ─────────────────────────────────────────────────────
export function getBlockedChars(): string[] {
  if (isGuest()) return []
  return read<string[]>(K.BLOCKED) ?? []
}
export function blockChar(name: string): void {
  if (isGuest()) return
  const list = getBlockedChars()
  if (!list.includes(name)) { list.push(name); write(K.BLOCKED, list) }
}
export function unblockChar(name: string): void {
  if (isGuest()) return
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
  if (isGuest()) return
  if (data.version !== 1) throw new Error('지원하지 않는 버전이에요.')
  write(K.DIARIES, data.diaries ?? [])
  write(K.STYLE_REFS, data.styleReferences ?? [])
  write(K.CHARACTERS, data.characters ?? [])
  write(K.BLOCKED, data.blockedChars ?? [])
  write(K.PREFS, data.prefs ?? {})
}

// ── Drawer: Chat Messages ─────────────────────────────────────────────────
export function getChatMessages(): ChatMessage[] {
  if (isGuest()) return []
  return read<ChatMessage[]>(K.CHAT) ?? []
}
export function saveChatMessages(msgs: ChatMessage[]): void {
  if (isGuest()) return
  write(K.CHAT, msgs)
}
export function appendChatMessage(msg: ChatMessage): void {
  if (isGuest()) return
  const list = getChatMessages()
  list.push(msg)
  write(K.CHAT, list.slice(-200)) // 최대 200개 보관
}

// ── Drawer: Badges ────────────────────────────────────────────────────────
export function getBadges(): Badge[] {
  if (isGuest()) return demo.DEMO_BADGES
  return read<Badge[]>(K.BADGES) ?? []
}
export function saveBadge(badge: Badge): void {
  if (isGuest()) return
  const list = getBadges()
  if (!list.find((b) => b.id === badge.id)) { list.push(badge); write(K.BADGES, list) }
}

// ── Drawer: Character Profile ─────────────────────────────────────────────
export function getCharacterProfile(): CharacterProfile | null {
  if (isGuest()) return demo.DEMO_CHARACTER_PROFILE
  return read<CharacterProfile>(K.CHAR_PROFILE)
}
export function saveCharacterProfile(profile: CharacterProfile): void {
  if (isGuest()) return
  write(K.CHAR_PROFILE, profile)
}

// ── Next Chapter Letters ──────────────────────────────────────────────────
export function getLetters(): Letter[] {
  if (isGuest()) return demo.DEMO_LETTERS
  return read<Letter[]>(K.LETTERS) ?? []
}
export function saveLetter(letter: Letter): void {
  if (isGuest()) return
  const list = getLetters().filter((l) => l.id !== letter.id)
  list.unshift(letter)
  write(K.LETTERS, list.slice(0, 30)) // 최대 30통 보관
}
export function markLetterRead(id: string): void {
  if (isGuest()) return
  const list = getLetters().map((l) => l.id === id ? { ...l, read: true } : l)
  write(K.LETTERS, list)
}
export function getTodayLetter(): Letter | null {
  const today = new Date().toISOString().slice(0, 10)
  return getLetters().find((l) => l.date === today) ?? null
}
export function hasUnreadDeliveredLetter(): boolean {
  const now = new Date()
  return getLetters().some((l) => !l.read && new Date(l.arrivedAt) <= now)
}

// ── Saved Novels (책장) ────────────────────────────────────────────────────
export function getSavedNovels(): SavedNovel[] {
  if (isGuest()) return []
  return read<SavedNovel[]>(K.SAVED_NOVELS) ?? []
}
export function saveNovel(novel: SavedNovel): void {
  if (isGuest()) return
  const list = getSavedNovels().filter((n) => n.id !== novel.id)
  list.unshift(novel)
  write(K.SAVED_NOVELS, list.slice(0, 50)) // 최대 50편 보관
}
export function deleteNovel(id: string): void {
  if (isGuest()) return
  write(K.SAVED_NOVELS, getSavedNovels().filter((n) => n.id !== id))
}
