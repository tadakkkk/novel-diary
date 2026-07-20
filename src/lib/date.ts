import { getAppLanguage } from '@/services/claude/prompts/language'

const DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

// 전체 날짜 + 요일. ko는 기존 수동 포맷 유지(스냅샷 동일), en만 Intl 사용.
export function formatKoreanDate(date: Date = new Date()): string {
  if (getAppLanguage() === 'en') {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
  }
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}년 ${m}월 ${d}일 ${DAYS[date.getDay()]}`
}

export function toSessionId(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

/** "2024년 3월 15일" (ko) / "March 15, 2024" (en) from ISO date string or Date */
export function formatDate(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isNaN(d.getTime())) return String(iso)
  if (getAppLanguage() === 'en') {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(d)
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** "24.03.15" short form */
export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (isNaN(d.getTime())) return String(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}
