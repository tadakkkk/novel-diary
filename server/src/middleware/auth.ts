import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Request, Response, NextFunction } from 'express'

// Lazy init — env vars are guaranteed to be loaded by the time first request comes in
let _supabase: SupabaseClient | null = null
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY
    if (!url || !key) throw new Error(`Missing env: SUPABASE_URL=${url} SUPABASE_ANON_KEY=${key ? '(set)' : '(missing)'}`)
    _supabase = createClient(url, key)
  }
  return _supabase
}

export interface AuthRequest extends Request {
  userId?: string
  isAnonymous?: boolean
}

export async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    try {
      const { data: { user }, error } = await getSupabase().auth.getUser(token)
      if (!error && user) {
        req.userId = user.id
        req.isAnonymous = false
        return next()
      }
    } catch { /* fall through to device ID */ }
  }

  // Fallback: anonymous device ID
  const deviceId = req.headers['x-device-id'] as string | undefined
  if (deviceId && /^[a-zA-Z0-9_-]{8,64}$/.test(deviceId)) {
    req.userId = `anon:${deviceId}`
    req.isAnonymous = true
    return next()
  }

  res.status(401).json({ error: 'Unauthorized' })
}
