import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { signInWithGoogle, signOut } from '@/services/auth/auth-service'
import { getAnonRemaining } from '@/services/quota/quota-service'
import * as storage from '@/services/storage'

export function AppHeader() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, showPaywall, usageStatus, openDrawer } = useAppContext()

  const [navOpen,     setNavOpen]     = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeySaved, setApiKeySaved] = useState(() => !!storage.getApiKey())
  const [apiKeyExpanded, setApiKeyExpanded] = useState(false)

  const navRef     = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (navRef.current     && !navRef.current.contains(e.target as Node))     setNavOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // ── 상태 계산 ──────────────────────────────────────────────────────────
  const serverMode   = !!import.meta.env.VITE_API_URL
  const isSubscribed = usageStatus?.subscriptionStatus === 'active'
  const remaining    = user && usageStatus
    ? usageStatus.remaining
    : serverMode ? getAnonRemaining() : -1
  const showBadge  = serverMode && !isSubscribed && remaining >= 0
  const badgeAlert = remaining <= 5

  const avatarUrl   = user?.user_metadata?.avatar_url as string | undefined
  const displayName = (user?.user_metadata?.full_name as string | undefined)
    ?? user?.email?.split('@')[0]

  // ── 네비 메뉴 항목 ─────────────────────────────────────────────────────
  const NAV_ITEMS = [
    { label: '타임라인',     path: '/timeline',  drawer: false },
    { label: '주인공의 서랍', path: null,         drawer: true  },
    { label: '참고 문체',    path: '/style-ref', drawer: false },
  ]

  function handleNavItem(item: typeof NAV_ITEMS[number]) {
    setNavOpen(false)
    if (item.drawer) { openDrawer(); return }
    if (item.path)   navigate(item.path)
  }

  async function handleLoginFromNav() {
    setNavOpen(false)
    try { await signInWithGoogle() } catch { /* 에러는 OAuth 팝업이 처리 */ }
  }

  // ── 공통 스타일 변수 ────────────────────────────────────────────────────
  const DROP_ITEM: React.CSSProperties = {
    width: '100%', padding: '11px 16px',
    fontFamily: 'var(--font-pixel)', fontSize: 9,
    background: 'none', border: 'none', cursor: 'pointer',
    textAlign: 'left', letterSpacing: '0.08em',
    display: 'block',
  }

  return (
    <>
      {/* ── 헤더 ── */}
      <header className='app-header' style={{ justifyContent: 'space-between', padding: '0 16px' }}>

        {/* ── 좌측: 햄버거 ── */}
        <div ref={navRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNavOpen(v => !v); setProfileOpen(false) }}
            aria-label='메뉴'
            style={{
              background: 'none', border: '2px solid var(--gray-2)',
              cursor: 'pointer', padding: '6px 9px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}
          >
            {[0,1,2].map(i => (
              <span key={i} style={{ display: 'block', width: 16, height: 2, background: 'var(--white)' }} />
            ))}
          </button>

          {navOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: '#0a0a0a', border: '2px solid var(--gray-2)',
              minWidth: 180, zIndex: 600,
              boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
            }}>
              {NAV_ITEMS.map(item => {
                const active = !item.drawer && location.pathname === item.path
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavItem(item)}
                    style={{
                      ...DROP_ITEM,
                      color: active ? 'var(--fire-org)' : 'var(--gray-4)',
                      borderLeft: active ? '3px solid var(--fire-org)' : '3px solid transparent',
                    }}
                  >
                    {item.label}
                  </button>
                )
              })}

              <div style={{ borderTop: '1px solid var(--gray-1)', margin: '4px 0' }} />

              {!user && (
                <button onClick={handleLoginFromNav} style={{ ...DROP_ITEM, color: 'var(--fire-org)' }}>
                  Google로 로그인
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 가운데: 로고 ── */}
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          }}
        >
          <span className='logo-korean'>타닥타닥</span>
          <span className='logo-en'>tadak-tadak</span>
        </button>

        {/* ── 우측: 배지 + 프로필 ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* 잔여 횟수 배지 */}
          {showBadge && (
            <button
              onClick={() => showPaywall('subscribe')}
              style={{
                fontFamily: 'var(--font-pixel)', fontSize: 8,
                letterSpacing: '0.06em',
                color: badgeAlert ? '#ff4444' : 'var(--fire-amb)',
                border: `1px solid ${badgeAlert ? '#ff4444' : 'var(--fire-amb)'}`,
                padding: '4px 8px', background: 'none', cursor: 'pointer',
              }}
            >
              🔥 {remaining}회 남음
            </button>
          )}

          {/* 프로필 버튼 (로그인 상태만) */}
          {user && (
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setProfileOpen(v => !v); setNavOpen(false) }}
                style={{
                  background: 'none',
                  border: '2px solid var(--fire-org)',
                  cursor: 'pointer', padding: 2,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt='profile' style={{ width: 28, height: 28, display: 'block' }} />
                ) : (
                  <div style={{
                    width: 28, height: 28,
                    background: 'var(--fire-org)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-pixel)', fontSize: 11, color: '#000',
                  }}>
                    {displayName?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </button>

              {profileOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#0a0a0a', border: '2px solid var(--gray-2)',
                  minWidth: 160, zIndex: 600,
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
                }}>
                  <div style={{
                    padding: '10px 16px',
                    fontFamily: 'var(--font-korean)', fontSize: 12,
                    color: 'var(--gray-4)',
                    borderBottom: '1px solid var(--gray-1)',
                  }}>
                    {displayName}
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); showPaywall('subscribe') }}
                    style={{ ...DROP_ITEM, color: 'var(--fire-org)' }}
                  >
                    {isSubscribed ? '구독 관리' : '구독하기'}
                  </button>

                  {/* API Key section */}
                  <div style={{ borderTop: '1px solid var(--gray-1)', padding: '10px 16px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
                      ANTHROPIC API KEY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: apiKeyExpanded ? 8 : 0 }}>
                      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: apiKeySaved ? 'var(--fire-org)' : 'var(--gray-3)', letterSpacing: '0.04em' }}>
                        {apiKeySaved ? '설정됨' : '미설정'}
                      </span>
                      <button
                        onClick={() => { setApiKeyExpanded(v => !v); setApiKeyInput('') }}
                        style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-3)', background: 'transparent', border: '1px solid var(--gray-2)', padding: '2px 6px', cursor: 'pointer', letterSpacing: '0.04em' }}
                      >
                        {apiKeyExpanded ? '닫기' : (apiKeySaved ? '변경' : '입력')}
                      </button>
                    </div>
                    {apiKeyExpanded && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <input
                          type='password'
                          placeholder='sk-ant-api...'
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, padding: '6px 8px', background: '#111', border: '1px solid var(--gray-2)', color: 'var(--gray-4)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            onClick={() => {
                              const k = apiKeyInput.trim()
                              if (!k) return
                              storage.saveApiKey(k)
                              setApiKeySaved(true)
                              setApiKeyExpanded(false)
                              setApiKeyInput('')
                            }}
                            style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: '#000', background: 'var(--fire-org)', border: 'none', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em', flex: 1 }}
                          >
                            저장
                          </button>
                          {apiKeySaved && (
                            <button
                              onClick={() => { storage.saveApiKey(''); setApiKeySaved(false); setApiKeyExpanded(false) }}
                              style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-3)', background: 'transparent', border: '1px solid var(--gray-2)', padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.04em' }}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => { setProfileOpen(false); signOut() }}
                    style={{ ...DROP_ITEM, color: 'var(--gray-3)', borderTop: '1px solid var(--gray-1)' }}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

    </>
  )
}
