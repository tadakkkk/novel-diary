// ── Anonymous quota (localStorage-based) ─────────────────────────────────
// Logged-in + subscribed users bypass this check entirely.

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
