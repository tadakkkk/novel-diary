import { Router } from 'express'
import { requireUser, type AuthRequest } from '../middleware/auth.js'
import { supabase } from '../services/supabase.js'

const router = Router()

// ── DELETE /api/account — 계정 영구 삭제 (App Store Guideline 5.1.1) ────────
// 인증된 실제 유저만. 관련 데이터(usage, letters) 삭제 후 Supabase Auth 유저 삭제.
// service role 키를 쓰는 supabase 클라이언트라 admin.deleteUser 사용 가능.
router.delete('/', requireUser, async (req: AuthRequest, res) => {
  // 익명(device id) 사용자는 계정이 없으므로 거부
  if (req.isAnonymous || !req.userId || req.userId.startsWith('anon:')) {
    return res.status(403).json({ error: 'Login required' })
  }

  const userId = req.userId
  try {
    // 1. 사용자 관련 데이터 삭제 (행이 없어도 에러 아님)
    await supabase.from('letters').delete().eq('user_id', userId)
    await supabase.from('usage').delete().eq('user_id', userId)

    // 2. Supabase Auth 유저 삭제 (단순 로그아웃/비활성화 아님 — 영구 삭제)
    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    res.json({ ok: true })
  } catch (e) {
    console.error('[account delete]', (e as Error).message)
    res.status(500).json({ error: '계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요.' })
  }
})

export default router
