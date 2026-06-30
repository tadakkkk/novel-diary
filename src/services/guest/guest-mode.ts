// ── 게스트(둘러보기) 모드 ──────────────────────────────────────────────────
// 로그인 없이 데모 데이터로 앱을 열람하는 모드.
// - 진입: LoginGate의 "둘러보기" 버튼
// - 이탈: Google 로그인 시 자동 해제
// - 게스트는 절대 서버(AI) 호출/쓰기를 하지 않는다 (비용·abuse 방지).
//
// 이 모듈은 storage 등 다른 서비스를 import 하지 않는다 (순환참조 방지).
// 플래그는 sessionStorage에 보관해 새로고침에도 유지되며, 탭 종료 시 사라진다.

const GUEST_KEY = 'novel-diary:guest-mode'

let _cache: boolean | null = null

export function isGuest(): boolean {
  if (_cache !== null) return _cache
  try { _cache = sessionStorage.getItem(GUEST_KEY) === '1' } catch { _cache = false }
  return _cache
}

export function setGuest(on: boolean): void {
  _cache = on
  try {
    if (on) sessionStorage.setItem(GUEST_KEY, '1')
    else    sessionStorage.removeItem(GUEST_KEY)
  } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent('guest-mode-change', { detail: on })) } catch { /* ignore */ }
}

// ── 서버/쓰기 차단 ──────────────────────────────────────────────────────────
export class GuestBlockedError extends Error {
  constructor() { super('GUEST_BLOCKED') }
}

// 게스트가 막힌 동작(AI 생성 등)을 시도했을 때 전역 안내 토스트 트리거
export function notifyGuestBlocked(): void {
  try { window.dispatchEvent(new CustomEvent('guest-blocked')) } catch { /* ignore */ }
}

// UI 진입점 가드: 게스트면 안내를 띄우고 true 반환(호출부는 중단해야 함)
export function guardGuestAction(): boolean {
  if (isGuest()) { notifyGuestBlocked(); return true }
  return false
}
