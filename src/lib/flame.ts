import { type FlameLevel } from '@/types'
import { DEFAULT_GENERATION_THRESHOLD, FLAME_THRESHOLDS } from '@/lib/constants'

export function calcFlameLevel(count: number): FlameLevel {
  let level = 0
  for (let i = FLAME_THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= FLAME_THRESHOLDS[i]) { level = i; break }
  }
  return Math.min(level, 5) as FlameLevel
}

export function isGenerationReady(count: number): boolean {
  return count >= DEFAULT_GENERATION_THRESHOLD
}

export function getThresholdHint(count: number): string {
  const rem = DEFAULT_GENERATION_THRESHOLD - count
  return rem > 0 ? `땔감 ${rem}개 더 필요해요` : `► 일기 생성 가능`
}
