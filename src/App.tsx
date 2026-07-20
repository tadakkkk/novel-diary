import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import * as storage from '@/services/storage'
import { t } from '@/i18n'

// ── PWA Install Prompt ─────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem('pwa-install-dismissed'))

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  if (!deferredPrompt || dismissed) return null

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDeferredPrompt(null)
      setDismissed(true)
      localStorage.setItem('pwa-install-dismissed', '1')
    }
  }

  function handleDismiss() {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', '1')
  }

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9998, background: '#0d0d0d', border: '2px solid var(--fire-org)',
      boxShadow: '0 0 16px rgba(255,90,0,0.3)',
      padding: '12px 16px', width: 'calc(100% - 32px)', maxWidth: 380,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>🔥</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.08em', marginBottom: 3 }}>
          {t('app.installTitle')}
        </div>
        <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', lineHeight: 1.5 }}>
          {t('app.installDesc')}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          className='pixel-btn pixel-btn-fire'
          style={{ fontSize: 12, padding: '8px 12px' }}
        >
          {t('app.install')}
        </button>
        <button
          onClick={handleDismiss}
          className='pixel-btn'
          style={{ fontSize: 12, padding: '8px 10px' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
import { DrawerPopup } from '@/features/drawer/DrawerPopup'
import BonfirePage from './pages/BonfirePage'
import DiaryPage from './pages/DiaryPage'
import TimelinePage from './pages/TimelinePage'
import StyleRefPage from './pages/StyleRefPage'
import NovelPage from './pages/NovelPage'
import PastSelfPage from './pages/PastSelfPage'
import CharacterDexPage from './pages/CharacterDexPage'
import StoryPage from './pages/StoryPage'
import NextChapterPage from './pages/NextChapterPage'

// ── Quota Toast ────────────────────────────────────────────────────────────
function QuotaToast() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function onQuota() {
      setVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), 6000)
    }
    window.addEventListener('storage-quota-exceeded', onQuota)
    return () => { window.removeEventListener('storage-quota-exceeded', onQuota); clearTimeout(timer) }
  }, [])

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#1a0500', border: '2px solid var(--fire-org)',
      boxShadow: 'inset 0 0 0 1px var(--fire-org)',
      padding: '12px 20px', maxWidth: 400, textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.1em', marginBottom: 6 }}>
        {t('app.quotaTitle')}
      </div>
      <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
        {t('app.quotaBody1')}<br />
        {t('app.quotaBody2')}
      </div>
      <button onClick={() => setVisible(false)}
        style={{ marginTop: 10, fontFamily: 'var(--font-pixel)', fontSize: 12, background: 'transparent', border: '1px solid #555', color: '#888', padding: '4px 10px', cursor: 'pointer' }}>
        {t('common.closeWord')}
      </button>
    </div>
  )
}

// ── Onboarding Modal ───────────────────────────────────────────────────────
const ONBOARDED_KEY = 'novel-diary:onboarded'

function OnboardingModal() {
  // In server mode (VITE_API_URL set), no API key needed — skip onboarding
  const serverMode = !!import.meta.env.VITE_API_URL
  const hasKey     = serverMode || !!storage.getApiKey()
  const onboarded  = !!localStorage.getItem(ONBOARDED_KEY)
  const [open, setOpen]   = useState(!hasKey && !onboarded)
  const [key,  setKey]    = useState('')
  const [err,  setErr]    = useState('')
  const [step, setStep]   = useState<1 | 2>(1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open && step === 2) inputRef.current?.focus() }, [open, step])

  function dismiss() {
    localStorage.setItem(ONBOARDED_KEY, '1')
    setOpen(false)
  }

  function saveKey() {
    const trimmed = key.trim()
    if (!trimmed.startsWith('sk-ant-')) { setErr(t('app.apiKeyInvalidFormat')); return }
    storage.saveApiKey(trimmed)
    dismiss()
  }

  if (!open) return null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:'rgba(0,0,0,0.96)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <div style={{ width:'100%', maxWidth:480, background:'#000', border:'3px solid var(--white)', boxShadow:'inset 0 0 0 2px var(--white), inset 0 0 0 5px #000' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'2px solid var(--gray-2)' }}>
          <div style={{ fontFamily:'var(--font-pixel)', fontSize:18, color:'var(--fire-tip)', letterSpacing:'0.06em', marginBottom:6 }}>🔥 {t('brand.name')}</div>
          <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)', lineHeight:1.7 }}>
            {t('app.onboardIntro')}
          </div>
        </div>

        {step === 1 ? (
          /* Step 1: 소개 */
          <div style={{ padding:'24px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:28 }}>
              {[
                ['🪵', t('app.onboard1Title'), t('app.onboard1Desc')],
                ['✍️', t('app.onboard2Title'), t('app.onboard2Desc')],
                ['▒', t('novel.title'), t('app.onboard3Desc')],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                  <span style={{ fontSize:22, flexShrink:0, lineHeight:1.3 }}>{icon}</span>
                  <div>
                    <div style={{ fontFamily:'var(--font-korean)', fontSize:14, fontWeight:700, color:'var(--white)', marginBottom:2 }}>{title}</div>
                    <div style={{ fontFamily:'var(--font-korean)', fontSize:12, color:'var(--gray-4)', lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className='pixel-btn pixel-btn-fire' style={{ flex:1 }} onClick={() => setStep(2)}>{t('app.setApiKey')}</button>
              <button className='pixel-btn' onClick={dismiss} style={{ fontSize:12, padding:'10px 14px' }}>{t('nextChapter.later')}</button>
            </div>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--text-off)', marginTop:10, textAlign:'center', letterSpacing:'0.06em' }}>
              {t('app.apiKeyNeeded')}
            </div>
          </div>
        ) : (
          /* Step 2: API 키 입력 */
          <div style={{ padding:'24px' }}>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--fire-amb)', letterSpacing:'0.1em', marginBottom:16 }}>► ANTHROPIC API KEY</div>
            <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)', lineHeight:1.7, marginBottom:16 }}>
              {t('app.apiKeyDescBefore')}<a href='https://console.anthropic.com/' target='_blank' rel='noreferrer'
                style={{ color:'var(--fire-org)', textDecoration:'underline' }}>console.anthropic.com</a>{t('app.apiKeyDescAfter')}<br />
              {t('app.apiKeyDescStored')}
            </div>
            <input
              ref={inputRef}
              type='password'
              className='pixel-input'
              placeholder='sk-ant-api03-...'
              value={key}
              onChange={(e) => { setKey(e.target.value); setErr('') }}
              onKeyDown={(e) => e.key === 'Enter' && saveKey()}
              style={{ marginBottom:6 }}
            />
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'#ff4444', minHeight:14, marginBottom:14 }}>{err}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className='pixel-btn' onClick={() => setStep(1)} style={{ fontSize:12, padding:'10px 14px' }}>{t('app.back')}</button>
              <button className='pixel-btn pixel-btn-fire' style={{ flex:1 }} onClick={saveKey}>{t('app.saveAndStart')}</button>
            </div>
            <div style={{ marginTop:10, textAlign:'center' }}>
              <button onClick={dismiss}
                style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--text-off)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.06em', textDecoration:'underline' }}>
                {t('app.browseNoKey')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Splash Screen (auth resolving) ─────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
    }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 24, color: 'var(--fire-tip)', letterSpacing: '0.06em' }}>
        {t('brand.name')}
      </div>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.2em' }}>
        ···
      </div>
    </div>
  )
}

// ── Login Gate ─────────────────────────────────────────────────────────────
function LoginGate({ onGuest }: { onGuest: () => void }) {
  const [loading, setLoading] = useState<'apple' | 'google' | null>(null)

  async function handleAppleLogin() {
    setLoading('apple')
    try { await signInWithApple() } catch { /* OAuth popup handles errors */ } finally { setLoading(null) }
  }
  async function handleLogin() {
    setLoading('google')
    try { await signInWithGoogle() } catch { /* OAuth popup handles errors */ } finally { setLoading(null) }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <PixelStars />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 26, color: 'var(--fire-tip)', letterSpacing: '0.06em', marginBottom: 6 }}>
            {t('brand.name')}
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.15em' }}>
            TADAK-TADAK
          </div>
        </div>
        <div className='bonfire-scene' style={{ position: 'relative' }}>
          <FlameAnimation level={3} />
          <div className='pixel-ground' />
        </div>
        <div style={{ fontFamily: 'var(--font-korean)', fontSize: 14, color: 'var(--gray-4)', textAlign: 'center', lineHeight: 1.8 }}>
          {t('app.loginTagline1')}<br />{t('app.loginTagline2')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12, width: 240, maxWidth: '80vw' }}>
          <button
            onClick={handleAppleLogin}
            disabled={loading !== null}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              minHeight: 44, padding: '12px 20px',
              background: '#fff', color: '#000',
              border: '2px solid #fff', cursor: 'pointer',
              fontFamily: 'var(--font-korean)', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em',
              opacity: loading !== null ? 0.6 : 1,
            }}
          >
            {loading === 'apple' ? t('app.loggingIn') : (
              <>
                <svg width='15' height='18' viewBox='0 0 17 20' fill='#000' aria-hidden='true' style={{ flexShrink: 0 }}>
                  <path d='M14.06 10.6c-.02-2.06 1.68-3.05 1.76-3.1-0.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.03 8.23.69.99 1.5 2.1 2.57 2.06 1.03-.04 1.42-.66 2.67-.66 1.24 0 1.6.66 2.69.64 1.11-.02 1.81-1 2.49-2 .78-1.15 1.1-2.26 1.12-2.32-.02-.01-2.15-.82-2.17-3.25zM12.01 4.5c.57-.69.95-1.65.85-2.6-.82.03-1.81.54-2.4 1.23-.53.61-.99 1.59-.87 2.52.91.07 1.85-.46 2.42-1.15z'/>
                </svg>
                {t('app.startApple')}
              </>
            )}
          </button>
          <button
            className='pixel-btn pixel-btn-fire'
            onClick={handleLogin}
            disabled={loading !== null}
            style={{ minHeight: 44, fontSize: 14, padding: '12px 20px', letterSpacing: '0.04em' }}
          >
            {loading === 'google' ? t('app.loggingIn') : t('app.startGoogle')}
          </button>
          <button
            onClick={onGuest}
            disabled={loading !== null}
            style={{
              background: 'none', border: '1px solid var(--gray-2)',
              color: 'var(--gray-4)', cursor: 'pointer',
              fontFamily: 'var(--font-pixel)', fontSize: 12, letterSpacing: '0.08em',
              padding: '10px 18px', minHeight: 44,
            }}
          >
            {t('app.browseNoLogin')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Guest Mode Banner ───────────────────────────────────────────────────────
function GuestBanner() {
  const [loading, setLoading] = useState(false)
  async function handleLogin() {
    setLoading(true)
    try { await signInWithGoogle() } catch { /* OAuth popup handles errors */ } finally { setLoading(false) }
  }
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 7000,
      background: '#140a02', borderTop: '2px solid var(--fire-org)',
      padding: '8px max(12px, env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right))',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>👀</span>
      <span style={{
        fontFamily: 'var(--font-korean)', fontSize: 14, color: 'var(--gray-4)',
        lineHeight: 1.4, flex: 1, wordBreak: 'keep-all',
      }}>
        {t('app.guestBanner')}
      </span>
      <button
        onClick={handleLogin}
        disabled={loading}
        className='pixel-btn pixel-btn-fire'
        style={{ fontSize: 12, padding: '7px 12px', flexShrink: 0, letterSpacing: '0.06em' }}
      >
        {loading ? '...' : t('app.login')}
      </button>
    </div>
  )
}

// ── Guest Blocked Toast (게스트가 막힌 동작을 시도했을 때) ───────────────────
function GuestBlockedToast() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function onBlocked() {
      setVisible(true)
      clearTimeout(timer)
      timer = setTimeout(() => setVisible(false), 5000)
    }
    window.addEventListener('guest-blocked', onBlocked)
    return () => { window.removeEventListener('guest-blocked', onBlocked); clearTimeout(timer) }
  }, [])

  if (!visible) return null
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, background: '#1a0500', border: '2px solid var(--fire-org)',
      boxShadow: 'inset 0 0 0 1px var(--fire-org)',
      padding: '12px 18px', maxWidth: 360, width: 'calc(100% - 32px)', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.08em', marginBottom: 6 }}>
        {t('app.guestToastTitle')}
      </div>
      <div style={{ fontFamily: 'var(--font-korean)', fontSize: 14, color: '#ccc', lineHeight: 1.6, wordBreak: 'keep-all' }}>
        {t('app.guestToastBody1')}<br />{t('app.guestToastBody2')}
      </div>
    </div>
  )
}

// ── Cloud Sync Banner (첫 백업/마이그레이션 진행 표시 · 비차단) ──────────────
function SyncBanner() {
  const [state, setState] = useState<{ done: number; total: number; complete: boolean } | null>(null)
  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout>
    function onSync(e: Event) {
      const d = (e as CustomEvent).detail as { phase: string; done?: number; total?: number; success?: boolean }
      if (d.phase === 'start') {
        clearTimeout(hideTimer)
        setState({ done: 0, total: d.total ?? 0, complete: false })
      } else if (d.phase === 'progress') {
        setState((s) => s ? { ...s, done: d.done ?? s.done, total: d.total ?? s.total } : s)
      } else if (d.phase === 'done') {
        if (d.success) {
          setState((s) => ({ done: s?.done ?? 0, total: s?.total ?? 0, complete: true }))
          hideTimer = setTimeout(() => setState(null), 2200)  // "백업 완료" 잠깐 표시 후 사라짐
        } else {
          setState(null)  // 실패는 조용히 사라짐 → 다음 기회에 재시도
        }
      }
    }
    window.addEventListener('tadak-sync', onSync)
    return () => { window.removeEventListener('tadak-sync', onSync); clearTimeout(hideTimer) }
  }, [])

  if (!state) return null
  const pct = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9997, background: '#140a02', border: '2px solid var(--fire-org)',
      boxShadow: 'inset 0 0 0 1px var(--fire-org)',
      padding: '10px 16px', width: 'calc(100% - 32px)', maxWidth: 360, textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.06em', marginBottom: state.complete ? 0 : 7 }}>
        {state.complete ? t('app.backupDone') : t('app.backingUp')}
      </div>
      {!state.complete && state.total > 0 && (
        <>
          <div style={{ height: 6, background: '#2a1500', border: '1px solid var(--gray-2)' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--fire-org)', transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--gray-4)', marginTop: 6, letterSpacing: '0.06em' }}>
            {state.done} / {state.total}
          </div>
        </>
      )}
    </div>
  )
}

// ── IAP Init ──────────────────────────────────────────────────────────────
import { initIAP } from '@/services/iap/iap-service'

// ── Auth + Paywall + Data Sync ────────────────────────────────────────────
import { createContext, useCallback, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import { onAuthStateChange, signInWithGoogle, signInWithApple, handleOAuthDeepLink } from '@/services/auth/auth-service'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { syncUserData, fetchUsageStatus, type UsageStatus } from '@/services/api/api-client'
import { syncOnLogin } from '@/services/sync/sync-service'
import { PaywallModal } from '@/components/ui/PaywallModal'
import { QuotaExceededError } from '@/services/claude/claude-service'
import { PixelStars } from '@/components/ui/PixelStars'
import { FlameAnimation } from '@/features/bonfire/FlameAnimation'
import { isGuest as readGuest, setGuest } from '@/services/guest/guest-mode'

interface AppContextValue {
  user: User | null
  showPaywall: (source?: 'quota' | 'subscribe') => void
  usageStatus: UsageStatus | null
  refreshUsage: () => Promise<void>
  openDrawer: () => void
}
const AppContext = createContext<AppContextValue>({
  user: null,
  showPaywall: () => {},
  usageStatus: null,
  refreshUsage: async () => {},
  openDrawer: () => {},
})
export function useAppContext() { return useContext(AppContext) }

// ── Data sync overlay ─────────────────────────────────────────────────────
function SyncOverlay() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-tip)', letterSpacing: '0.08em' }}>{t('app.syncing')}</div>
      <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-4)' }}>{t('app.syncingBody')}</div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [paywallSource, setPaywallSource] = useState<'quota' | 'subscribe'>('quota')
  const [syncing, setSyncing]         = useState(false)
  const [usageStatus, setUsageStatus] = useState<UsageStatus | null>(null)
  const [drawerOpen, setDrawerOpen]   = useState(false)
  const [guest, setGuestState]        = useState<boolean>(() => readGuest())

  function enterGuest() { setGuest(true); setGuestState(true) }

  useEffect(() => { initIAP().catch(console.error) }, [])

  // 네이티브 OAuth 딥링크 수신 (com.tadaktadak.app://login-callback)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const subPromise = CapApp.addListener('appUrlOpen', ({ url }) => {
      handleOAuthDeepLink(url).catch(console.error)
    })
    return () => { subPromise.then((s) => s.remove()) }
  }, [])

  const refreshUsage = useCallback(async () => {
    if (!import.meta.env.VITE_API_URL) return
    try { setUsageStatus(await fetchUsageStatus()) } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChange(async (newUser) => {
      const prevUser = user
      setUser(newUser)
      setAuthLoading(false)

      // 로그인하면 게스트 데모 데이터는 사라지고 실제 사용자 데이터로 전환
      if (newUser && readGuest()) { setGuest(false); setGuestState(false) }

      // 클라우드 동기화(일기/등장인물) — supabase-js 직결, 백그라운드. 실패해도 로컬은 그대로.
      if (newUser && !readGuest()) { void syncOnLogin() }

      if (newUser && import.meta.env.VITE_API_URL) {
        // First login: sync local data to server
        if (!prevUser) {
          setSyncing(true)
          try { await syncUserData(newUser) } catch { /* non-fatal */ } finally { setSyncing(false) }
        }
        // Fetch usage for logged-in user
        try { setUsageStatus(await fetchUsageStatus()) } catch { /* ignore */ }
      } else if (!newUser) {
        setUsageStatus(null)
      }
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Global error boundary for QuotaExceededError
  useEffect(() => {
    function onUnhandled(e: PromiseRejectionEvent) {
      if (e.reason instanceof QuotaExceededError) {
        e.preventDefault()
        setPaywallSource('quota')
        setPaywallOpen(true)
      }
    }
    window.addEventListener('unhandledrejection', onUnhandled)
    return () => window.removeEventListener('unhandledrejection', onUnhandled)
  }, [])

  function showPaywall(source: 'quota' | 'subscribe' = 'quota') {
    setPaywallSource(source)
    setPaywallOpen(true)
  }

  if (authLoading) return <SplashScreen />
  if (!user && !guest) return <LoginGate onGuest={enterGuest} />

  return (
    <AppContext.Provider value={{ user, showPaywall, usageStatus, refreshUsage, openDrawer: () => setDrawerOpen(true) }}>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {!guest && <OnboardingModal />}
      <QuotaToast />
      {!guest && <InstallBanner />}
      {guest && <GuestBanner />}
      {guest && <GuestBlockedToast />}
      {!guest && <SyncBanner />}
      {syncing && <SyncOverlay />}
      {import.meta.env.VITE_PAYMENT_ENABLED === 'true' && paywallOpen && <PaywallModal user={user} source={paywallSource} onClose={() => setPaywallOpen(false)} />}
      {drawerOpen && <DrawerPopup onClose={() => setDrawerOpen(false)} />}
      <Routes>
        <Route path='/' element={<BonfirePage />} />
        <Route path='/diary' element={<DiaryPage />} />
        <Route path='/timeline' element={<TimelinePage />} />
        <Route path='/style-ref' element={<StyleRefPage />} />
        <Route path='/novel' element={<NovelPage />} />
        <Route path='/past-self' element={<PastSelfPage />} />
        <Route path='/character-dex' element={<CharacterDexPage />} />
        <Route path='/story' element={<StoryPage />} />
        <Route path='/next-chapter' element={<NextChapterPage />} />
      </Routes>
    </BrowserRouter>
    </AppContext.Provider>
  )
}
