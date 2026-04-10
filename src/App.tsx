import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import * as storage from '@/services/storage'

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
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-tip)', letterSpacing: '0.08em', marginBottom: 3 }}>
          홈 화면에 추가하기
        </div>
        <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', lineHeight: 1.5 }}>
          앱처럼 설치하면 더 편하게 사용할 수 있어요
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={handleInstall}
          className='pixel-btn pixel-btn-fire'
          style={{ fontSize: 9, padding: '8px 12px' }}
        >
          설치
        </button>
        <button
          onClick={handleDismiss}
          className='pixel-btn'
          style={{ fontSize: 9, padding: '8px 10px' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
import BonfirePage from './pages/BonfirePage'
import DiaryPage from './pages/DiaryPage'
import TimelinePage from './pages/TimelinePage'
import StyleRefPage from './pages/StyleRefPage'
import NovelPage from './pages/NovelPage'

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
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: 'var(--fire-tip)', letterSpacing: '0.1em', marginBottom: 6 }}>
        ⚠ 저장 공간 부족
      </div>
      <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: '#ccc', lineHeight: 1.6 }}>
        브라우저 저장 공간이 꽉 찼어요.<br />
        오래된 일기나 문체 참고를 삭제하면 공간이 확보됩니다.
      </div>
      <button onClick={() => setVisible(false)}
        style={{ marginTop: 10, fontFamily: 'var(--font-pixel)', fontSize: 9, background: 'transparent', border: '1px solid #555', color: '#888', padding: '4px 10px', cursor: 'pointer' }}>
        닫기
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
    if (!trimmed.startsWith('sk-ant-')) { setErr('올바른 Anthropic API 키 형식이 아니에요 (sk-ant-로 시작)'); return }
    storage.saveApiKey(trimmed)
    dismiss()
  }

  if (!open) return null

  return (
    <div style={{ position:'fixed', inset:0, zIndex:8000, background:'rgba(0,0,0,0.96)', display:'flex', alignItems:'center', justifyContent:'center', padding:'24px 16px' }}>
      <div style={{ width:'100%', maxWidth:480, background:'#000', border:'3px solid var(--white)', boxShadow:'inset 0 0 0 2px var(--white), inset 0 0 0 5px #000' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'2px solid var(--gray-2)' }}>
          <div style={{ fontFamily:'var(--font-pixel)', fontSize:18, color:'var(--fire-tip)', letterSpacing:'0.06em', marginBottom:6 }}>🔥 타닥타닥</div>
          <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)', lineHeight:1.7 }}>
            일상의 사건을 소설 문체의 일기로 변환해주는 앱이에요.
          </div>
        </div>

        {step === 1 ? (
          /* Step 1: 소개 */
          <div style={{ padding:'24px' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:28 }}>
              {[
                ['🪵', '땔감 입력', '오늘 있었던 일을 조각조각 던지세요'],
                ['✍️', '일기 생성', 'Claude AI가 소설 문체로 일기를 써줘요'],
                ['▒', '나의 이야기', '쌓인 일기를 한 권의 책으로 엮어 봐요'],
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
              <button className='pixel-btn pixel-btn-fire' style={{ flex:1 }} onClick={() => setStep(2)}>▸ API 키 설정하기</button>
              <button className='pixel-btn' onClick={dismiss} style={{ fontSize:9, padding:'10px 14px' }}>나중에</button>
            </div>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:7, color:'var(--text-off)', marginTop:10, textAlign:'center', letterSpacing:'0.06em' }}>
              Claude API 키가 있어야 일기를 생성할 수 있어요
            </div>
          </div>
        ) : (
          /* Step 2: API 키 입력 */
          <div style={{ padding:'24px' }}>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--fire-amb)', letterSpacing:'0.1em', marginBottom:16 }}>► ANTHROPIC API KEY</div>
            <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)', lineHeight:1.7, marginBottom:16 }}>
              <a href='https://console.anthropic.com/' target='_blank' rel='noreferrer'
                style={{ color:'var(--fire-org)', textDecoration:'underline' }}>console.anthropic.com</a>에서
              발급받은 API 키를 입력해주세요.<br />
              키는 이 기기의 브라우저에만 저장되며 외부로 전송되지 않아요.
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
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:7, color:'#ff4444', minHeight:14, marginBottom:14 }}>{err}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className='pixel-btn' onClick={() => setStep(1)} style={{ fontSize:9, padding:'10px 14px' }}>◀ 뒤로</button>
              <button className='pixel-btn pixel-btn-fire' style={{ flex:1 }} onClick={saveKey}>▸ 저장하고 시작하기</button>
            </div>
            <div style={{ marginTop:10, textAlign:'center' }}>
              <button onClick={dismiss}
                style={{ fontFamily:'var(--font-pixel)', fontSize:7, color:'var(--text-off)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.06em', textDecoration:'underline' }}>
                키 없이 둘러보기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Auth + Paywall context ────────────────────────────────────────────────
import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import { onAuthStateChange } from '@/services/auth/auth-service'
import { PaywallModal } from '@/components/ui/PaywallModal'
import { QuotaExceededError } from '@/services/claude/claude-service'

interface AppContextValue {
  user: User | null
  showPaywall: () => void
}
const AppContext = createContext<AppContextValue>({ user: null, showPaywall: () => {} })
export function useAppContext() { return useContext(AppContext) }

// ── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChange(setUser)
    return unsub
  }, [])

  // Global error boundary for QuotaExceededError
  useEffect(() => {
    function onUnhandled(e: PromiseRejectionEvent) {
      if (e.reason instanceof QuotaExceededError) {
        e.preventDefault()
        setPaywallOpen(true)
      }
    }
    window.addEventListener('unhandledrejection', onUnhandled)
    return () => window.removeEventListener('unhandledrejection', onUnhandled)
  }, [])

  return (
    <AppContext.Provider value={{ user, showPaywall: () => setPaywallOpen(true) }}>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <OnboardingModal />
      <QuotaToast />
      <InstallBanner />
      {paywallOpen && <PaywallModal isLoggedIn={!!user} onClose={() => setPaywallOpen(false)} />}
      <Routes>
        <Route path='/' element={<BonfirePage />} />
        <Route path='/diary' element={<DiaryPage />} />
        <Route path='/timeline' element={<TimelinePage />} />
        <Route path='/style-ref' element={<StyleRefPage />} />
        <Route path='/novel' element={<NovelPage />} />
      </Routes>
    </BrowserRouter>
    </AppContext.Provider>
  )
}
