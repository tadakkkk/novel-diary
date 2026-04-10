import { useState } from 'react'
import { signInWithGoogle } from '@/services/auth/auth-service'
import { createCheckoutSession } from '@/services/api/api-client'

interface Props {
  onClose: () => void
  isLoggedIn: boolean
}

export function PaywallModal({ onClose, isLoggedIn }: Props) {
  const [loading, setLoading] = useState<'weekly' | 'monthly' | 'login' | null>(null)
  const [error, setError] = useState('')

  async function handleSubscribe(plan: 'weekly' | 'monthly') {
    if (!isLoggedIn) {
      setLoading('login')
      try { await signInWithGoogle() } catch { setLoading(null) }
      return
    }

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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(0,0,0,0.96)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: '#000',
        border: '3px solid var(--fire-org)',
        boxShadow: '0 0 40px rgba(255,90,0,0.25)',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '2px solid var(--gray-2)' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 18, color: 'var(--fire-tip)', letterSpacing: '0.06em', marginBottom: 6 }}>
            🔥 무료 횟수를 모두 사용했어요
          </div>
          <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-4)', lineHeight: 1.7 }}>
            30회 무료 사용이 끝났어요. 구독하면 제한 없이 계속 쓸 수 있어요.
          </div>
        </div>

        {/* Plans */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Monthly — recommended */}
          <div style={{
            border: '2px solid var(--fire-org)',
            background: 'rgba(255,90,0,0.06)',
            padding: '16px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: -11, left: 12,
              background: 'var(--fire-org)', color: '#000',
              fontFamily: 'var(--font-pixel)', fontSize: 8,
              padding: '2px 8px', letterSpacing: '0.08em',
            }}>
              추천
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.06em' }}>
                월간 구독
              </div>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', marginTop: 4 }}>
                매월 자동 결제 · 언제든 취소 가능
              </div>
            </div>
            <button
              className='pixel-btn pixel-btn-fire'
              style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
              disabled={!!loading}
              onClick={() => handleSubscribe('monthly')}
            >
              {loading === 'monthly' ? '잠깐만요...' : '▸ 월간 구독하기'}
            </button>
          </div>

          {/* Weekly */}
          <div style={{ border: '2px solid var(--gray-2)', padding: '16px' }}>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--white)', letterSpacing: '0.06em' }}>
                주간 구독
              </div>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', marginTop: 4 }}>
                매주 자동 결제 · 언제든 취소 가능
              </div>
            </div>
            <button
              className='pixel-btn'
              style={{ width: '100%', opacity: loading ? 0.6 : 1 }}
              disabled={!!loading}
              onClick={() => handleSubscribe('weekly')}
            >
              {loading === 'weekly' ? '잠깐만요...' : '▸ 주간 구독하기'}
            </button>
          </div>

          {error && (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#ff4444', textAlign: 'center', lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          {!isLoggedIn && (
            <div style={{
              fontFamily: 'var(--font-korean)', fontSize: 12,
              color: 'var(--gray-3)', textAlign: 'center', lineHeight: 1.6,
              padding: '8px', border: '1px solid var(--gray-1)',
            }}>
              구독을 위해 Google 계정 로그인이 필요해요
              {loading === 'login' && <span style={{ marginLeft: 6 }}>로그인 중...</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 20px', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-pixel)', fontSize: 8,
              color: 'var(--text-off)', background: 'none', border: 'none',
              cursor: 'pointer', letterSpacing: '0.06em', textDecoration: 'underline',
            }}
          >
            나중에 하기
          </button>
        </div>
      </div>
    </div>
  )
}
