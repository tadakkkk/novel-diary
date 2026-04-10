import { createClient } from '@supabase/supabase-js'
import type { Request, Response, NextFunction } from 'express'

const supabasePublic = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
)

export interface AuthRequest extends Request {
  userId?: string
  isAnonymous?: boolean
}

// Require auth — attaches userId to req
// Anonymous users pass a device ID header (x-device-id) as fallback
export async function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data: { user }, error } = await supabasePublic.auth.getUser(token)
    if (!error && user) {
      req.userId = user.id
      req.isAnonymous = false
      return next()
    }
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
