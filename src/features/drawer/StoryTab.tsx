import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import * as storage from '@/services/storage'
import { type SavedNovel } from '@/types'

// ── 픽셀 책 커버 (NovelPage와 동일 로직) ─────────────────────────────────
function PixelBookCover({ seed, w = 40, h = 60 }: { seed: number; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const SC = 2
    canvas.width = w * SC; canvas.height = h * SC
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const rng = (n: number) => { const s = (seed * 9301 + n * 49297) % 233280; return s / 233280 }
    const PALETTES = [
      ['#8B1A1A','#C0392B','#E74C3C'],
      ['#1A3A8B','#2980B9','#5DADE2'],
      ['#1A6B3A','#27AE60','#58D68D'],
      ['#6B3A1A','#D4881E','#F0C050'],
      ['#4A1A6B','#8E44AD','#C39BD3'],
      ['#1A5A6B','#17A589','#4ECDC4'],
    ]
    const pal = PALETTES[Math.floor(rng(1) * PALETTES.length)]
    const px = (x: number, y: number, c: string) => {
      ctx.fillStyle = c; ctx.fillRect(x * SC, y * SC, SC, SC)
    }
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = pal[1]
    for (let x = 2; x < w - 2; x++) for (let y = 4; y < 14; y++) px(x, y, pal[1])
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(rng(i * 2 + 10) * (w - 6)) + 2
      const by = Math.floor(rng(i * 2 + 11) * (h - 20)) + 16
      const bs = Math.floor(rng(i * 3) * 4) + 2
      ctx.fillStyle = pal[2]; ctx.fillRect(bx * SC, by * SC, bs * SC, bs * SC)
    }
    ctx.fillStyle = pal[2]
    for (let y = 0; y < h; y++) { px(0, y, pal[2]); px(1, y, pal[1]) }
    for (let x = 2; x < w - 2; x++) { px(x, 15, pal[2]); px(x, h - 4, pal[2]) }
  }, [seed, w, h])
  return (
    <canvas
      ref={ref}
      style={{ width: w, height: h, imageRendering: 'pixelated', display: 'block', cursor: 'pointer' }}
    />
  )
}

export function StoryTab() {
  const navigate = useNavigate()
  const diaries    = storage.getDiaries().filter((d) => d.content)
  const savedNovels: SavedNovel[] = storage.getSavedNovels()
  const dates = diaries.map((d) => d.date ?? '').filter(Boolean).sort()

  return (
    <div style={{ padding: '20px 18px 32px' }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-amb)', letterSpacing: '0.1em', marginBottom: 16 }}>► 나의 이야기</div>

      {diaries.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--text-off)', lineHeight: 1.8, marginBottom: 20 }}>
          아직 저장된 일기가 없어요.<br />일기를 쓰고 저장하면 여기서 소설로 엮을 수 있어요.
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: 'var(--fire-tip)' }}>{diaries.length}</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', marginTop: 3, letterSpacing: '0.06em' }}>DIARIES</div>
            </div>
            {dates.length > 0 && (
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', lineHeight: 2.2, letterSpacing: '0.06em' }}>
                <div>FROM {dates[0]}</div>
                <div>TO   {dates[dates.length - 1]}</div>
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', lineHeight: 1.7 }}>
            일기들을 하나의 소설로 엮어 볼 수 있어요.<br />
            기간을 선택하고 책을 펼쳐보세요.
          </div>
        </div>
      )}

      <button
        className='pixel-btn pixel-btn-fire'
        style={{ fontSize: 10, padding: '10px 18px' }}
        onClick={() => navigate('/novel')}
      >
        ▸ 나의 이야기 열기
      </button>

      {/* ── 책장 ── */}
      {savedNovels.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', letterSpacing: '0.08em', marginBottom: 12 }}>▸ 책장</div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
            {savedNovels.map((n) => {
              const seed = n.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
              return (
                <div
                  key={n.id}
                  style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}
                  onClick={() => navigate(`/novel?savedId=${n.id}`)}
                >
                  <PixelBookCover seed={seed} w={44} h={66} />
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--gray-4)', textAlign: 'center', maxWidth: 48, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.title.split(' ~ ')[0]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
