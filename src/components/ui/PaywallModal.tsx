import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signInWithGoogle } from '@/services/auth/auth-service'
import { createCheckoutSession } from '@/services/api/api-client'

interface Props {
  user: User | null
  onClose: () => void
  source?: 'quota' | 'subscribe'
}

export function PaywallModal({ user, onClose, source = 'quota' }: Props) {
  const [loading, setLoading] = useState<'login' | 'weekly' | 'monthly' | null>(null)
  const [error, setError]     = useState('')

  async function handleLogin() {
    setLoading('login')
    setError('')
    try {
      await signInWithGoogle()
    } catch {
      setError('로그인 중 오류가 발생했어요. 다시 시도해주세요.')
      setLoading(null)
    }
  }

  async function handleSubscribe(plan: 'weekly' | 'monthly') {
    setLoading(plan)
    setError('')
    try {
      const url = await createCheckoutSession(plan)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했어요.')
      setLoading(null)
    }
  }

  const isLoading = !!loading

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.97)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 480, background: '#000', border: '3px solid var(--fire-org)', boxShadow: '0 0 40px rgba(255,90,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '2px solid var(--gray-2)' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: 'var(--fire-tip)', letterSpacing: '0.06em', marginBottom: 8 }}>
            {source === 'subscribe' ? '✨ 구독 플랜 선택' : '🔥 무료 횟수를 모두 사용했어요'}
          </div>
          <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-4)', lineHeight: 1.7 }}>
            {source === 'subscribe' ? '구독하면 제한 없이 일기를 쓸 수 있어요.' : '30회 무료 사용이 끝났어요.'}
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* 비로그인: 로그인 유도 */}
          {!user ? (
            <>
              <div style={{
                fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-4)',
                lineHeight: 1.8, marginBottom: 20,
                padding: '14px 16px', border: '1px solid var(--gray-2)',
              }}>
                계속하려면 로그인이 필요해요.<br />
                Google 계정으로 로그인하면 구독 플랜을 선택할 수 있어요.
              </div>

              <button
                className='pixel-btn pixel-btn-fire'
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: isLoading ? 0.6 : 1 }}
                disabled={isLoading}
                onClick={handleLogin}
              >
                <svg width='16' height='16' viewBox='0 0 48 48' style={{ flexShrink: 0 }}>
                  <path fill='#FFC107' d='M43.6 20H24v8h11.3C33.7 33.2 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z'/>
                  <path fill='#FF3D00' d='M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z'/>
                  <path fill='#4CAF50' d='M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.4 35.6 26.8 36 24 36c-5.2 0-9.7-2.8-11.3-7H6.3C9.7 39.7 16.3 44 24 44z'/>
                  <path fill='#1976D2' d='M43.6 20H24v8h11.3c-.8 2.3-2.4 4.3-4.5 5.8l6.2 5.2C40.9 36.2 44 30.5 44 24c0-1.3-.1-2.7-.4-4z'/>
                </svg>
                {loading === 'login' ? '로그인 중...' : 'Google로 로그인'}
              </button>
            </>
          ) : (
            /* 로그인 상태: 플랜 선택 */
            <>
              {/* 플랜 카드 2개 나란히 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>

                {/* 월간 — 추천 */}
                <div style={{ border: '2px solid var(--fire-org)', background: 'rgba(255,90,0,0.06)', padding: '16px 14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -11, left: 10, background: 'var(--fire-org)', color: '#000', fontFamily: 'var(--font-pixel)', fontSize: 7, padding: '2px 7px', letterSpacing: '0.08em' }}>
                    추천
                  </div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--fire-tip)', letterSpacing: '0.06em', marginBottom: 6 }}>
                    월간 구독
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>
                    ₩3,800
                  </div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-4)', marginBottom: 4 }}>
                    / 월
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 10, color: '#a0e080', marginBottom: 12 }}>
                    주간 대비 약 21% 절약
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 10, color: 'var(--gray-4)', marginBottom: 14 }}>
                    매월 자동 결제<br />언제든 취소 가능
                  </div>
                  <button
                    className='pixel-btn pixel-btn-fire'
                    style={{ width: '100%', fontSize: 9, opacity: isLoading ? 0.6 : 1 }}
                    disabled={isLoading}
                    onClick={() => handleSubscribe('monthly')}
                  >
                    {loading === 'monthly' ? '...' : '▸ 구독하기'}
                  </button>
                </div>

                {/* 주간 */}
                <div style={{ border: '2px solid var(--gray-2)', padding: '16px 14px' }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--white)', letterSpacing: '0.06em', marginBottom: 6 }}>
                    주간 구독
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 20, fontWeight: 700, color: 'var(--white)', marginBottom: 2 }}>
                    ₩1,200
                  </div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-4)', marginBottom: 4 }}>
                    / 주
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 10, color: 'var(--gray-4)', marginBottom: 12 }}>
                    &nbsp;
                  </div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 10, color: 'var(--gray-4)', marginBottom: 14 }}>
                    매주 자동 결제<br />언제든 취소 가능
                  </div>
                  <button
                    className='pixel-btn'
                    style={{ width: '100%', fontSize: 9, opacity: isLoading ? 0.6 : 1 }}
                    disabled={isLoading}
                    onClick={() => handleSubscribe('weekly')}
                  >
                    {loading === 'weekly' ? '...' : '▸ 구독하기'}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#ff4444', marginTop: 12, textAlign: 'center', lineHeight: 1.6 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--text-off)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textDecoration: 'underline' }}
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  )
}
