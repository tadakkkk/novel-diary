// ── 픽셀 아바타 생성기 (avatar.js 포팅) ──────────────────────────────────

const PX = 2
const W  = 16
const H  = 24
export const CW = W * PX  // 32
export const CH = H * PX  // 48

const BODY: number[][] = [
  [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],
  [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],
  [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],
  [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],
  [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],
  [0,0,0,7,7,7,7,7,7,7,7,0,0,0,0,0],
  [0,0,0,7,7,7,7,7,7,7,7,0,0,0,0,0],
  [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],
  [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],
  [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],
  [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],
  [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
]

const HEADS: number[][][] = [
  [[0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],[0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],[0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0]],
  [[0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,1,1,1,2,2,2,2,2,2,2,2,1,1,1,0],[0,1,1,1,2,2,2,2,2,2,2,2,1,1,1,0],[0,1,1,1,2,3,4,2,2,3,4,2,1,1,1,0],[0,1,1,0,2,2,2,2,2,2,2,2,0,1,1,0],[0,1,1,0,2,2,5,5,2,2,2,2,0,1,1,0],[0,1,1,0,1,2,2,2,2,2,1,0,0,1,1,0],[0,1,1,0,0,2,2,2,2,0,0,0,0,1,1,0]],
  [[0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,0],[0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],[0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],[0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],[0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],[0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0]],
  [[0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],[0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],[0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],[0,0,1,1,2,3,4,2,2,3,4,2,1,1,0,0],[0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],[0,0,1,1,2,2,5,5,2,2,2,2,1,1,0,0],[0,0,1,1,1,2,2,2,2,2,1,1,1,0,0,0],[0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0]],
  [[0,0,0,0,1,1,1,1,1,1,0,0,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,0,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,0,0,0,1,1,0,0],[0,0,0,1,2,2,2,2,2,2,2,2,0,1,1,0],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,1,1],[0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,1],[0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],[0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],[0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],[0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0]],
]

const LONG_BODY_OVERRIDE: number[][] = [
  [0,1,1,6,6,6,6,6,6,6,6,0,0,1,1,0],
  [0,1,6,6,6,6,6,6,6,6,6,6,0,1,1,0],
  [0,0,1,6,6,6,6,6,6,6,6,6,1,1,0,0],
  [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],
]

const HAIR_COLORS   = ['#111111','#4a2800','#8b0000','#c8a820','#888888','#6b2fa0']
const TOP_COLORS    = ['#cc2222','#2244bb','#ccaa00','#226622','#cc5500','#662266','#1a1a1a']
const BOTTOM_COLORS = ['#cc2222','#2244bb','#ccaa00','#226622','#cc5500','#662266','#1a1a1a']
const SKIN_TONES    = [
  { skin:'#ffd5aa', dark:'#e8b880' },
  { skin:'#d4956a', dark:'#bb7550' },
  { skin:'#c68642', dark:'#a06228' },
  { skin:'#8b5e3c', dark:'#6b3e22' },
]
const EYE_COLORS = ['#3d1f00','#4477cc','#336633','#667788','#7a5c2a']

function buildSprite(styleIdx: number): number[][] {
  const head = HEADS[styleIdx]
  const body = styleIdx === 1 ? [...LONG_BODY_OVERRIDE, ...BODY.slice(4)] : [...BODY]
  return [...head, ...body]
}

function colorsFromSeed(seed: number) {
  const s = Math.abs(seed >>> 0)
  const styleIdx  = s % 5
  const hairIdx   = (s >>> 3) % HAIR_COLORS.length
  const topIdx    = (s >>> 6) % TOP_COLORS.length
  const bottomRaw = (s >>> 9) % (BOTTOM_COLORS.length - 1)
  const bottomIdx = bottomRaw >= topIdx ? bottomRaw + 1 : bottomRaw
  const skinIdx   = (s >>> 12) % SKIN_TONES.length
  const eyeIdx    = (s >>> 15) % EYE_COLORS.length
  return {
    styleIdx,
    hair:   HAIR_COLORS[hairIdx],
    skin:   SKIN_TONES[skinIdx].skin,
    skinDk: SKIN_TONES[skinIdx].dark,
    eye:    EYE_COLORS[eyeIdx],
    top:    TOP_COLORS[topIdx],
    bottom: BOTTOM_COLORS[bottomIdx],
  }
}

export function seedFromName(name: string): number {
  let h = 5381
  for (const c of String(name || 'x')) h = ((h << 5) + h) ^ c.charCodeAt(0)
  return Math.abs(h)
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 0xFFFFFF)
}

export function renderSeed(canvas: HTMLCanvasElement, seed: number): void {
  canvas.width  = CW
  canvas.height = CH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, CW, CH)

  const c      = colorsFromSeed(seed)
  const sprite = buildSprite(c.styleIdx)
  const palette: Record<number, string> = {
    1: c.hair, 2: c.skin, 3: '#ffffff', 4: c.eye, 5: '#cc4444', 6: c.top, 7: c.bottom,
  }

  for (let row = 0; row < H; row++) {
    for (let col = 0; col < W; col++) {
      const t = sprite[row][col]
      if (!t || !palette[t]) continue
      ctx.fillStyle = palette[t]
      ctx.fillRect(col * PX, row * PX, PX, PX)
    }
  }

  ctx.fillStyle = c.skinDk
  const neckRow = sprite[9]
  for (let col = 0; col < W; col++) {
    if (neckRow[col] === 2) ctx.fillRect(col * PX, 9 * PX, PX, PX)
  }
}

export interface CharacterForAvatar {
  name?: string
  avatarData?: { seed?: number }
}

export function render(canvas: HTMLCanvasElement, character: CharacterForAvatar): void {
  const seed = character?.avatarData?.seed ?? seedFromName(character?.name ?? '')
  renderSeed(canvas, seed)
}

export function toDataUrl(character: CharacterForAvatar): string {
  const canvas = document.createElement('canvas')
  render(canvas, character)
  return canvas.toDataURL()
}
