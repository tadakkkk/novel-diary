import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DrawerPopup } from '@/features/drawer/DrawerPopup'
import { useAppContext } from '@/App'
import { signOut } from '@/services/auth/auth-service'

export function AppHeader() {
  const navigate = useNavigate()
  const { user } = useAppContext()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)

  async function handleLogout() {
    setMenuOpen(false)
    await signOut()
  }

  const avatarUrl   = user?.user_metadata?.avatar_url as string | undefined
  const displayName = user?.user_metadata?.full_name as string | undefined
    ?? user?.email?.split('@')[0]

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
