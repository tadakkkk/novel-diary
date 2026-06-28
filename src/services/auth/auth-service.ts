// ── Supabase Auth Service ─────────────────────────────────────────────────
import { createClient, type User } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const isNative = Capacitor.isNativePlatform()

// iOS 네이티브에서 돌아오는 커스텀 스킴 (Info.plist CFBundleURLTypes와 일치해야 함)
const NATIVE_REDIRECT = 'com.tadaktadak.app://login-callback'

export const supabase = supabaseUrl && supabaseAnon
  ? createClient(supabaseUrl, supabaseAnon, {
      auth: {
        // PKCE: 네이티브 딥링크 OAuth에 안정적. 웹도 동일하게 동작.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        // 웹은 리다이렉트 URL에서 자동으로 세션을 감지/교환.
        // 네이티브는 webview 초기 URL에 코드가 없으므로 수동 교환(handleOAuthDeepLink).
        detectSessionInUrl: !isNative,
      },
    })
  : null

// ── Google login ──────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')

  if (isNative) {
    // 네이티브: 커스텀 스킴으로 리다이렉트하고 인앱 브라우저(SFSafariViewController)에서 진행
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
    })
    if (error) throw error
    if (data?.url) await Browser.open({ url: data.url })
    return
  }

  // 웹: 기존 방식 유지
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
  })
  if (error) throw error
}

// ── Native deep-link callback handler ───────────────────────────────────────
// appUrlOpen 으로 들어온 com.tadaktadak.app://login-callback?code=... 를 처리.
export async function handleOAuthDeepLink(url: string): Promise<void> {
  if (!supabase) return
  if (!url.includes('login-callback')) return
  try {
    // PKCE: ?code=... (쿼리), implicit fallback: #access_token=... (프래그먼트)
    const queryStr = url.includes('?') ? url.split('?')[1].split('#')[0] : ''
    const code = new URLSearchParams(queryStr).get('code')
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } else {
      const hash = url.split('#')[1] ?? ''
      const params = new URLSearchParams(hash)
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error
      }
    }
  } finally {
    // 인앱 브라우저 닫기 (네이티브에서만 열려 있음)
    try { await Browser.close() } catch { /* 이미 닫혔으면 무시 */ }
  }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
}

export async function getUser(): Promise<User | null> {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getSession() {
  if (!supabase) return null
  // ── [임시 진단] 원래는 에러를 삼키지만, 진단 위해 노출 ──────────────────
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw new Error('GET_SESSION_ERR: ' + error.message)
    return session
  } catch (e) {
    throw new Error('GET_SESSION_THROW: ' + (e as Error).message)
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!supabase) return () => {}
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}
