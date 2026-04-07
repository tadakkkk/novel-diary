import { useEffect, useRef } from 'react'
import { type FlameLevel } from '@/types'

// ── Constants (bonfire.js 동일) ────────────────────────────────────────────
const PIXEL_SIZE = 10
const COLS = 7
const FIRE_ROWS = 10
const LOG_ROWS = 2
const CANVAS_W = COLS * PIXEL_SIZE       // 70
const CANVAS_H = (FIRE_ROWS + LOG_ROWS) * PIXEL_SIZE  // 120
const FRAME_MS = 220

const FIRE_COLORS: (string | null)[] = [
  null,       // 0: transparent
  '#1a0500',  // 1: near-black coal
  '#6b1a00',  // 2: dark ember
  '#c43a00',  // 3: deep orange-red
  '#ff5a00',  // 4: bright orange
  '#ffaa00',  // 5: amber
  '#ffe680',  // 6: yellow tip
  '#4a1e00',  // 7: wood log
  '#2d0f00',  // 8: dark log edge
]

const FIRE_FRAMES: number[][][] = [
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

const LOG_DATA: number[][] = [
  [8,7,7,7,7,7,8],
  [8,7,7,7,7,7,8],
]

function renderFrame(ctx: CanvasRenderingContext2D, idx: number) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
  const frame = FIRE_FRAMES[idx]
  for (let r = 0; r < FIRE_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ci = frame[r][c]
      if (ci === 0) continue
      ctx.fillStyle = FIRE_COLORS[ci]!
      ctx.fillRect(c * PIXEL_SIZE, r * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    }
  }
  for (let r = 0; r < LOG_ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ci = LOG_DATA[r][c]
      ctx.fillStyle = FIRE_COLORS[ci]!
      ctx.fillRect(c * PIXEL_SIZE, (FIRE_ROWS + r) * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    }
  }
}

// ── FlameLevel → CSS scale (bonfire.js 동일: 0.55 → 1.00) ────────────────
function levelToScale(level: FlameLevel): number {
  return 0.55 + level * 0.09
}

interface Props {
  level: FlameLevel
}

export function FlameAnimation({ level }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    renderFrame(ctx, 0)

    const id = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % FIRE_FRAMES.length
      renderFrame(ctx, frameRef.current)
    }, FRAME_MS)

    return () => clearInterval(id)
  }, [])

  const scale = levelToScale(level)

  return (
    <div
      className='fire-canvas-wrap'
      style={{ transform: `scale(${scale})` }}
    >
      <canvas ref={canvasRef} className='fire-canvas' />
    </div>
  )
}
