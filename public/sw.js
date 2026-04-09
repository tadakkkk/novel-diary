// 타닥타닥 Service Worker — cache-first for static assets, network-first for API
const CACHE = 'tadak-v3'
const PRECACHE = [self.registration.scope, self.registration.scope + 'index.html']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)

  // Anthropic API는 항상 네트워크
  if (url.hostname === 'api.anthropic.com') return

  // Google Fonts는 캐시 우선
  if (url.hostname.includes('fonts.')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit ?? fetch(e.request).then((res) => {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
        return res
      }))
    )
    return
  }

  // 앱 셸 (navigate 요청) → index.html 반환 (SPA 라우팅)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // 정적 자산: 캐시 우선, 없으면 네트워크 후 캐시 저장
  e.respondWith(
    caches.match(e.request).then((hit) => hit ?? fetch(e.request).then((res) => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, clone))
      }
      return res
    }))
  )
})
