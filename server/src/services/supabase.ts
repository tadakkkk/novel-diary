import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy init — avoids crash when env vars not loaded at module parse time
let _supabase: SupabaseClient | null = null
function getClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error(`Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`)
    _supabase = createClient(url, key, { auth: { persistSession: false } })
  }
  return _supabase
}

// Proxy so callers can use `supabase.from(...)` without changing call sites
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ── Usage tracking ─────────────────────────────────────────────────────────

export const FREE_QUOTA = Number(process.env.FREE_LIMIT) || 30

export interface UsageRecord {
  user_id:               string
  call_count:            number
  subscription_status:   'free' | 'active' | 'canceled' | 'past_due'
  subscription_plan:     'weekly' | 'monthly' | null
  paddle_customer_id:    string | null
  paddle_subscription_id: string | null
}

export async function getUsage(userId: string): Promise<UsageRecord> {
  const { data, error } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    const newRecord: UsageRecord = {
      user_id:               userId,
      call_count:            0,
      subscription_status:   'free',
      subscription_plan:     null,
      paddle_customer_id:    null,
      paddle_subscription_id: null,
    }
    await supabase.from('usage').insert(newRecord)
    return newRecord
  }

  return data as UsageRecord
}

// 읽기 전용 한도 확인 — call_count를 차감하지 않는다.
// 구독자는 항상 허용(remaining: -1). 비구독자는 FREE_QUOTA 도달 시 차단.
export async function checkQuota(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const usage = await getUsage(userId)

  if (usage.subscription_status === 'active') {
    return { allowed: true, remaining: -1 }
  }

  if (usage.call_count >= FREE_QUOTA) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: FREE_QUOTA - usage.call_count }
}

// 일기 생성 "성공" 후에만 호출 — call_count +1 수행.
// 동시성 메모: checkQuota와 이 함수 사이의 틈으로 한도가 ±1 벗어날 수 있으나,
// 무료 한도 용도로는 허용한다.
export async function recordDiaryGeneration(
  userId: string
): Promise<{ remaining: number }> {
  const usage = await getUsage(userId)
  const nextCount = usage.call_count + 1
  await supabase.from('usage').update({ call_count: nextCount }).eq('user_id', userId)

  if (usage.subscription_status === 'active') {
    return { remaining: -1 }
  }
  return { remaining: Math.max(0, FREE_QUOTA - nextCount) }
}

export async function updateSubscription(
  userId: string,
  update: Partial<Pick<
    UsageRecord,
    'subscription_status' | 'subscription_plan' | 'paddle_customer_id' | 'paddle_subscription_id'
  >>
): Promise<void> {
  await supabase.from('usage').update(update).eq('user_id', userId)
}

export async function getUserByPaddleCustomer(
  paddleCustomerId: string
): Promise<UsageRecord | null> {
  const { data } = await supabase
    .from('usage')
    .select('*')
    .eq('paddle_customer_id', paddleCustomerId)
    .single()
  return data as UsageRecord | null
}

// ── Letter storage ─────────────────────────────────────────────────────────

export interface LetterRecord {
  id:           string
  user_id:      string
  date:         string       // 'YYYY-MM-DD'
  content:      string
  scheduled_at: string       // ISO timestamp — gated delivery time
  is_read:      boolean
  created_at:   string
}

export async function getTodayLetter(userId: string, today: string): Promise<LetterRecord | null> {
  const { data } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()
  return (data as LetterRecord | null)
}

export async function insertLetter(
  record: Pick<LetterRecord, 'user_id' | 'date' | 'content' | 'scheduled_at'>
): Promise<LetterRecord> {
  const { data, error } = await supabase
    .from('letters')
    .insert(record)
    .select()
    .single()
  if (error) throw error
  return data as LetterRecord
}

export async function markLetterReadDb(userId: string, date: string): Promise<void> {
  await supabase.from('letters').update({ is_read: true }).eq('user_id', userId).eq('date', date)
}

export async function getUserLetters(userId: string): Promise<LetterRecord[]> {
  const { data } = await supabase
    .from('letters')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30)
  return (data ?? []) as LetterRecord[]
}
