import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { signInWithGoogle, signOut } from '@/services/auth/auth-service'
import { deleteAccount } from '@/services/account/account-service'
import * as storage from '@/services/storage'

export function AppHeader() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { user, showPaywall, usageStatus, openDrawer } = useAppContext()

  const [navOpen,     setNavOpen]     = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [deleteErr,   setDeleteErr]   = useState('')
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
  const serverMode       = !!import.meta.env.VITE_API_URL
  const PAYMENT_ENABLED  = import.meta.env.VITE_PAYMENT_ENABLED === 'true'
  const isSubscribed     = PAYMENT_ENABLED ? usageStatus?.subscriptionStatus === 'active' : true
  const remaining    = usageStatus?.remaining ?? -1
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

  async function handleDeleteAccount() {
    if (deleting) return
    setDeleting(true)
    setDeleteErr('')
    try {
      await deleteAccount()
      // signOut → onAuthStateChange가 user를 null로 만들어 LoginGate로 복귀
      setDeleteModalOpen(false)
      navigate('/')
    } catch (e) {
      setDeleteErr((e as Error).message || '계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setDeleting(false)
    }
  }

  // ── 공통 스타일 변수 ────────────────────────────────────────────────────
  const DROP_ITEM: React.CSSProperties = {
    width: '100%', padding: '11px 16px',
    fontFamily: 'var(--font-korean)', fontSize: 14,
    background: 'none', border: 'none', cursor: 'pointer',
    textAlign: 'left', letterSpacing: '0.08em',
    display: 'block',
  }

  return (
    <>
      {/* ── 헤더 ── */}
      <header className='app-header' style={{
        justifyContent: 'space-between',
        paddingTop: 'env(safe-area-inset-top)',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
        paddingBottom: 0,
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
      }}>

        {/* ── 좌측: 햄버거 ── */}
        <div ref={navRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setNavOpen(v => !v); setProfileOpen(false) }}
            aria-label='메뉴'
            style={{
              background: 'none', border: '2px solid var(--gray-2)',
              cursor: 'pointer', padding: '6px 9px',
              display: 'flex', flexDirection: 'column', gap: 4,
              alignItems: 'center', justifyContent: 'center',
              minWidth: 44, minHeight: 44,
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
          {PAYMENT_ENABLED && showBadge && (
            <button
              onClick={() => showPaywall('subscribe')}
              style={{
                fontFamily: 'var(--font-pixel)', fontSize: 12,
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
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 44, minHeight: 44,
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt='profile' style={{ width: 28, height: 28, display: 'block' }} />
                ) : (
                  <div style={{
                    width: 28, height: 28,
                    background: 'var(--fire-org)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#000',
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
                  {PAYMENT_ENABLED && (
                  <button
                    onClick={() => { setProfileOpen(false); showPaywall('subscribe') }}
                    style={{ ...DROP_ITEM, color: 'var(--fire-org)' }}
                  >
                    {isSubscribed ? '구독 관리' : '구독하기'}
                  </button>
                  )}

                  {/* API Key section — 서버 모드에서는 서버가 키를 관리하므로 숨김 */}
                  {!serverMode && (
                  <div style={{ borderTop: '1px solid var(--gray-1)', padding: '10px 16px 8px' }}>
                    <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--gray-3)', letterSpacing: '0.06em', marginBottom: 6 }}>
                      ANTHROPIC API KEY
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: apiKeyExpanded ? 8 : 0 }}>
                      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: apiKeySaved ? 'var(--fire-org)' : 'var(--gray-3)', letterSpacing: '0.04em' }}>
                        {apiKeySaved ? '설정됨' : '미설정'}
                      </span>
                      <button
                        onClick={() => { setApiKeyExpanded(v => !v); setApiKeyInput('') }}
                        style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--gray-3)', background: 'transparent', border: '1px solid var(--gray-2)', padding: '2px 6px', cursor: 'pointer', letterSpacing: '0.04em' }}
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
                          style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, padding: '6px 8px', background: '#111', border: '1px solid var(--gray-2)', color: 'var(--gray-4)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
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
                            style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#000', background: 'var(--fire-org)', border: 'none', padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.04em', flex: 1 }}
                          >
                            저장
                          </button>
                          {apiKeySaved && (
                            <button
                              onClick={() => { storage.saveApiKey(''); setApiKeySaved(false); setApiKeyExpanded(false) }}
                              style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--gray-3)', background: 'transparent', border: '1px solid var(--gray-2)', padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.04em' }}
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  )}

                  <button
                    onClick={() => { setProfileOpen(false); signOut() }}
                    style={{ ...DROP_ITEM, color: 'var(--gray-3)', borderTop: '1px solid var(--gray-1)' }}
                  >
                    로그아웃
                  </button>
                  <button
                    onClick={() => { setProfileOpen(false); setDeleteErr(''); setDeleteModalOpen(true) }}
                    style={{ ...DROP_ITEM, color: '#ff5555', borderTop: '1px solid var(--gray-1)', fontSize: 12 }}
                  >
                    계정 삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── 계정 삭제 확인 모달 (App Store 5.1.1) ── */}
      {deleteModalOpen && (
        <div
          className='modal-overlay open'
          onClick={() => { if (!deleting) setDeleteModalOpen(false) }}
          style={{ zIndex: 800 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--black)', border: '3px solid #ff5555',
              boxShadow: 'inset 0 0 0 2px #ff5555, inset 0 0 0 5px var(--black)',
              padding: 32, maxWidth: 400, width: '90%', textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 14, color: '#ff5555', letterSpacing: '0.08em', marginBottom: 16 }}>
              ⚠ 계정 삭제
            </div>
            <p style={{ fontFamily: 'var(--font-korean)', fontSize: 14, color: 'var(--gray-5)', lineHeight: 1.8, marginBottom: 20, wordBreak: 'keep-all' }}>
              정말 삭제하시겠어요?<br />
              모든 일기와 기록이 <b style={{ color: '#ff5555' }}>영구 삭제</b>되며<br />복구할 수 없습니다.
            </p>
            {deleteErr && (
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: '#ff4444', marginBottom: 14, lineHeight: 1.6 }}>
                {deleteErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
                style={{ fontFamily: 'var(--font-korean)', fontSize: 14, fontWeight: 700, padding: '10px 20px', border: '3px solid var(--white)', color: 'var(--white)', background: 'transparent', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
              >
                취소
              </button>
              <button
                disabled={deleting}
                onClick={handleDeleteAccount}
                style={{ fontFamily: 'var(--font-korean)', fontSize: 14, fontWeight: 700, padding: '10px 20px', border: '3px solid #ff5555', color: deleting ? '#888' : '#ff5555', background: 'transparent', cursor: deleting ? 'default' : 'pointer' }}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
