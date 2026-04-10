import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DrawerPopup } from '@/features/drawer/DrawerPopup'
import { useAppContext } from '@/App'
import { signOut } from '@/services/auth/auth-service'
import { getAnonRemaining } from '@/services/quota/quota-service'

export function AppHeader() {
  const navigate = useNavigate()
  const { user, showPaywall, usageStatus } = useAppContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    await signOut()
  }

  const avatarUrl   = user?.user_metadata?.avatar_url as string | undefined
  const displayName = (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email?.split('@')[0]

  const serverMode    = !!import.meta.env.VITE_API_URL
  const isSubscribed  = usageStatus?.subscriptionStatus === 'active'

  // remaining: logged-in → server value, anonymous → localStorage
  const remaining = user && usageStatus
    ? usageStatus.remaining          // -1 = unlimited (subscribed)
    : serverMode ? getAnonRemaining() : -1

  const showBadge = serverMode
  const badgeZero = !isSubscribed && remaining === 0

  return (
    <>
      <header className='app-header'>
        <button className='app-logo' onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <span className='logo-korean'>타닥타닥</span>
          <span className='logo-en'>tadak-tadak</span>
        </button>

        <div className='header-actions'>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/timeline')}>
            [타임라인]
          </button>
          <button className='pixel-btn pixel-btn-sm' style={{ borderColor: 'var(--fire-org)', color: 'var(--fire-org)' }} onClick={() => setDrawerOpen(true)}>
            [주인공의 서랍]
          </button>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/style-ref')}>
            [참고 문체]
          </button>

          {/* 구독하기 버튼 — 미구독 상태에서만 표시 */}
          {serverMode && !isSubscribed && (
            <button
              className='pixel-btn pixel-btn-sm'
              style={{ borderColor: 'var(--fire-org)', color: 'var(--fire-org)', fontSize: 8 }}
              onClick={() => showPaywall('subscribe')}
            >
              [구독하기]
            </button>
          )}

          {/* 잔여 횟수 / 구독 상태 배지 */}
          {showBadge && (
            isSubscribed ? (
              <span style={{
                fontFamily: 'var(--font-pixel)', fontSize: 8,
                color: '#a0e080', letterSpacing: '0.06em',
                border: '1px solid #a0e080', padding: '3px 7px',
              }}>
                ✨ 구독중
              </span>
            ) : (
              <button
                onClick={badgeZero ? () => showPaywall('quota') : undefined}
                style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 8,
                  color: badgeZero ? '#ff4444' : 'var(--fire-amb)',
                  letterSpacing: '0.06em',
                  border: `1px solid ${badgeZero ? '#ff4444' : 'var(--fire-amb)'}`,
                  padding: '3px 7px',
                  background: 'none',
                  cursor: badgeZero ? 'pointer' : 'default',
                }}
              >
                🔥 {remaining}회 남음
              </button>
            )
          )}

          {/* User avatar — only when logged in */}
          {user && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                style={{ background: 'none', border: '2px solid var(--fire-org)', borderRadius: 0, cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt='profile' style={{ width: 24, height: 24, display: 'block' }} />
                  : (
                    <div style={{ width: 24, height: 24, background: 'var(--fire-org)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-pixel)', fontSize: 10, color: '#000' }}>
                      {displayName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )
                }
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#0d0d0d', border: '2px solid var(--gray-2)',
                  minWidth: 160, zIndex: 500,
                }}>
                  <div style={{ padding: '10px 14px', fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', borderBottom: '1px solid var(--gray-1)' }}>
                    {displayName}
                  </div>
                  <button
                    onClick={() => { setMenuOpen(false); showPaywall('subscribe') }}
                    style={{ width: '100%', padding: '10px 14px', fontFamily: 'var(--font-pixel)', fontSize: 8, color: isSubscribed ? 'var(--fire-amb)' : 'var(--gray-3)', background: 'none', border: 'none', borderBottom: '1px solid var(--gray-1)', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.06em' }}
                  >
                    {isSubscribed ? '구독 관리' : '구독하기'}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{ width: '100%', padding: '10px 14px', fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-3)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.06em' }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      {drawerOpen && <DrawerPopup onClose={() => setDrawerOpen(false)} />}
    </>
  )
}
