// ── Server API Client ─────────────────────────────────────────────────────
// Routes all AI calls through our backend server.
// Falls back to direct Anthropic calls if VITE_API_URL is not set (dev mode).

import { getSession } from '@/services/auth/auth-service'
import { getDeviceId } from '@/services/storage'

const API_BASE = import.meta.env.VITE_API_URL as string | undefined

export interface UsageStatus {
  callCount: number
  subscriptionStatus: 'free' | 'active' | 'canceled' | 'past_due'
  subscriptionPlan: 'weekly' | 'monthly' | null
  freeQuota: number
  remaining: number  // -1 = unlimited
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await getSession()
  const headers: Record<string, string> = {}

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  } else {
    // Anonymous fallback: use stable device ID from localStorage
    headers['x-device-id'] = getDeviceId()
  }

  return headers
}

export class QuotaExceededError extends Error {
  constructor() { super('QUOTA_EXCEEDED') }
}

// ── Generic chat call through server ─────────────────────────────────────
export async function serverChat(opts: {
  messages: Array<{ role: 'user' | 'assistant'; content: string | object[] }>
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}): Promise<{ text: string; remaining: number }> {
  if (!API_BASE) throw new Error('VITE_API_URL not set')

  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      messages: opts.messages,
      systemPrompt: opts.systemPrompt,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
    signal: opts.signal,
  })

  if (res.status === 402) throw new QuotaExceededError()
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  const data = await res.json() as { text: string }
  const remaining = Number(res.headers.get('x-calls-remaining') ?? '-1')
  return { text: data.text, remaining }
}

// ── Usage status ──────────────────────────────────────────────────────────
export async function fetchUsageStatus(): Promise<UsageStatus> {
  if (!API_BASE) {
    return { callCount: 0, subscriptionStatus: 'free', subscriptionPlan: null, freeQuota: 30, remaining: -1 }
  }

  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/ai/usage`, { headers })
  if (!res.ok) throw new Error('Failed to fetch usage')
  return res.json() as Promise<UsageStatus>
}

// ── Paddle Checkout ───────────────────────────────────────────────────────
export async function createCheckoutSession(plan: 'weekly' | 'monthly'): Promise<string> {
  if (!API_BASE) throw new Error('VITE_API_URL not set')

  const headers = await getAuthHeaders()
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ plan }),
  })
  if (!res.ok) throw new Error('결제 페이지를 열 수 없어요. 잠시 후 다시 시도해주세요.')
  const { url } = await res.json() as { url: string }
  return url
}
