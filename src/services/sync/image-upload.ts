// ── 대표 이미지 Supabase Storage 업로드/표시 ────────────────────────────────
// 기존: 대표 이미지를 base64 dataUrl로 일기에 인라인 저장 (한 장 ~400KB → iOS
//       localStorage 한도 초과 원인).
// 변경: 로그인 시 Storage(private 'diary-images')에 업로드하고 일기에는 경로만
//       { storagePath } 로 저장. 표시는 signed URL 발급(캐시).
// 하위호환: 기존 dataUrl(문자열 / { dataUrl })은 그대로 표시.

import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/services/auth/auth-service'
import type { NovelDiary } from '@/types'

const BUCKET = 'diary-images'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7   // 7일

export type KeyImageValue = NovelDiary['keyImage']

// ── base64 dataUrl 파싱 ─────────────────────────────────────────────────────
export function parseDataUrl(dataUrl: string): { base64Data: string; mediaType: string } | null {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!m) return null
  return { mediaType: m[1], base64Data: m[2] }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ── keyImage 형태 판별 헬퍼 ─────────────────────────────────────────────────
// dataUrl(문자열 또는 { dataUrl }) → 그 문자열, 아니면 null
export function directKeyImageUrl(ki: KeyImageValue): string | null {
  if (!ki) return null
  if (typeof ki === 'string') return ki
  if ('dataUrl' in ki && ki.dataUrl) return ki.dataUrl
  return null
}
// { storagePath } → 경로, 아니면 null
export function keyImageStoragePath(ki: KeyImageValue): string | null {
  if (ki && typeof ki === 'object' && 'storagePath' in ki && ki.storagePath) return ki.storagePath
  return null
}

// ── 업로드 ──────────────────────────────────────────────────────────────────
// 경로 규칙: `{userId}/{uuid}.{ext}` — RLS가 첫 폴더=auth.uid()를 요구.
export async function uploadKeyImage(base64Data: string, mediaType: string, userId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const ext = mediaType.includes('png') ? 'png' : mediaType.includes('webp') ? 'webp' : 'jpg'
  const path = `${userId}/${uuidv4()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, base64ToBytes(base64Data), {
    contentType: mediaType || 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

// ── signed URL 발급 (in-memory 캐시로 중복 발급 방지) ───────────────────────
const urlCache = new Map<string, { url: string; expiresAt: number }>()

export async function getImageUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null
  const cached = urlCache.get(storagePath)
  if (cached && cached.expiresAt > Date.now()) return cached.url
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, SIGNED_URL_TTL)
  if (error || !data?.signedUrl) return null
  // 만료 1시간 전까지만 캐시 유효로 간주
  urlCache.set(storagePath, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_URL_TTL - 3600) * 1000 })
  return data.signedUrl
}

// ── 표시용 URL 해석 (async) ─────────────────────────────────────────────────
// dataUrl은 즉시 반환, storagePath는 signed URL 발급.
export async function resolveKeyImageUrl(ki: KeyImageValue): Promise<string | null> {
  const direct = directKeyImageUrl(ki)
  if (direct) return direct
  const path = keyImageStoragePath(ki)
  if (path) return getImageUrl(path)
  return null
}

// ── React 훅: keyImage → 표시 가능한 URL ────────────────────────────────────
export function useKeyImageUrl(ki: KeyImageValue): string | null {
  const [url, setUrl] = useState<string | null>(() => directKeyImageUrl(ki))
  // dataUrl이면 그 값, storagePath면 경로를 의존성 키로 (base64 전체 비교 회피는
  // 아니지만 리스트에서 diary 객체가 안정적이라 실용상 충분)
  const depKey = directKeyImageUrl(ki) ?? keyImageStoragePath(ki) ?? ''
  useEffect(() => {
    let cancelled = false
    const direct = directKeyImageUrl(ki)
    if (direct) { setUrl(direct); return }
    const path = keyImageStoragePath(ki)
    if (!path) { setUrl(null); return }
    getImageUrl(path).then((u) => { if (!cancelled) setUrl(u) }).catch(() => { if (!cancelled) setUrl(null) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])
  return url
}
