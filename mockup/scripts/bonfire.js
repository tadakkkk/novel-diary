'use strict'

// ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_GENERATION_THRESHOLD = 3
const FLAME_THRESHOLDS = [0, 1, 2, 3, 5, 7]  // index = FlameLevel (0~5)
const FRAME_MS = 220  // ms per fire animation frame
const SESSION_ID = new Date().toISOString().slice(0, 10)

// ── Pixel Fire Canvas ────────────────────────────────────────────────────────
const PIXEL_SIZE = 10
const COLS = 7
const FIRE_ROWS = 10
const LOG_ROWS = 2
const CANVAS_W = COLS * PIXEL_SIZE      // 70
const CANVAS_H = (FIRE_ROWS + LOG_ROWS) * PIXEL_SIZE  // 120

const FIRE_COLORS = [
  null,        // 0: transparent
  '#1a0500',   // 1: near-black coal
  '#6b1a00',   // 2: dark ember
  '#c43a00',   // 3: deep orange-red
  '#ff5a00',   // 4: bright orange
  '#ffaa00',   // 5: amber
  '#ffe680',   // 6: yellow tip
  '#4a1e00',   // 7: wood log
  '#2d0f00',   // 8: dark log edge
]

const FIRE_FRAMES = [
  // Frame 1: steady center
  [[0,0,0,6,0,0,0],[0,0,5,5,4,0,0],[0,0,4,5,4,2,0],[0,2,4,5,4,3,0],
   [0,2,4,5,5,3,1],[1,3,4,5,5,4,2],[2,3,4,5,4,4,2],[2,3,4,4,4,3,2],
   [2,3,3,4,3,3,2],[1,2,3,3,3,2,1]],
  // Frame 2: lean left
  [[0,6,5,0,0,0,0],[0,5,5,4,2,0,0],[1,4,5,4,3,0,0],[2,4,5,5,3,2,0],
   [2,4,5,5,4,3,1],[2,4,5,5,5,4,2],[2,3,4,5,4,4,2],[2,3,4,4,4,3,2],
   [2,3,3,4,3,3,2],[1,2,3,3,3,2,1]],
  // Frame 3: lean right
  [[0,0,0,0,5,6,0],[0,0,2,4,5,5,0],[0,0,3,4,5,4,1],[0,2,3,5,5,4,2],
   [1,3,4,5,5,4,2],[2,4,5,5,5,4,2],[2,3,4,5,4,4,2],[2,3,4,4,4,3,2],
   [2,3,3,4,3,3,2],[1,2,3,3,3,2,1]],
  // Frame 4: tall — two tips
  [[0,0,6,0,6,0,0],[0,2,5,5,5,2,0],[0,3,5,5,5,3,0],[1,3,5,5,5,3,1],
   [2,4,5,5,5,4,2],[2,4,5,6,5,4,2],[2,4,4,5,4,4,2],[2,3,4,4,4,3,2],
   [2,3,3,4,3,3,2],[1,2,3,3,3,2,1]],
]

const LOG_DATA = [
  [8,7,7,7,7,7,8],
  [8,7,7,7,7,7,8],
]

let fireFrameIdx = 0
let fireAnimInterval = null

function initFireCanvas() {
  const canvas = document.getElementById('fire-canvas')
  if (!canvas) return
  canvas.width  = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false
  renderFireFrame(ctx, 0)
  fireAnimInterval = setInterval(() => {
    fireFrameIdx = (fireFrameIdx + 1) % FIRE_FRAMES.length
    renderFireFrame(ctx, fireFrameIdx)
  }, FRAME_MS)
}

function renderFireFrame(ctx, idx) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  const frame = FIRE_FRAMES[idx]
  for (let r = 0; r < FIRE_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ci = frame[r][c]
      if (ci === 0) continue
      ctx.fillStyle = FIRE_COLORS[ci]
      ctx.fillRect(c * PIXEL_SIZE, r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    }
  }
  for (let r = 0; r < LOG_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ci = LOG_DATA[r][c]
      ctx.fillStyle = FIRE_COLORS[ci]
      ctx.fillRect(c * PIXEL_SIZE, (FIRE_ROWS + r) * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    }
  }
}

// ── State ────────────────────────────────────────────────────────────────────
const state = { kindlings: [], flameLevel: 0 }

// ── Storage helpers ───────────────────────────────────────────────────────────
function storageSave() {
  if (typeof StorageService !== 'undefined') {
    StorageService.saveKindlings(SESSION_ID, state.kindlings)
  }
}

function storageLoad() {
  if (typeof StorageService !== 'undefined') {
    return StorageService.getKindlings(SESSION_ID) || []
  }
  return []
}

// ── Flame Level ───────────────────────────────────────────────────────────────
function calcFlameLevel(count) {
  let level = 0
  for (let i = FLAME_THRESHOLDS.length - 1; i >= 0; i--) {
    if (count >= FLAME_THRESHOLDS[i]) { level = i; break }
  }
  return Math.min(level, 5)
}

function updateFlameUI(level) {
  const gaugeBar = document.getElementById('gauge-bar')
  if (gaugeBar) {
    gaugeBar.textContent = '█'.repeat(level) + '░'.repeat(5 - level)
  }

  const wrap = document.querySelector('.fire-canvas-wrap')
  if (wrap) {
    const scale = 0.55 + level * 0.09   // 0.55 → 1.00
    wrap.style.transform = `scale(${scale})`
  }

  const genWrap = document.querySelector('.generate-btn-wrap')
  if (genWrap) {
    genWrap.classList.toggle('visible', state.kindlings.length >= DEFAULT_GENERATION_THRESHOLD)
  }

  const hint = document.getElementById('threshold-hint')
  if (hint) {
    const rem = DEFAULT_GENERATION_THRESHOLD - state.kindlings.length
    hint.textContent = rem > 0
      ? `땔감 ${rem}개 더 필요해요`
      : `► 일기 생성 가능`
    hint.style.color = rem <= 0 ? 'var(--fire-tip)' : 'var(--text-dim)'
  }
}

function updateCounter() {
  const count = state.kindlings.length
  document.querySelectorAll('.kindling-count-display').forEach(el => {
    el.textContent = count
  })
  const empty = document.getElementById('empty-state')
  if (empty) empty.style.display = count > 0 ? 'none' : 'flex'
}

// ── Kindling CRUD ─────────────────────────────────────────────────────────────
function addKindling(text) {
  if (!text.trim()) return
  const k = {
    id: 'k' + Date.now(),
    text: text.trim(),
    order: state.kindlings.length,
    createdAt: new Date().toISOString(),
  }
  state.kindlings.push(k)
  renderKindlingItem(k, true)
  state.flameLevel = calcFlameLevel(state.kindlings.length)
  updateFlameUI(state.flameLevel)
  updateCounter()
  storageSave()
}

function removeKindling(id) {
  state.kindlings = state.kindlings.filter(k => k.id !== id)
  document.getElementById('kindling-' + id)?.remove()
  // Re-number remaining items
  const items = document.querySelectorAll('#kindling-list .kindling-item .k-num')
  items.forEach((el, i) => { el.textContent = String(i + 1).padStart(2, '0') })
  state.flameLevel = calcFlameLevel(state.kindlings.length)
  updateFlameUI(state.flameLevel)
  updateCounter()
  storageSave()
}

function renderKindlingItem(k, animate) {
  const list = document.getElementById('kindling-list')
  if (!list) return
  const el = document.createElement('div')
  el.id = 'kindling-' + k.id
  el.className = 'kindling-item pixel-border-dim' + (animate ? '' : ' visible')
  el.innerHTML = `
    <span class="k-num">${String(state.kindlings.indexOf(k) + 1).padStart(2, '0')}</span>
    <span class="k-text">${escapeHtml(k.text)}</span>
    <button class="k-del pixel-btn-sm pixel-btn" onclick="removeKindling('${k.id}')" title="삭제">✕</button>
  `
  list.appendChild(el)
  if (animate) requestAnimationFrame(() => el.classList.add('visible'))
}

// ── Pixel Particles ───────────────────────────────────────────────────────────
function spawnPixelParticles(x, y) {
  const colors = ['#ffe680','#ffaa00','#ff5a00','#ff8c00','#ffffff']
  for (let i = 0; i < 10; i++) {
    const el = document.createElement('div')
    const vx = ((Math.random() - 0.5) * 80).toFixed(0)
    const vy = (-(Math.random() * 70 + 20)).toFixed(0)
    el.style.cssText = [
      'position:fixed',
      `left:${x}px`, `top:${y}px`,
      'width:6px', 'height:6px',
      `background:${colors[i % colors.length]}`,
      'image-rendering:pixelated',
      'pointer-events:none',
      'z-index:999',
      `animation:px-particle 0.55s steps(6) forwards`,
      `--vx:${vx}px`, `--vy:${vy}px`,
    ].join(';')
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 650)
  }
}

// ── Key Image ─────────────────────────────────────────────────────────────────
// 이미지를 canvas로 리사이즈 + JPEG 압축해서 localStorage 한도 내로 맞춤
function compressImage(file, maxPx, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        // 긴 쪽이 maxPx 초과하면 비율 유지하며 축소
        let w = img.width, h = img.height
        if (w > maxPx || h > maxPx) {
          if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx }
          else        { w = Math.round(w * maxPx / h); h = maxPx }
        }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        const dataUrl    = canvas.toDataURL('image/jpeg', quality)
        const base64Data = dataUrl.split(',')[1]
        resolve({ mediaType: 'image/jpeg', base64Data, dataUrl })
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function handleKeyImageUpload(input) {
  const file = input.files?.[0]
  if (!file) return

  console.log('[bonfire] 업로드 시작:', file.name, '/', (file.size / 1024).toFixed(0) + 'KB')

  // 최대 1024px, JPEG 0.82 품질로 압축 → 보통 150~400KB base64
  compressImage(file, 1024, 0.82)
    .then(imgObj => {
      console.log('[bonfire] 압축 완료 → base64 길이:', imgObj.base64Data.length, '(', (imgObj.base64Data.length / 1024).toFixed(0), 'KB)')

      // 미리보기 업데이트
      const prev = document.getElementById('key-image-preview')
      const ph   = document.getElementById('key-image-placeholder')
      const rm   = document.getElementById('key-image-remove')
      if (prev) { prev.src = imgObj.dataUrl; prev.style.display = 'block' }
      if (ph)   { ph.style.display = 'none' }
      if (rm)   { rm.style.display = 'block' }

      // 오래된 key-image 항목 정리 (오늘 것만 남김)
      const storageKey = 'tadak:key-image:' + SESSION_ID
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i)
        if (k && k.startsWith('tadak:key-image:') && k !== storageKey) {
          localStorage.removeItem(k)
          console.log('[bonfire] 정리:', k)
        }
      }

      // 저장 시도 — 실패 시 압축 강화 후 재시도, 최후엔 sessionStorage
      function trySave(obj, attempt) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(obj))
          console.log('[bonfire] ✅ localStorage 저장 성공 (시도', attempt, ') base64:', (obj.base64Data.length/1024).toFixed(0), 'KB')
        } catch (e) {
          if (e.name !== 'QuotaExceededError') { console.error('[bonfire] 저장 오류:', e); return }
          if (attempt === 1) {
            console.warn('[bonfire] 용량 부족 → 512px 0.65로 재압축')
            compressImage(file, 512, 0.65).then(s => trySave(s, 2)).catch(console.error)
          } else if (attempt === 2) {
            console.warn('[bonfire] 용량 부족 → sessionStorage로 전환')
            try {
              sessionStorage.setItem(storageKey, JSON.stringify(obj))
              console.log('[bonfire] ✅ sessionStorage 저장 성공')
            } catch (e2) {
              console.error('[bonfire] ❌ sessionStorage도 실패:', e2)
              alert('저장 공간이 부족합니다. 오래된 일기 데이터를 삭제해 주세요.')
            }
          }
        }
      }
      trySave(imgObj, 1)
    })
    .catch(err => console.error('[bonfire] ❌ 이미지 압축 실패:', err))
}

function removeKeyImage(event) {
  event.stopPropagation()
  const prev = document.getElementById('key-image-preview')
  const ph   = document.getElementById('key-image-placeholder')
  const rm   = document.getElementById('key-image-remove')
  const inp  = document.querySelector('.key-image-upload input[type="file"]')
  if (prev) { prev.src = ''; prev.style.display = 'none' }
  if (ph)   { ph.style.display = '' }
  if (rm)   { rm.style.display = 'none' }
  if (inp)  { inp.value = '' }
  localStorage.removeItem('tadak:key-image:' + SESSION_ID)
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initFireCanvas()

  // Restore kindlings from localStorage
  const saved = storageLoad()
  if (saved.length > 0) {
    state.kindlings = saved
    saved.forEach(k => renderKindlingItem(k, false))
    state.flameLevel = calcFlameLevel(state.kindlings.length)
    updateFlameUI(state.flameLevel)
    updateCounter()
  } else {
    updateFlameUI(0)
    updateCounter()
  }

  // Restore key image from localStorage
  if (typeof StorageService !== 'undefined') {
    const savedImg = StorageService.getKeyImage(SESSION_ID)
    if (savedImg) {
      const prev = document.getElementById('key-image-preview')
      const ph   = document.getElementById('key-image-placeholder')
      const rm   = document.getElementById('key-image-remove')
      if (prev) { prev.src = savedImg; prev.style.display = 'block' }
      if (ph)   { ph.style.display = 'none' }
      if (rm)   { rm.style.display = 'block' }
    }
  }

  // Kindling input
  const textarea = document.getElementById('kindling-input')
  const addBtn   = document.getElementById('kindling-add-btn')

  function doAdd() {
    const val = textarea?.value?.trim()
    if (!val) return
    const rect = addBtn?.getBoundingClientRect()
    if (rect) spawnPixelParticles(rect.left + rect.width / 2, rect.top)
    addKindling(val)
    textarea.value = ''
    textarea.focus()
  }

  addBtn?.addEventListener('click', doAdd)
  textarea?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); doAdd() }
  })

  // Generate button — pass session ID
  document.querySelectorAll('.generate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `diary.html?session=${encodeURIComponent(SESSION_ID)}`
    })
  })
})

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
