import { Router } from 'express'
import { requireUser, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// ── POST /api/auth/sync — first-login data sync ───────────────────────────
router.post('/sync', requireUser, async (req: AuthRequest, res) => {
  if (req.isAnonymous) return res.status(403).json({ error: 'Login required' })
  res.json({ ok: true })
})

export default router
