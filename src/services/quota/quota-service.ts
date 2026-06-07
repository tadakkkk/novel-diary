import { getSession } from '@/services/auth/auth-service'
import { fetchUsageStatus } from '@/services/api/api-client'

const USE_SERVER = !!import.meta.env.VITE_API_URL
const PAYMENT_ENABLED = import.meta.env.VITE_PAYMENT_ENABLED === 'true'

export const FREE_LIMIT = 30

// ── Pre-navigation quota check (diary generation only) ────────────────────
// Login is required — non-logged-in users are blocked at the LoginGate.
// false → allowed / true → quota exceeded (show paywall)
export async function isDiaryQuotaExceeded(): Promise<boolean> {
  if (!PAYMENT_ENABLED) return false
  if (!USE_SERVER) return false
  const session = await getSession()
  if (!session) return false
  try {
    const usage = await fetchUsageStatus()
    return usage.remaining === 0
  } catch {
    return false
  }
}
