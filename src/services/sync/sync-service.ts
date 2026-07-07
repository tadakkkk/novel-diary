// ── 클라우드 동기화 서비스 ──────────────────────────────────────────────────
// 클라이언트에서 supabase-js로 직접 diaries / user_blobs / Storage에 접근한다
// (RLS가 본인 데이터만 접근하도록 보안 담당 → 서버 경유 불필요).
//
// 쓰기 전략:
//  - 로컬 저장은 지금처럼 즉시(동기). 서버 push는 백그라운드(fire-and-forget).
//  - push 실패한 일기 id는 dirty 큐(localStorage)에 기록 → 다음 syncOnLogin 때 재시도.
// 오프라인: 실패해도 로컬은 그대로. 에러는 콘솔만.
// 게스트(isGuest): 동기화 전부 스킵.

import { supabase, getUser } from '@/services/auth/auth-service'
import { isGuest } from '@/services/guest/guest-mode'
import * as storage from '@/services/storage'
import type { Character, NovelDiary } from '@/types'
import {
  uploadKeyImage, parseDataUrl, directKeyImageUrl, keyImageStoragePath,
} from './image-upload'

// ── dirty 큐 (push 실패 재시도용) ───────────────────────────────────────────
const DIRTY_KEY = 'novel-diary:sync-dirty'

function getDirtyQueue(): string[] {
  try { return JSON.parse(localStorage.getItem(DIRTY_KEY) ?? '[]') as string[] } catch { return [] }
}
function markDirty(id: string): void {
  const q = new Set(getDirtyQueue()); q.add(id)
  try { localStorage.setItem(DIRTY_KEY, JSON.stringify([...q])) } catch { /* ignore */ }
}
function unmarkDirty(id: string): void {
  const q = getDirtyQueue().filter((x) => x !== id)
  try { localStorage.setItem(DIRTY_KEY, JSON.stringify(q)) } catch { /* ignore */ }
}

// ── diaries 테이블 ↔ NovelDiary 매핑 ────────────────────────────────────────
interface DiaryRow {
  id: string
  user_id: string
  date: string | null
  title: string | null
  content: string | null
  generation_options: NovelDiary['generationOptions'] | null
  continuity_context: string | null
  kindling_snapshot: string[] | null
  character_names: string[] | null
  key_image_url: string | null
  created_at: string | null
  updated_at: string | null
}

function rowFromDiary(d: NovelDiary, userId: string): DiaryRow {
  const now = new Date().toISOString()
  return {
    id: d.id,
    user_id: userId,
    date: d.date ?? null,
    title: d.title ?? null,
    content: d.content ?? '',
    generation_options: d.generationOptions ?? null,
    continuity_context: d.continuityContext ?? null,
    kindling_snapshot: d.kindlingSnapshot ?? d.kindlings?.map((k) => k.text) ?? null,
    character_names: d.characterNames ?? d.characters?.map((c) => typeof c === 'string' ? c : c.name) ?? null,
    // storagePath만 서버에 저장. dataUrl(레거시)은 절대 push하지 않음(용량 폭증 방지) —
    // 대신 pushDiary에서 Storage로 마이그레이션 후 storagePath로 채워짐.
    key_image_url: keyImageStoragePath(d.keyImage),
    created_at: d.createdAt ?? now,
    updated_at: d.updatedAt ?? d.createdAt ?? now,
  }
}

function rowToDiary(r: DiaryRow): NovelDiary {
  const snapshot = r.kindling_snapshot ?? undefined
  const names    = r.character_names ?? undefined
  const key      = r.key_image_url
  return {
    id: r.id,
    content: r.content ?? '',
    generationOptions: r.generation_options ?? {
      perspective: '1인칭주인공', processingLevel: 3, styleReferenceIds: [],
    },
    continuityContext: r.continuity_context ?? '',
    date: r.date ?? undefined,
    title: r.title ?? undefined,
    kindlingSnapshot: snapshot,
    // UI가 diary.kindlings.length / characters를 참조하므로 스냅샷으로 복원
    kindlings: snapshot?.map((text, i) => ({ id: `k-${i}`, text })),
    characterNames: names,
    characters: names?.map((name) => ({ name, relationship: '' })),
    keyImage: !key ? null : key.startsWith('data:') ? key : { storagePath: key },
    wordCount: (r.content ?? '').length,
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? undefined,
  }
}

// ── 이미지 마이그레이션: 레거시 dataUrl → Storage 업로드 후 { storagePath } ──
async function migrateImageIfNeeded(diary: NovelDiary, userId: string): Promise<NovelDiary> {
  if (keyImageStoragePath(diary.keyImage)) return diary   // 이미 경로형
  const dataUrl = directKeyImageUrl(diary.keyImage)
  if (!dataUrl || !dataUrl.startsWith('data:')) return diary
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) return diary
  let path: string
  try {
    path = await uploadKeyImage(parsed.base64Data, parsed.mediaType, userId)
  } catch (e) {
    // 업로드 실패: 이미지는 dataUrl로 남겨두고(본문은 계속 동기화) 다음에 재시도
    console.warn('[sync] keyImage 업로드 실패, dataUrl 유지:', (e as Error).message)
    return diary
  }
  const migrated: NovelDiary = { ...diary, keyImage: { storagePath: path } }
  // 로컬도 경로형으로 교체 → base64를 localStorage에서 제거(용량 확보). updatedAt은 유지(병합 루프 방지).
  storage.saveDiary(migrated)
  return migrated
}

// ── push: 일기 1편 upsert (실패해도 throw하지 않고 dirty 기록) ───────────────
export async function pushDiary(diary: NovelDiary): Promise<void> {
  if (isGuest() || !supabase) return
  try {
    const user = await getUser()
    if (!user) return
    const toSave = await migrateImageIfNeeded(diary, user.id)
    const { error } = await supabase.from('diaries').upsert(rowFromDiary(toSave, user.id))
    if (error) throw error
    // 본문은 동기화됐지만 이미지가 아직 dataUrl(업로드 실패)이면 다음 동기화에 재시도
    if (directKeyImageUrl(toSave.keyImage)?.startsWith('data:')) markDirty(diary.id)
    else unmarkDirty(diary.id)
  } catch (e) {
    console.warn('[sync] pushDiary failed:', (e as Error).message)
    markDirty(diary.id)
  }
}

// ── 서버 일기 삭제 (로컬 삭제와 함께 호출) ──────────────────────────────────
export async function deleteDiaryRemote(id: string): Promise<void> {
  if (isGuest() || !supabase) return
  try {
    const user = await getUser()
    if (!user) return
    await supabase.from('diaries').delete().eq('id', id).eq('user_id', user.id)
    unmarkDirty(id)
  } catch (e) {
    console.warn('[sync] deleteDiaryRemote failed:', (e as Error).message)
  }
}

// ── pull: 서버의 내 일기 전부 ───────────────────────────────────────────────
export async function pullDiaries(): Promise<NovelDiary[]> {
  if (isGuest() || !supabase) return []
  const user = await getUser()
  if (!user) return []
  const { data, error } = await supabase.from('diaries').select('*').eq('user_id', user.id)
  if (error) throw error
  return (data as DiaryRow[] ?? []).map(rowToDiary)
}

// ── user_blobs (등장인물 등 기타 데이터 백업) ───────────────────────────────
async function pullUserBlob<T>(key: string): Promise<T | null> {
  if (!supabase) return null
  const user = await getUser()
  if (!user) return null
  const { data, error } = await supabase.from('user_blobs')
    .select('value').eq('user_id', user.id).eq('key', key).maybeSingle()
  if (error || !data) return null
  return data.value as T
}
async function pushUserBlob(key: string, value: unknown): Promise<void> {
  if (!supabase) return
  const user = await getUser()
  if (!user) return
  await supabase.from('user_blobs').upsert({
    user_id: user.id, key, value, updated_at: new Date().toISOString(),
  })
}

// ── 병합 유틸: updatedAt 최신 우선 ──────────────────────────────────────────
function ts(d: NovelDiary): string { return d.updatedAt ?? d.createdAt ?? '' }
function byNewest(a: NovelDiary, b: NovelDiary): number {
  return (b.createdAt ?? b.date ?? '').localeCompare(a.createdAt ?? a.date ?? '')
}

// ── syncOnLogin: 앱 시작/로그인 시 호출 ─────────────────────────────────────
//  - 서버 pull → 로컬과 병합(같은 id면 updatedAt 최신 우선, 한쪽에만 있으면 양쪽에 채움)
//  - 병합 결과를 로컬에 반영하고, 로컬이 더 새롭거나 로컬에만 있는 것 + dirty 큐를 서버에 push
let syncing = false
export async function syncOnLogin(): Promise<void> {
  if (isGuest() || !supabase || syncing) return
  const user = await getUser()
  if (!user) return
  syncing = true
  try {
    await syncDiaries()
    await syncCharacters()
  } catch (e) {
    console.warn('[sync] syncOnLogin failed:', (e as Error).message)
  } finally {
    syncing = false
  }
}

async function syncDiaries(): Promise<void> {
  const local = storage.getDiaries()
  const byId  = new Map<string, NovelDiary>(local.map((d) => [d.id, d]))

  let server: NovelDiary[] = []
  let pulled = true
  try { server = await pullDiaries() } catch { pulled = false }   // 오프라인: 병합 스킵, dirty만 재시도

  const toPush = new Map<string, NovelDiary>()

  if (pulled) {
    const serverIds = new Set(server.map((s) => s.id))
    for (const s of server) {
      const l = byId.get(s.id)
      if (!l) { byId.set(s.id, s) }                    // 서버에만 → 로컬에 채움
      else if (ts(s) > ts(l)) { byId.set(s.id, s) }    // 서버가 최신 → 서버 채택
      else if (ts(l) > ts(s)) { toPush.set(l.id, l) }  // 로컬이 최신 → push 대상
    }
    for (const l of local) if (!serverIds.has(l.id)) toPush.set(l.id, l)  // 로컬에만 → push

    // 병합 결과를 로컬에 반영
    storage.setDiaries([...byId.values()].sort(byNewest))
  }

  // dirty 큐(이전 실패분) 합류
  for (const id of getDirtyQueue()) {
    const d = byId.get(id)
    if (d) toPush.set(id, d)
  }

  // 순차 push (이미지 마이그레이션이 로컬 read-modify-write를 하므로 경합 방지)
  for (const d of toPush.values()) {
    await pushDiary(d)
  }
}

async function syncCharacters(): Promise<void> {
  try {
    const server = (await pullUserBlob<Character[]>('characters')) ?? []
    const local  = storage.getCharacters()
    // 이름 기준 union, 로컬 우선
    const byName = new Map<string, Character>(server.map((c) => [c.name, c]))
    for (const c of local) byName.set(c.name, c)
    const merged = [...byName.values()]
    storage.setCharacters(merged)
    await pushUserBlob('characters', merged)
  } catch (e) {
    console.warn('[sync] syncCharacters failed:', (e as Error).message)
  }
}
