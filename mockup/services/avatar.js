'use strict'
// ── 타닥타닥 SD 픽셀 아바타 생성기 (16×24 → 32×48 canvas) ─────────────────────
const AvatarGenerator = (() => {
  const PX = 2        // canvas px per logical pixel
  const W  = 16
  const H  = 24
  const CW = W * PX   // 32
  const CH = H * PX   // 48

  // ── Type codes ────────────────────────────────────────────────────────────
  // 0=bg  1=hair  2=skin  3=eyeW  4=iris  5=mouth  6=top  7=bottom

  // ── Shared body rows 10-23 ────────────────────────────────────────────────
  const BODY = [
    [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],  // 10 shoulders
    [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],  // 11 chest
    [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],  // 12
    [0,0,6,6,6,6,6,6,6,6,6,6,0,0,0,0],  // 13
    [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],  // 14 waist
    [0,0,0,7,7,7,7,7,7,7,7,0,0,0,0,0],  // 15 hips
    [0,0,0,7,7,7,7,7,7,7,7,0,0,0,0,0],  // 16 pants
    [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],  // 17 legs
    [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],  // 18
    [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],  // 19
    [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],  // 20
    [0,0,0,0,7,7,0,0,7,7,0,0,0,0,0,0],  // 21
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // 22
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],  // 23
  ]

  // ── 5 Hair styles (rows 0-9 each) ─────────────────────────────────────────
  const HEADS = [
    // ── 0: Short (짧은 머리) ─────────────────────────────────────────────────
    [
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],  // 0
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],  // 1
      [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],  // 2
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 3
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 4
      [0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,0],  // 5 eyes
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 6
      [0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],  // 7 mouth
      [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],  // 8 chin
      [0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0],  // 9 neck
    ],
    // ── 1: Long (긴 머리) — side hair extends to chest ───────────────────────
    [
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],  // 0
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],  // 1
      [0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0],  // 2
      [0,1,1,1,2,2,2,2,2,2,2,2,1,1,1,0],  // 3 wide
      [0,1,1,1,2,2,2,2,2,2,2,2,1,1,1,0],  // 4
      [0,1,1,1,2,3,4,2,2,3,4,2,1,1,1,0],  // 5 eyes
      [0,1,1,0,2,2,2,2,2,2,2,2,0,1,1,0],  // 6
      [0,1,1,0,2,2,5,5,2,2,2,2,0,1,1,0],  // 7 mouth
      [0,1,1,0,1,2,2,2,2,2,1,0,0,1,1,0],  // 8 chin
      [0,1,1,0,0,2,2,2,2,0,0,0,0,1,1,0],  // 9 neck
    ],
    // ── 2: Curly (곱슬) ──────────────────────────────────────────────────────
    [
      [0,0,1,0,1,1,1,1,1,1,1,0,1,0,0,0],  // 0 bumpy crown
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],  // 1 wide
      [0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],  // 2
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],  // 3 wide curly sides
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 4
      [0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,0],  // 5 eyes
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 6
      [0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],  // 7 mouth
      [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],  // 8 chin
      [0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0],  // 9 neck
    ],
    // ── 3: Bob (단발) ────────────────────────────────────────────────────────
    [
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],  // 0
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],  // 1
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],  // 2 blunt cut (same width)
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],  // 3 bob frames face
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],  // 4
      [0,0,1,1,2,3,4,2,2,3,4,2,1,1,0,0],  // 5 eyes
      [0,0,1,1,2,2,2,2,2,2,2,2,1,1,0,0],  // 6
      [0,0,1,1,2,2,5,5,2,2,2,2,1,1,0,0],  // 7 mouth
      [0,0,1,1,1,2,2,2,2,2,1,1,1,0,0,0],  // 8 bob bottom
      [0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0],  // 9 neck
    ],
    // ── 4: Ponytail (포니테일) ────────────────────────────────────────────────
    [
      [0,0,0,0,1,1,1,1,1,1,0,0,1,0,0,0],  // 0 ponytail tip
      [0,0,0,1,1,1,1,1,1,1,0,1,1,0,0,0],  // 1 ponytail start
      [0,0,0,1,1,1,1,1,1,0,0,0,1,1,0,0],  // 2 ponytail
      [0,0,0,1,2,2,2,2,2,2,2,2,0,1,1,0],  // 3
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,1,1],  // 4
      [0,0,0,1,2,3,4,2,2,3,4,2,1,0,0,1],  // 5 eyes
      [0,0,0,1,2,2,2,2,2,2,2,2,1,0,0,0],  // 6
      [0,0,0,1,2,2,5,5,2,2,2,2,1,0,0,0],  // 7 mouth
      [0,0,0,0,1,2,2,2,2,2,1,0,0,0,0,0],  // 8 chin
      [0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0],  // 9 neck
    ],
  ]

  // Long hair body override (rows 10-13 get side hair)
  const LONG_BODY_OVERRIDE = [
    [0,1,1,6,6,6,6,6,6,6,6,0,0,1,1,0],  // 10
    [0,1,6,6,6,6,6,6,6,6,6,6,0,1,1,0],  // 11
    [0,0,1,6,6,6,6,6,6,6,6,6,1,1,0,0],  // 12
    [0,0,0,6,6,6,6,6,6,6,6,0,0,0,0,0],  // 13 (hair ends here)
  ]

  // ── Build full 24-row sprite for a given style ────────────────────────────
  function buildSprite(styleIdx) {
    const head = HEADS[styleIdx]
    const body = styleIdx === 1
      ? [...LONG_BODY_OVERRIDE, ...BODY.slice(4)]
      : [...BODY]
    return [...head, ...body]
  }

  // ── Color palettes ────────────────────────────────────────────────────────
  const HAIR_COLORS  = ['#111111','#4a2800','#8b0000','#c8a820','#888888','#6b2fa0']
  // black, dark brown, dark red, blonde, gray, purple

  const TOP_COLORS   = ['#cc2222','#2244bb','#ccaa00','#226622','#cc5500','#662266','#1a1a1a']
  // red, blue, yellow, green, orange, purple, black

  const BOTTOM_COLORS = ['#cc2222','#2244bb','#ccaa00','#226622','#cc5500','#662266','#1a1a1a']

  const SKIN_TONES   = [
    { skin:'#ffd5aa', dark:'#e8b880' },
    { skin:'#d4956a', dark:'#bb7550' },
    { skin:'#c68642', dark:'#a06228' },
    { skin:'#8b5e3c', dark:'#6b3e22' },
  ]

  const EYE_COLORS   = ['#3d1f00','#4477cc','#336633','#667788','#7a5c2a']

  // ── Seed ↔ colors ─────────────────────────────────────────────────────────
  function colorsFromSeed(seed) {
    const s = Math.abs(seed >>> 0)
    const styleIdx  = s % 5
    const hairIdx   = (s >>> 3) % HAIR_COLORS.length
    const topIdx    = (s >>> 6) % TOP_COLORS.length
    // bottom must differ from top
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

  // ── Deterministic seed from name (fallback) ───────────────────────────────
  function seedFromName(name) {
    let h = 5381
    for (const c of String(name || 'x')) h = ((h << 5) + h) ^ c.charCodeAt(0)
    return Math.abs(h)
  }

  function generateSeed() {
    return Math.floor(Math.random() * 0xFFFFFF)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderSeed(canvas, seed) {
    canvas.width  = CW
    canvas.height = CH
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, CW, CH)

    const c = colorsFromSeed(seed)
    const sprite = buildSprite(c.styleIdx)

    const palette = {
      1: c.hair,
      2: c.skin,
      3: '#ffffff',
      4: c.eye,
      5: '#cc4444',
      6: c.top,
      7: c.bottom,
    }

    for (let row = 0; row < H; row++) {
      for (let col = 0; col < W; col++) {
        const t = sprite[row][col]
        if (!t || !palette[t]) continue
        ctx.fillStyle = palette[t]
        ctx.fillRect(col * PX, row * PX, PX, PX)
      }
    }

    // Subtle skin shadow on neck (code 2 in row 9 uses slightly darker)
    ctx.fillStyle = c.skinDk
    const neckRow = sprite[9]
    for (let col = 0; col < W; col++) {
      if (neckRow[col] === 2) {
        ctx.fillRect(col * PX, 9 * PX, PX, PX)
      }
    }
  }

  function render(canvas, character) {
    const seed = character?.avatarData?.seed
      ?? seedFromName(character?.name)
    renderSeed(canvas, seed)
  }

  function toDataUrl(character) {
    const canvas = document.createElement('canvas')
    render(canvas, character)
    return canvas.toDataURL()
  }

  return { render, renderSeed, toDataUrl, generateSeed, seedFromName, CW, CH }
})()
