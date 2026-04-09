import { useSyncExternalStore } from 'react'

const mq768 = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
const mq480 = typeof window !== 'undefined' ? window.matchMedia('(max-width: 480px)') : null

export function useMobile() {
  const isMobile = useSyncExternalStore(
    (cb) => { mq768?.addEventListener('change', cb); return () => mq768?.removeEventListener('change', cb) },
    () => mq768?.matches ?? false,
    () => false,
  )
  const isSmall = useSyncExternalStore(
    (cb) => { mq480?.addEventListener('change', cb); return () => mq480?.removeEventListener('change', cb) },
    () => mq480?.matches ?? false,
    () => false,
  )
  return { isMobile, isSmall }
}
