import { useCallback, useEffect, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { type FlameLevel, type Kindling, type KeyImage } from '@/types'
import { calcFlameLevel } from '@/lib/flame'
import { toSessionId } from '@/lib/date'
import * as storage from '@/services/storage'
import { compressImage } from '@/lib/compress-image'

interface BonfireSession {
  sessionId: string
  kindlings: Kindling[]
  flameLevel: FlameLevel
  keyImage: KeyImage | null
  addKindling: (text: string) => void
  removeKindling: (id: string) => void
  reorderKindlings: (fromId: string, toId: string) => void
  uploadKeyImage: (file: File) => Promise<void>
  removeKeyImage: () => void
}

const SESSION_STORAGE_KEY = 'novel-diary:active-session'

function getOrCreateSessionId(): string {
  // 브라우저 탭 세션 동안 유지, 새 탭/새로고침 후에도 복원
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY)
  if (existing) return existing
  const newId = toSessionId() + '-' + Date.now()
  sessionStorage.setItem(SESSION_STORAGE_KEY, newId)
  return newId
}

export function newBonfireSession(): void {
  // 새 일기 시작 — 세션 ID 초기화
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

export function useBonfireSession(): BonfireSession {
  const sessionId = getOrCreateSessionId()

  const [kindlings, setKindlings] = useState<Kindling[]>([])
  const [flameLevel, setFlameLevel] = useState<FlameLevel>(0)
  const [keyImage, setKeyImage] = useState<KeyImage | null>(null)

  // ── 초기 로드 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = storage.getKindlings(sessionId)
    setKindlings(saved)
    setFlameLevel(calcFlameLevel(saved.length))
    setKeyImage(storage.getKeyImage(sessionId))
  }, [sessionId])

  // ── 땔감 추가 ─────────────────────────────────────────────────────────────
  const addKindling = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setKindlings((prev) => {
        const next: Kindling[] = [
          ...prev,
          {
            id: uuid(),
            sessionId,
            text: trimmed,
            order: prev.length,
            mediaAttachments: [],
            createdAt: new Date().toISOString(),
          },
        ]
        storage.saveKindlings(sessionId, next)
        setFlameLevel(calcFlameLevel(next.length))
        return next
      })
    },
    [sessionId]
  )

  // ── 땔감 삭제 ─────────────────────────────────────────────────────────────
  const removeKindling = useCallback(
    (id: string) => {
      setKindlings((prev) => {
        const next = prev.filter((k) => k.id !== id)
        storage.saveKindlings(sessionId, next)
        setFlameLevel(calcFlameLevel(next.length))
        return next
      })
    },
    [sessionId]
  )

  // ── 땔감 순서 변경 ───────────────────────────────────────────────────────
  const reorderKindlings = useCallback(
    (fromId: string, toId: string) => {
      setKindlings((prev) => {
        const from = prev.findIndex((k) => k.id === fromId)
        const to   = prev.findIndex((k) => k.id === toId)
        if (from < 0 || to < 0 || from === to) return prev
        const next = [...prev]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        const reindexed = next.map((k, i) => ({ ...k, order: i }))
        storage.saveKindlings(sessionId, reindexed)
        return reindexed
      })
    },
    [sessionId]
  )

  // ── 대표 이미지 업로드 ─────────────────────────────────────────────────────
  const uploadKeyImage = useCallback(
    async (file: File) => {
      const compressed = await compressImage(file, 1024, 0.82).catch(async () =>
        compressImage(file, 512, 0.65)
      )
      const ki: KeyImage & { base64Data: string; mediaType: string } = {
        id: uuid(),
        sessionId,
        dataUrl: compressed.dataUrl,
        base64Data: compressed.base64Data,
        mediaType: compressed.mediaType,
        fileName: file.name,
        fileSizeBytes: file.size,
        createdAt: new Date().toISOString(),
      }
      storage.saveKeyImage(sessionId, ki)
      setKeyImage(ki)
    },
    [sessionId]
  )

  // ── 대표 이미지 삭제 ───────────────────────────────────────────────────────
  const removeKeyImage = useCallback(() => {
    storage.removeKeyImage(sessionId)
    setKeyImage(null)
  }, [sessionId])

  return { sessionId, kindlings, flameLevel, keyImage, addKindling, removeKindling, reorderKindlings, uploadKeyImage, removeKeyImage }
}
