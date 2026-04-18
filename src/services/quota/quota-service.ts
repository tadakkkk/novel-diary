// ── Anonymous quota (localStorage-based) ─────────────────────────────────
// Logged-in + subscribed users bypass this check entirely.

import { getSession } from '@/services/auth/auth-service'
import { fetchUsageStatus } from '@/services/api/api-client'

const USE_SERVER = !!import.meta.env.VITE_API_URL

const KEY   = 'novel-diary:anon-call-count'
export const FREE_LIMIT = 3 // TODO: 테스트 후 30으로 복원

export function getAnonCallCount(): number {
  return parseInt(localStorage.getItem(KEY) ?? '0', 10)
}

export function incrementAnonCallCount(): void {
  localStorage.setItem(KEY, String(getAnonCallCount() + 1))
}

export function isAnonQuotaExceeded(): boolean {
  return getAnonCallCount() >= FREE_LIMIT
}

export function getAnonRemaining(): number {
  return Math.max(0, FREE_LIMIT - getAnonCallCount())
}

export function syncAnonCountFromServer(serverCount: number): void {
  // Use the higher of the two counts to prevent quota gaming
  const local = getAnonCallCount()
  if (serverCount > local) localStorage.setItem(KEY, String(serverCount))
}

// ── Unified pre-navigation quota check ───────────────────────────────────
// 비로그인: localStorage 기준 / 로그인: 서버 usage 테이블 기준
// false → 정상 (이동 허용) / true → 초과 (Paywall 표시)
export async function isQuotaExceeded(): Promise<boolean> {
  if (!USE_SERVER) return false
  const session = await getSession()
  if (!session) return isAnonQuotaExceeded()
  try {
    const usage = await fetchUsageStatus()
    return usage.remaining === 0
  } catch {
    // 네트워크 오류 시 서버에서 거부하도록 위임
    return false
  }
}
