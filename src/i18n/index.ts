// ── UI 문자열 i18n ─────────────────────────────────────────────────────────
// 언어 결정은 기존 getAppLanguage()를 그대로 재사용한다 (새 감지 로직 만들지 않음).
// 언어는 앱 시작 시 1회 결정되는 값이므로 리액티브 상태가 아니라 단순 함수 호출로 충분.
import { getAppLanguage } from '@/services/claude/prompts/language'
import { ko } from './ko'
import { en } from './en'

// 네임스페이스 키(예: 'diary.save')로 현재 언어의 문자열을 반환.
// en에 키가 없으면 ko 값으로 폴백, 둘 다 없으면 키 자체를 반환(누락 발견용).
export function t(key: string): string {
  if (getAppLanguage() === 'en') return en[key] ?? ko[key] ?? key
  return ko[key] ?? key
}

// 어순이 다른 문자열을 위한 템플릿 헬퍼: t('key')에서 {name} 자리표시자를 치환.
export function tf(key: string, vars: Record<string, string | number>): string {
  let out = t(key)
  for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v))
  return out
}
