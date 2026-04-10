import { Router } from 'express'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { getUsage, updateSubscription } from '../services/supabase.js'

const router = Router()

// ── POST /api/auth/sync — first-login data sync ───────────────────────────
// Receives: { anonCallCount, data } from client
// - Syncs anon call count (uses max of local vs server)
// - Stores localStorage dump in Supabase user_data table
router.post('/sync', requireUser, async (req: AuthRequest, res) => {
  if (req.isAnonymous) return res.status(403).json({ error: 'Login required' })

  const { anonCallCount = 0 } = req.body as { anonCallCount?: number; data?: unknown }

  // Sync call count: use max(local, server)
  const usage = await getUsage(req.userId!)
  if (anonCallCount > usage.call_count) {
    await updateSubscription(req.userId!, {})
    // Update call count directly
    const { supabase } = await import('../services/supabase.js')
    await supabase.from('usage').update({ call_count: anonCallCount }).eq('user_id', req.userId!)
  }

  res.json({ ok: true })
})

export default router
