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

export const FREE_QUOTA = 30

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

export async function incrementCallCount(
  userId: string
): Promise<{ allowed: boolean; remaining: number }> {
  const usage = await getUsage(userId)

  if (usage.subscription_status === 'active') {
    await supabase.from('usage').update({ call_count: usage.call_count + 1 }).eq('user_id', userId)
    return { allowed: true, remaining: -1 }
  }

  if (usage.call_count >= FREE_QUOTA) {
    return { allowed: false, remaining: 0 }
  }

  await supabase.from('usage').update({ call_count: usage.call_count + 1 }).eq('user_id', userId)
  return { allowed: true, remaining: FREE_QUOTA - usage.call_count - 1 }
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
