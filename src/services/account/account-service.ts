// ── Account Service — 계정 삭제 (App Store Guideline 5.1.1) ─────────────────
// 서버 삭제 요청 → 로컬 데이터 정리 → 로그아웃을 하나로 캡슐화.
import { deleteAccountRequest } from '@/services/api/api-client'
import { signOut } from '@/services/auth/auth-service'

// localStorage에 저장된 이 앱의 모든 데이터(일기/땔감/등장인물/편지 등) 제거
function clearLocalData(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('novel-diary:')) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
  } catch { /* ignore */ }
  // 활성 세션(땔감) 캐시도 정리
  try {
    const skeys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k && k.startsWith('novel-diary:')) skeys.push(k)
    }
    skeys.forEach((k) => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}

// 순서: 서버 삭제(인증 필요) → 성공 시 로컬 정리 + 로그아웃.
// 서버 삭제가 실패하면 로컬/세션을 건드리지 않고 에러를 던진다(재시도 가능).
export async function deleteAccount(): Promise<void> {
  await deleteAccountRequest()
  clearLocalData()
  await signOut()
}
