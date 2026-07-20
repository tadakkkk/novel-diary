// ── 앱 언어 감지 ───────────────────────────────────────────────────────────
// 추후 정식 i18n 도입 시 이 함수 하나만 교체하면 된다.
export type AppLanguage = 'ko' | 'en'

const LANG_KEY = 'novel-diary:lang'

// 브라우저 언어 기반 감지 + localStorage 오버라이드.
// 우선순위:
//   1) localStorage 'novel-diary:lang' 값 ('ko' | 'en') — 디버그/테스트용 강제 지정
//   2) navigator.language 가 'ko'로 시작하면 'ko'
//   3) 그 외 전부 'en'
export function getAppLanguage(): AppLanguage {
  try {
    const override = localStorage.getItem(LANG_KEY)
    if (override === 'ko' || override === 'en') return override
  } catch {
    // localStorage 접근 불가 환경 (SSR 등) — 무시하고 navigator 로 폴백
  }

  const nav = typeof navigator !== 'undefined' ? navigator.language : ''
  return nav && nav.toLowerCase().startsWith('ko') ? 'ko' : 'en'
}
