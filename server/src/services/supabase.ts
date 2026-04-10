import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

// ── Usage tracking ─────────────────────────────────────────────────────────

const FREE_QUOTA = 30

export interface UsageRecord {
  user_id: string        // Supabase auth user id or anonymous device id
  call_count: number
  subscription_status: 'free' | 'active' | 'canceled' | 'past_due'
  subscription_plan: 'weekly' | 'monthly' | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export async function getUsage(userId: string): Promise<UsageRecord> {
  const { data, error } = await supabase
    .from('usage')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    // Create new record if not exists
    const newRecord: UsageRecord = {
      user_id: userId,
      call_count: 0,
      subscription_status: 'free',
      subscription_plan: null,
      stripe_customer_id: null,
      stripe_subscription_id: null,
    }
    await supabase.from('usage').insert(newRecord)
    return newRecord
  }

  return data as UsageRecord
}

export async function incrementCallCount(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const usage = await getUsage(userId)

  // Subscribed users have unlimited calls
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
  update: Partial<Pick<UsageRecord, 'subscription_status' | 'subscription_plan' | 'stripe_customer_id' | 'stripe_subscription_id'>>
): Promise<void> {
  await supabase.from('usage').update(update).eq('user_id', userId)
}

export async function getUserByStripeCustomer(stripeCustomerId: string): Promise<UsageRecord | null> {
  const { data } = await supabase
    .from('usage')
    .select('*')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()
  return data as UsageRecord | null
}
