import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Character, type NovelDiary, type SavedNovel } from '@/types'
import * as storage from '@/services/storage'
import * as claude from '@/services/claude/claude-service'
import * as avatar from '@/services/avatar/avatar-service'
import { PixelStars } from '@/components/ui/PixelStars'
import { AvatarCanvas } from '@/components/ui/AvatarCanvas'

// ── Mobile detection ──────────────────────────────────────────────────────
const mq = typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)') : null
function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { mq?.addEventListener('change', cb); return () => mq?.removeEventListener('change', cb) },
    () => mq?.matches ?? false,
    () => false,
  )
}

// ── Constants ─────────────────────────────────────────────────────────────
const PAGE_H     = 630
const PAGE_PAD_T = 36
const PAGE_PAD_B = 48
const PAGE_PAD_X = 32
const CONTENT_H  = PAGE_H - PAGE_PAD_T - PAGE_PAD_B   // 546
const BODY_W     = 446 - PAGE_PAD_X * 2               // 382
const H_HEADER   = 75
const H_IMAGE    = 216
const H_CHARS    = 92
const H_PAGENUM  = 12
const CONT_BODY_H = CONTENT_H - H_PAGENUM - 8         // 526

const READER_NAMES = [
  '새벽감성', '불멍러버', '모닥불덕후', '책먹는독자',
  '활자중독', '밤독서꾼', '공감폭발', '문장수집가',
  '야독자', '깊은밤독서', '북적북적', '독서중독',
  '소설덕후', '일기광', '갓생독자', '모닥불뷰',
]

// ── Types ─────────────────────────────────────────────────────────────────
interface DiaryPage {
  type: 'cover-left' | 'cover-right' | 'diary-first' | 'diary-cont' | 'blank' | 'review'
  diary?: NovelDiary
  text?: string
  hasImage?: boolean
  imgUrl?: string | null
  hasChars?: boolean
  charNames?: string[]
  diaryIdx?: number
}
interface Spread { left: DiaryPage; right: DiaryPage }

// ── Text Pagination ───────────────────────────────────────────────────────
async function paginateText(text: string, firstH: number, contH: number): Promise<string[]> {
  await document.fonts.ready
  const el = document.createElement('div')
  el.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0',
    `width:${BODY_W}px`,
    "font-family:'Nanum Myeongjo',serif",
    'font-size:14px', 'line-height:1.95',
    'word-break:keep-all', 'white-space:pre-wrap',
    'visibility:hidden', 'pointer-events:none',
  ].join(';')
  document.body.appendChild(el)

  const pages: string[] = []
  let rem = text.trim()
  let isFirst = true

  while (rem.length > 0) {
    const maxH = isFirst ? firstH : contH
    isFirst = false
    el.textContent = rem
    if (el.scrollHeight <= maxH) { pages.push(rem); break }

    let lo = 0, hi = rem.length
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2)
      el.textContent = rem.slice(0, mid)
      if (el.scrollHeight <= maxH) lo = mid; else hi = mid
    }
    let split = lo
    while (split > 0 && rem[split] !== ' ' && rem[split] !== '\n') split--
    if (split === 0) split = lo
    pages.push(rem.slice(0, split).trimEnd())
    rem = rem.slice(split).trimStart()
  }

  document.body.removeChild(el)
  return pages.filter((p) => p.length > 0)
}

// ── Seed Avatar (for readers) ─────────────────────────────────────────────
function SeedCanvas({ seed, w, h }: { seed: number; w: number; h: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => { if (ref.current) avatar.renderSeed(ref.current, seed) }, [seed])
  return <canvas ref={ref} style={{ width: w, height: h, imageRendering: 'pixelated', display: 'block' }} />
}

// ── Glasses Canvas ────────────────────────────────────────────────────────
function GlassesCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const SC = 2
    canvas.width = 20 * SC; canvas.height = 10 * SC
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const px = (x: number, y: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x*SC, y*SC, SC, SC) }
    const B = '#cc2200', L = '#ff6644'
    for (let x = 3; x <= 6; x++) for (let y = 2; y <= 5; y++) px(x, y, L)
    for (let x = 2; x <= 7; x++) { px(x, 1, B); px(x, 6, B) }
    for (let y = 1; y <= 6; y++) { px(2, y, B); px(7, y, B) }
    for (let x = 8; x <= 11; x++) for (let y = 3; y <= 4; y++) px(x, y, B)
    for (let x = 13; x <= 16; x++) for (let y = 2; y <= 5; y++) px(x, y, L)
    for (let x = 12; x <= 17; x++) { px(x, 1, B); px(x, 6, B) }
    for (let y = 1; y <= 6; y++) { px(12, y, B); px(17, y, B) }
    for (let y = 3; y <= 4; y++) { px(0, y, B); px(1, y, B) }
    for (let y = 3; y <= 4; y++) { px(18, y, B); px(19, y, B) }
  }, [])
  return <canvas ref={ref} style={{ imageRendering: 'pixelated', display: 'block' }} />
}

// ── Page Renderers ─────────────────────────────────────────────────────────
function Endpaper() {
  const line = '◈ TADAK TADAK ◈'
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'#2a2a2a', lineHeight:2.2, letterSpacing:'0.25em', textAlign:'center', userSelect:'none' }}>
        {Array(12).fill(line).join('\n')}
      </div>
    </div>
  )
}

function CoverPage({ diaries, onClose }: { diaries: NovelDiary[]; onClose: () => void }) {
  const from  = diaries[0]?.date ?? ''
  const to    = diaries[diaries.length - 1]?.date ?? ''
  const count = diaries.length
  const period = from === to ? from : `${from} ~ ${to}`
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', height:'100%' }}>
      <div style={{ fontSize:44, marginBottom:18 }}>🔥</div>
      <div style={{ fontFamily:"'Noto Serif KR',serif", fontWeight:700, fontSize:20, color:'#d4881e', letterSpacing:'0.06em', marginBottom:10 }}>나의 이야기</div>
      <div style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:14, color:'#888', marginBottom:6 }}>{count}편의 일기</div>
      <div style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'#555', letterSpacing:'0.08em', marginBottom:24 }}>{period}</div>
      <div style={{ width:48, height:1, background:'#d4881e', margin:'0 auto 22px' }} />
      <button onClick={onClose} style={{ fontFamily:'var(--font-pixel)', fontSize:10, background:'#000', color:'#888', border:'1px solid #444', padding:'8px 14px', cursor:'pointer', letterSpacing:'0.06em' }}>책 덮기</button>
      <div style={{ position:'absolute', bottom:18, left:32, fontFamily:'var(--font-pixel)', fontSize:9, color:'#666', letterSpacing:'0.1em' }}>i</div>
    </div>
  )
}

function DiaryFirstPage({ page, pageNum, chars }: { page: DiaryPage; pageNum: number | null; chars: Character[] }) {
  const diary = page.diary!
  const title = diary.title ?? diary.date ?? ''
  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* 헤더: 날짜 + 제목 */}
      <div style={{ flexShrink:0 }}>
        <div style={{ fontFamily:"'Noto Serif KR',serif", fontWeight:700, fontSize:9, color:'#d4881e', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:4 }}>{diary.date}</div>
        <div style={{ fontFamily:"'Noto Serif KR',serif", fontWeight:700, fontSize:15, color:'#d4881e', lineHeight:1.4, marginBottom:10, paddingBottom:10, borderBottom:'1px solid #333' }}>{title}</div>
        {page.hasImage && page.imgUrl && (
          <img src={page.imgUrl} alt='' style={{ display:'block', width:'100%', maxHeight:200, objectFit:'cover', marginBottom:14, border:'1px solid #333' }} />
        )}
      </div>
      {/* 본문: flex-grow로 남은 공간 채우되 overflow:hidden으로 잘림 방지 */}
      <div style={{ flex:1, overflow:'hidden', fontFamily:"'Nanum Myeongjo',serif", fontSize:14, color:'#f5e6c8', lineHeight:1.95, wordBreak:'keep-all', whiteSpace:'pre-wrap' }}>{page.text}</div>
      {/* 등장인물: 본문 아래 별도 영역, 절대 위치 없음 */}
      {page.hasChars && chars.length > 0 && (
        <div style={{ flexShrink:0, borderTop:'1px solid #333', paddingTop:10, marginTop:8 }}>
          <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'#555', letterSpacing:'0.1em', marginBottom:8 }}>▸ 등장인물</div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-start' }}>
            {chars.slice(0, 6).map((char) => (
              <div key={char.name} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                <div style={{ width:28, height:42, border:'1px solid #333', overflow:'hidden' }}>
                  <AvatarCanvas character={char} w={28} h={42} />
                </div>
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:7, color:'#666', textAlign:'center', maxWidth:36, wordBreak:'break-all', lineHeight:1.3 }}>{char.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 페이지 번호 */}
      {pageNum != null && (
        <div style={{ flexShrink:0, fontFamily:'var(--font-pixel)', fontSize:9, color:'#666', letterSpacing:'0.1em', marginTop:6 }}>{pageNum}</div>
      )}
    </div>
  )
}

function DiaryContPage({ page, pageNum }: { page: DiaryPage; pageNum: number | null }) {
  return (
    <div style={{ height:'100%', position:'relative' }}>
      <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'#555', letterSpacing:'0.1em', marginBottom:12 }}>— 계속</div>
      <div style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:14, color:'#f5e6c8', lineHeight:1.95, wordBreak:'keep-all', whiteSpace:'pre-wrap' }}>{page.text}</div>
      {pageNum != null && (
        <div style={{ position:'absolute', bottom:18, fontFamily:'var(--font-pixel)', fontSize:9, color:'#666', letterSpacing:'0.1em' }}>{pageNum}</div>
      )}
    </div>
  )
}

function BlankPage() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div style={{ fontFamily:'var(--font-pixel)', fontSize:16, color:'#252525', letterSpacing:'0.3em' }}>※</div>
    </div>
  )
}

type ReviewResult = Awaited<ReturnType<typeof claude.generateReviews>>

// ── 픽셀 책 커버 ───────────────────────────────────────────────────────────
function PixelBookCover({ seed, w = 40, h = 60 }: { seed: number; w?: number; h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const SC = 2
    canvas.width = w * SC; canvas.height = h * SC
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const rng = (n: number) => { let s = (seed * 9301 + n * 49297) % 233280; return s / 233280 }
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
    // 배경
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, canvas.width, canvas.height)
    // 제목 영역
    ctx.fillStyle = pal[1]
    for (let x = 2; x < w - 2; x++) for (let y = 4; y < 14; y++) px(x, y, pal[1])
    // 패턴
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(rng(i * 2 + 10) * (w - 6)) + 2
      const by = Math.floor(rng(i * 2 + 11) * (h - 20)) + 16
      const bs = Math.floor(rng(i * 3) * 4) + 2
      ctx.fillStyle = pal[2]; ctx.fillRect(bx * SC, by * SC, bs * SC, bs * SC)
    }
    // 세로 선
    ctx.fillStyle = pal[2]
    for (let y = 0; y < h; y++) { px(0, y, pal[2]); px(1, y, pal[1]) }
    // 가로선 장식
    for (let x = 2; x < w - 2; x++) { px(x, 15, pal[2]); px(x, h - 4, pal[2]) }
  }, [seed, w, h])
  return <canvas ref={ref} style={{ width: w, height: h, imageRendering: 'pixelated', display: 'block', cursor: 'pointer' }} />
}

// ── 저장된 소설 뷰어 ──────────────────────────────────────────────────────
function SavedNovelView({ novel, onClose, onDelete }: {
  novel: SavedNovel; onClose: () => void; onDelete: (id: string) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', overflowY: 'auto', padding: '20px 16px 48px' }}>
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: '#d4881e', letterSpacing: '0.1em', marginBottom: 4 }}>▸ 책장</div>
            <div style={{ fontFamily: "'Noto Serif KR',serif", fontWeight: 700, fontSize: 16, color: '#f5e6c8' }}>{novel.title}</div>
          </div>
          <button onClick={onClose} style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, background: '#000', color: '#888', border: '1px solid #444', padding: '6px 10px', cursor: 'pointer', letterSpacing: '0.06em', flexShrink: 0 }}>[ 닫기 ]</button>
        </div>
        <div style={{ fontFamily: "'Nanum Myeongjo',serif", fontSize: 15, color: '#f5e6c8', lineHeight: 2.1, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', marginBottom: 28, borderLeft: '3px solid #d4881e', paddingLeft: 16 }}>
          {novel.content}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, background: '#000', color: '#c0392b', border: '1px solid #c0392b', padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.06em' }}>삭제</button>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: '#c0392b', alignSelf: 'center' }}>정말 삭제할까요?</span>
              <button onClick={() => { onDelete(novel.id); onClose() }} style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, background: '#c0392b', color: '#fff', border: '1px solid #c0392b', padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.06em' }}>삭제</button>
              <button onClick={() => setConfirmDelete(false)} style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, background: '#000', color: '#888', border: '1px solid #444', padding: '7px 12px', cursor: 'pointer', letterSpacing: '0.06em' }}>취소</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ReviewPage({ reviews, readerSeeds, loading, onRegen, onClose, onSave, savedAlready }: {
  reviews: ReviewResult; readerSeeds: number[]
  loading: boolean; onRegen: () => void; onClose: () => void
  onSave?: () => void; savedAlready?: boolean
}) {
  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #333', paddingBottom:12, marginBottom:14 }}>
        <span style={{ fontSize:52, flexShrink:0, lineHeight:1 }}>🔥</span>
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'#d4881e', letterSpacing:'0.1em' }}>불멍 독자석</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, fontFamily:'var(--font-pixel)', fontSize:9, color:'#555', letterSpacing:'0.08em', textAlign:'center', lineHeight:2 }}>
        독자들이 읽는 중...
      </div>
      <button onClick={onClose} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background:'#000', color:'#888', border:'1px solid #444', padding:'7px 12px', cursor:'pointer', letterSpacing:'0.06em', marginTop:12, alignSelf:'flex-start' }}>책 덮기</button>
    </div>
  )

  if (!reviews) return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #333', paddingBottom:12, marginBottom:14 }}>
        <span style={{ fontSize:52, flexShrink:0, lineHeight:1 }}>🔥</span>
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'#d4881e', letterSpacing:'0.1em' }}>불멍 독자석</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:14, fontFamily:'var(--font-pixel)', fontSize:9, color:'#555', letterSpacing:'0.08em', textAlign:'center', lineHeight:2 }}>
        <div>독자 반응을 불러오지 못했어요.<br />다시 시도해줘요.</div>
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button onClick={onRegen} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background:'#000', color:'#d4881e', border:'1px solid #d4881e', padding:'7px 12px', cursor:'pointer', letterSpacing:'0.06em' }}>🔥 독자 불러오기</button>
          <button onClick={onClose} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background:'#000', color:'#888', border:'1px solid #444', padding:'7px 12px', cursor:'pointer', letterSpacing:'0.06em' }}>책 덮기</button>
        </div>
      </div>
    </div>
  )

  const stars = (reviews as { rating?: number }).rating ?? 0
  const criticReview = (reviews as { criticReview?: string }).criticReview ?? ''
  const comments = (reviews as { comments?: Array<{ text: string }> }).comments ?? []

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, borderBottom:'1px solid #333', paddingBottom:12, marginBottom:14 }}>
        <span style={{ fontSize:52, flexShrink:0, lineHeight:1 }}>🔥</span>
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'#d4881e', letterSpacing:'0.1em' }}>불멍 독자석</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:3, marginBottom:12 }}>
        {Array(5).fill(0).map((_, i) => (
          <span key={i} style={{ fontSize:14, color: i < stars ? '#d4881e' : '#333' }}>★</span>
        ))}
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'#555', marginLeft:6 }}>{stars}.0</span>
      </div>
      <div style={{ border:'1px solid #333', boxShadow:'inset 0 0 0 1px #222', padding:'10px 12px', marginBottom:14, background:'#111' }}>
        <div style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:13, color:'#f5e6c8', fontStyle:'italic', lineHeight:1.75 }}>{criticReview}</div>
        <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'#555', marginTop:8, display:'flex', alignItems:'center', justifyContent:'flex-end', gap:5 }}>
          — <GlassesCanvas />
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, flex:1, overflow:'hidden' }}>
        {comments.slice(0, 3).map((c, i) => {
          const seed = readerSeeds[i]
          const nick = READER_NAMES[(seed ?? i * 3) % READER_NAMES.length]
          return (
            <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
              {seed != null && <div style={{ width:32, height:48, border:'1px solid #333', flexShrink:0 }}><SeedCanvas seed={seed} w={32} h={48} /></div>}
              <div style={{ flex:1, border:'1px solid #333', padding:'6px 10px', background:'#111' }}>
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'#d4881e', marginBottom:3 }}>{nick}</div>
                <div style={{ fontFamily:"'Nanum Myeongjo',serif", fontSize:13, color:'#f5e6c8', lineHeight:1.5 }}>{c.text}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
        <button onClick={onRegen} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background:'#000', color:'#d4881e', border:'1px solid #d4881e', padding:'7px 12px', cursor:'pointer', letterSpacing:'0.06em' }}>🔥 다른 독자 불러오기</button>
        {onSave && (
          <button onClick={onSave} disabled={savedAlready} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background: savedAlready ? '#111' : '#000', color: savedAlready ? '#555' : '#f5e6c8', border: savedAlready ? '1px solid #333' : '1px solid #f5e6c8', padding:'7px 12px', cursor: savedAlready ? 'not-allowed' : 'pointer', letterSpacing:'0.06em' }}>
            {savedAlready ? '✓ 책장에 꽂혔어' : '📚 책장에 꽂기'}
          </button>
        )}
        <button onClick={onClose} style={{ fontFamily:'var(--font-pixel)', fontSize:9, background:'#000', color:'#888', border:'1px solid #444', padding:'7px 12px', cursor:'pointer', letterSpacing:'0.06em' }}>책 덮기</button>
      </div>
    </div>
  )
}

// ── Page Component ─────────────────────────────────────────────────────────
function BookPage({
  page, side, allPages, diaries, reviews, readerSeeds, reviewLoading, onClose, onRegen, onSave, savedAlready,
}: {
  page: DiaryPage; side: 'left' | 'right'; allPages: DiaryPage[]
  diaries: NovelDiary[]; reviews: ReviewResult; readerSeeds: number[]
  reviewLoading: boolean; onClose: () => void; onRegen: () => void
  onSave?: () => void; savedAlready?: boolean
}) {
  const pageNum = (() => {
    if (page.type === 'cover-left' || page.type === 'cover-right' || page.type === 'blank' || page.type === 'review') return null
    const idx = allPages.indexOf(page)
    return idx >= 0 ? idx + 1 : null
  })()

  const charNames = page.charNames ?? []
  const chars = charNames.map((n) => storage.getCharacter(n)).filter(Boolean) as Character[]

  const numStyle: React.CSSProperties = side === 'left'
    ? { position:'absolute', bottom:18, left:0 }
    : { position:'absolute', bottom:18, right:0 }

  return (
    <div style={{ flex:1, height:PAGE_H, overflow:'hidden', background:'#1a1a1a', position:'relative', padding:`${PAGE_PAD_T}px ${PAGE_PAD_X}px ${PAGE_PAD_B}px`, borderRight: side === 'left' ? '4px solid #111' : undefined, borderLeft: side === 'right' ? '2px solid #262626' : undefined }}>
      {page.type === 'cover-left'  && <Endpaper />}
      {page.type === 'cover-right' && <CoverPage diaries={diaries} onClose={onClose} />}
      {page.type === 'diary-first' && <DiaryFirstPage page={page} pageNum={pageNum} chars={chars} />}
      {page.type === 'diary-cont'  && <DiaryContPage page={page} pageNum={pageNum} />}
      {page.type === 'blank'       && <BlankPage />}
      {page.type === 'review'      && (
        <ReviewPage reviews={reviews} readerSeeds={readerSeeds} loading={reviewLoading} onRegen={onRegen} onClose={onClose} onSave={onSave} savedAlready={savedAlready} />
      )}
      {pageNum != null && page.type !== 'diary-first' && page.type !== 'diary-cont' && (
        <div style={{ ...numStyle, fontFamily:'var(--font-pixel)', fontSize:9, color:'#666', letterSpacing:'0.1em' }}>{pageNum}</div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function NovelPage() {
  const navigate  = useNavigate()
  const isMobile  = useIsMobile()

  const allDiaries = storage.getDiaries()
    .filter((d) => d.content)
    .sort((a, b) => (a.date ?? '') < (b.date ?? '') ? -1 : 1)

  const today = new Date().toISOString().slice(0, 10)
  const defFrom = allDiaries[0]?.date ?? today
  const defTo   = allDiaries[allDiaries.length - 1]?.date ?? today

  const [dateFrom, setDateFrom] = useState(defFrom)
  const [dateTo,   setDateTo]   = useState(defTo)
  const [activePreset, setActivePreset] = useState<'week' | 'month' | 'all' | null>('all')
  const [showPicker, setShowPicker] = useState(true)
  const [building,   setBuilding]  = useState(false)

  const [spreads,  setSpreads]  = useState<Spread[]>([])
  const [curPage,  setCurPage]  = useState(0)   // mobile: flat page index into allPages
  const touchStartX = useRef<number | null>(null)
  const [allPages, setAllPages] = useState<DiaryPage[]>([])
  const [diaries,  setDiaries]  = useState<NovelDiary[]>([])
  const [curSpread, setCurSpread] = useState(0)
  const [flipClass, setFlipClass] = useState('')

  const [reviews,      setReviews]      = useState<ReviewResult>(null)
  const [readerSeeds,  setReaderSeeds]  = useState<number[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const reviewRequested = useRef(false)

  const [savedNovels,    setSavedNovels]    = useState<SavedNovel[]>(() => storage.getSavedNovels())
  const [savedThisBook,  setSavedThisBook]  = useState(false)
  const [toastMsg,       setToastMsg]       = useState('')
  const [viewingNovel,   setViewingNovel]   = useState<SavedNovel | null>(null)

  function buildNovelTitle(ds: NovelDiary[]): string {
    const from = ds[0]?.date ?? ''
    const to   = ds[ds.length - 1]?.date ?? ''
    const fmt  = (d: string) => d.replace(/-/g, '.')
    return from === to ? fmt(from) : `${fmt(from)} ~ ${fmt(to)}`
  }

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 2400)
  }

  function handleSaveNovel() {
    if (savedThisBook || diaries.length === 0) return
    const combined = diaries.map((d) => (d.title ? `[ ${d.title} ]\n\n` : '') + (d.content ?? '')).join('\n\n\n')
    const coverImage = (() => {
      const ki = diaries[0]?.keyImage
      if (!ki) return null
      return typeof ki === 'string' ? ki : (ki as { dataUrl: string }).dataUrl ?? null
    })()
    const novel: SavedNovel = {
      id: `novel-${Date.now()}`,
      title: buildNovelTitle(diaries),
      content: combined,
      readerReactions: reviews ? JSON.stringify(reviews) : null,
      coverImage,
      diaryDateFrom: diaries[0]?.date ?? '',
      diaryDateTo:   diaries[diaries.length - 1]?.date ?? '',
      createdAt: new Date().toISOString(),
    }
    storage.saveNovel(novel)
    setSavedNovels(storage.getSavedNovels())
    setSavedThisBook(true)
    showToast('책장에 꽂혔어')
  }

  function handleDeleteNovel(id: string) {
    storage.deleteNovel(id)
    setSavedNovels(storage.getSavedNovels())
  }

  const filteredCount = allDiaries.filter((d) => d.date && d.date >= dateFrom && d.date <= dateTo).length

  function setPreset(type: 'week' | 'month' | 'all') {
    setActivePreset(type)
    if (type === 'all') {
      setDateFrom(defFrom); setDateTo(defTo)
    } else {
      const from = new Date()
      from.setDate(from.getDate() - (type === 'week' ? 7 : 30))
      setDateFrom(from.toISOString().slice(0, 10))
      setDateTo(today)
    }
  }

  const loadReviews = useCallback(async (prevReviews: ReviewResult = null) => {
    if (reviewLoading) return
    if (!storage.getApiKey() && !import.meta.env.VITE_API_URL) { setReviews(null); return }
    setReviewLoading(true)
    try {
      const result = await claude.generateReviews(diaries, prevReviews)
      setReviews(result)
      if ((result as { comments?: unknown[] } | null)?.comments) {
        setReaderSeeds((result as { comments: unknown[] }).comments.map(() => avatar.generateSeed()))
      }
    } catch { setReviews(null) }
    finally { setReviewLoading(false) }
  }, [reviewLoading, diaries])

  // Trigger review load when review spread is first shown
  useEffect(() => {
    const spread = spreads[curSpread]
    if (!spread) return
    const hasReview = spread.left.type === 'review' || spread.right.type === 'review'
    if (hasReview && !reviewRequested.current && !reviews && !reviewLoading) {
      reviewRequested.current = true
      loadReviews()
    }
  }, [curSpread, spreads, reviews, reviewLoading, loadReviews])

  async function openBook() {
    const filtered = allDiaries
      .filter((d) => d.date && d.date >= dateFrom && d.date <= dateTo)
      .sort((a, b) => (a.createdAt ?? '') < (b.createdAt ?? '') ? -1 : 1)
    if (!filtered.length) return

    setBuilding(true)
    setShowPicker(false)
    setDiaries(filtered)
    setReviews(null)
    setReaderSeeds([])
    setSavedThisBook(false)
    reviewRequested.current = false

    const pages: DiaryPage[] = []
    for (const diary of filtered) {
      const imgUrl = typeof diary.keyImage === 'string' ? diary.keyImage
        : (diary.keyImage as { dataUrl: string } | null)?.dataUrl ?? null
      const hasImage = !!imgUrl
      const charNames = diary.characterNames ?? (diary.characters ?? []).map((c) => typeof c === 'string' ? c : c.name)
      const hasChars = charNames.length > 0

      const bodyStart = H_HEADER + (hasImage ? H_IMAGE : 0)
      const bodyEnd   = CONTENT_H - H_PAGENUM - (hasChars ? H_CHARS : 0)
      const firstH    = Math.max(bodyEnd - bodyStart, 50)

      const chunks = await paginateText(diary.content ?? '', firstH, CONT_BODY_H)
      if (chunks.length === 0) chunks.push('')
      chunks.forEach((text, ci) => {
        pages.push({ type: ci === 0 ? 'diary-first' : 'diary-cont', diary, text, hasImage: ci === 0 && hasImage, imgUrl: ci === 0 ? imgUrl : null, hasChars: ci === 0 && hasChars, charNames: ci === 0 ? charNames : [] })
      })
    }

    // Build spreads
    const allP: DiaryPage[] = [{ type: 'cover-left' }, { type: 'cover-right' }, ...pages]
    if (pages.length % 2 === 0) allP.push({ type: 'blank' })
    allP.push({ type: 'review' })
    const built: Spread[] = []
    for (let i = 0; i < allP.length; i += 2) {
      built.push({ left: allP[i], right: allP[i + 1] ?? { type: 'blank' } })
    }

    setAllPages(pages)
    setSpreads(built)
    setCurSpread(0)
    setBuilding(false)
  }

  function navSpread(dir: number) {
    const next = curSpread + dir
    if (next < 0 || next >= spreads.length) return
    setFlipClass(dir > 0 ? 'flip-next' : 'flip-prev')
    setTimeout(() => setFlipClass(''), 250)
    setCurSpread(next)
  }

  function navPage(dir: number) {
    // mobile flat pages: cover-left, cover-right, ...allPages, blank?, review
    const flatLen = allPages.length + 3  // cover-l, cover-r, ...pages, review
    const next = curPage + dir
    if (next < 0 || next >= flatLen) return
    setCurPage(next)
    // trigger review load when reaching last page (review)
    if (next === flatLen - 1 && !reviewRequested.current && !reviews && !reviewLoading) {
      reviewRequested.current = true
      loadReviews()
    }
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (showPicker) return
      if (e.key === 'ArrowRight') isMobile ? navPage(1)  : navSpread(1)
      if (e.key === 'ArrowLeft')  isMobile ? navPage(-1) : navSpread(-1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  })

  // ── No diaries ───────────────────────────────────────────────────────────
  if (allDiaries.length === 0) return (
    <>
      <PixelStars />
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, height:52, borderBottom:'2px solid var(--white)', background:'#000', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
        <button onClick={() => navigate('/timeline')} style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--gray-4)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.08em' }}>◀ 타임라인</button>
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:13, color:'var(--white)', letterSpacing:'0.1em' }}>나의 이야기</span>
        <div style={{ width:80 }} />
      </header>
      <div style={{ paddingTop:52, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--gray-4)', letterSpacing:'0.08em', textAlign:'center', lineHeight:2.8 }}>
        <div style={{ fontSize:36, marginBottom:20, opacity:0.3 }}>▒</div>
        일기가 없어요<br />먼저 일기를 써보세요<br />
        <button className='pixel-btn pixel-btn-sm' style={{ marginTop:16 }} onClick={() => navigate('/')}>일기 쓰러 가기</button>
      </div>
    </>
  )

  return (
    <>
      <PixelStars />

      {/* ── Header ── */}
      <header style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, height:52, borderBottom:'2px solid var(--white)', background:'#000', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px' }}>
        <button onClick={() => navigate('/timeline')} style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--gray-4)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.08em' }}>◀ 타임라인</button>
        <span style={{ fontFamily:'var(--font-pixel)', fontSize:13, color:'var(--white)', letterSpacing:'0.1em' }}>나의 이야기</span>
        {!showPicker
          ? <button onClick={() => { setShowPicker(true); setSpreads([]) }} style={{ fontFamily:'var(--font-pixel)', fontSize:10, background:'none', border:'1px solid var(--gray-3)', color:'var(--gray-4)', padding:'5px 10px', cursor:'pointer', letterSpacing:'0.06em' }}>[기간 변경]</button>
          : <div style={{ width:80 }} />}
      </header>

      {/* ── Picker Modal ── */}
      {showPicker && (
        <div style={{ position:'fixed', inset:0, zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.92)', padding: isMobile ? '0 16px' : 0 }}>
          <div style={{ width: isMobile ? '100%' : 400, maxWidth:400, border:'3px solid var(--white)', background:'#000', padding: isMobile ? '24px 20px 20px' : '28px 28px 24px', position:'relative', overflow:'hidden' }}>
            <button onClick={() => spreads.length > 0 ? setShowPicker(false) : navigate(-1)}
              className='modal-close' style={{ position:'absolute', top:12, right:14 }}
              title='닫기'>[ x ]</button>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize: isMobile ? 11 : 13, color:'var(--white)', letterSpacing:'0.1em', marginBottom:22 }}>▸ 소설로 엮을 기간 선택</div>
            {/* ── 책장 ── */}
            {savedNovels.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-4)', letterSpacing:'0.08em', marginBottom:10 }}>▸ 책장</div>
                <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:8, WebkitOverflowScrolling:'touch' as React.CSSProperties['WebkitOverflowScrolling'] }}>
                  {savedNovels.map((n) => {
                    const seed = n.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
                    return (
                      <div key={n.id} style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}
                        onClick={() => setViewingNovel(n)}>
                        <PixelBookCover seed={seed} w={40} h={60} />
                        <div style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--gray-4)', textAlign:'center', maxWidth:44, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title.split(' ~ ')[0]}</div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ height:1, background:'var(--gray-2)', marginTop:12, marginBottom:4 }} />
              </div>
            )}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:16 }}>
              {(['week', 'month', 'all'] as const).map((t) => (
                <button key={t} onClick={() => setPreset(t)}
                  style={{ fontFamily:'var(--font-pixel)', fontSize:10, background:'#000', color: activePreset === t ? 'var(--fire-org)' : 'var(--gray-4)', border: activePreset === t ? '1px solid var(--fire-org)' : '1px solid var(--gray-3)', padding:'6px 10px', cursor:'pointer', letterSpacing:'0.05em' }}>
                  {t === 'week' ? '최근 1주일' : t === 'month' ? '최근 1 달' : '전체 일기'}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 12, marginBottom:16 }}>
              {[['FROM', dateFrom, setDateFrom], ['TO', dateTo, setDateTo]].map(([label, val, setter]) => (
                <div key={label as string} style={{ flex:1, minWidth:0 }}>
                  <label style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--gray-4)', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>{label as string}</label>
                  <input type='date' value={val as string}
                    onChange={(e) => { (setter as (v: string) => void)(e.target.value); setActivePreset(null) }}
                    style={{ width:'100%', maxWidth:'100%', fontFamily:'var(--font-pixel)', fontSize:10, background:'#000', color:'var(--white)', border:'2px solid var(--gray-3)', padding:'8px 10px', outline:'none', colorScheme:'dark' }} />
                </div>
              ))}
            </div>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--text-off)', marginBottom:16, letterSpacing:'0.05em' }}>
              {filteredCount === 0 ? '이 기간에 일기가 없어요'
                : <><span style={{ color:'var(--fire-tip)' }}>{filteredCount}편</span>의 일기가 발견됐어요</>}
            </div>
            <button disabled={filteredCount === 0 || building} onClick={openBook}
              style={{ width:'100%', fontFamily:'var(--font-pixel)', fontSize:12, background: filteredCount === 0 || building ? 'var(--gray-3)' : 'var(--white)', color: filteredCount === 0 || building ? 'var(--gray-4)' : '#000', border:'none', padding:13, cursor: filteredCount === 0 || building ? 'not-allowed' : 'pointer', letterSpacing:'0.1em' }}>
              {building ? 'LOADING...' : '책 펼치기'}
            </button>
          </div>
        </div>
      )}

      {/* ── Book Stage ── */}
      {!showPicker && spreads.length > 0 && isMobile && (() => {
        // Mobile: flat single-page view
        // index 0 = cover-left, 1 = cover-right, 2..N+1 = allPages, N+2 = review
        const flatPages: DiaryPage[] = [
          { type: 'cover-left' }, { type: 'cover-right' },
          ...allPages,
          { type: 'review' },
        ]
        const flatLen  = flatPages.length
        const flatPage = flatPages[curPage] ?? { type: 'blank' }
        const side     = curPage % 2 === 0 ? 'left' : 'right'
        return (
          <div style={{ paddingTop:60, display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh' }}>
            <div style={{ width:'100%', maxWidth:480, boxShadow:'0 0 0 2px #fff, 4px 4px 0 0 #333' }}
              onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
              onTouchEnd={(e) => {
                if (touchStartX.current === null) return
                const dx = e.changedTouches[0].clientX - touchStartX.current
                touchStartX.current = null
                if (Math.abs(dx) < 40) return
                dx < 0 ? navPage(1) : navPage(-1)
              }}>
              <BookPage
                page={flatPage} side={side} allPages={allPages}
                diaries={diaries} reviews={reviews} readerSeeds={readerSeeds}
                reviewLoading={reviewLoading} onClose={() => { setShowPicker(true); setSpreads([]); setCurPage(0) }}
                onRegen={() => { const prev = reviews; setReviews(null); setReaderSeeds([]); loadReviews(prev) }}
                onSave={handleSaveNovel} savedAlready={savedThisBook} />
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:24, margin:'18px auto 40px', justifyContent:'center' }}>
              <button disabled={curPage === 0} onClick={() => navPage(-1)} className='nav-btn'
                style={{ fontFamily:'var(--font-pixel)', fontSize:11, background:'#000', color: curPage === 0 ? '#444' : 'var(--white)', border: curPage === 0 ? '2px solid #333' : '2px solid var(--white)', padding:'10px 18px', cursor: curPage === 0 ? 'not-allowed' : 'pointer', letterSpacing:'0.08em' }}>◀</button>
              <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'#444', letterSpacing:'0.1em' }}>{curPage + 1} / {flatLen}</span>
              <button disabled={curPage === flatLen - 1} onClick={() => navPage(1)} className='nav-btn'
                style={{ fontFamily:'var(--font-pixel)', fontSize:11, background:'#000', color: curPage === flatLen - 1 ? '#444' : 'var(--white)', border: curPage === flatLen - 1 ? '2px solid #333' : '2px solid var(--white)', padding:'10px 18px', cursor: curPage === flatLen - 1 ? 'not-allowed' : 'pointer', letterSpacing:'0.08em' }}>▶</button>
            </div>
          </div>
        )
      })()}

      {!showPicker && spreads.length > 0 && !isMobile && (
        <div style={{ paddingTop:72, display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh' }}>
          <div className='book-outer'>
          <div style={{ position:'relative', display:'inline-block' }}>
            <div id='book-spread' className={flipClass}
              style={{ display:'flex', width:900, boxShadow:'0 0 0 3px #fff, 6px 6px 0 0 #333', position:'relative' }}>
              <BookPage
                page={spreads[curSpread].left} side='left' allPages={allPages}
                diaries={diaries} reviews={reviews} readerSeeds={readerSeeds}
                reviewLoading={reviewLoading} onClose={() => { setShowPicker(true); setSpreads([]) }}
                onRegen={() => { const prev = reviews; setReviews(null); setReaderSeeds([]); loadReviews(prev) }}
                onSave={handleSaveNovel} savedAlready={savedThisBook} />
              <div style={{ width:8, flexShrink:0, background:'linear-gradient(90deg,#5a3e00 0%,#a06c00 45%,#5a3e00 100%)' }} />
              <BookPage
                page={spreads[curSpread].right} side='right' allPages={allPages}
                diaries={diaries} reviews={reviews} readerSeeds={readerSeeds}
                reviewLoading={reviewLoading} onClose={() => { setShowPicker(true); setSpreads([]) }}
                onRegen={() => { const prev = reviews; setReviews(null); setReaderSeeds([]); loadReviews(prev) }}
                onSave={handleSaveNovel} savedAlready={savedThisBook} />
            </div>
          </div>
          </div>
          <div className='book-nav' style={{ display:'flex', alignItems:'center', gap:28, margin:'22px auto 48px', width:900, justifyContent:'center' }}>
            <button disabled={curSpread === 0} onClick={() => navSpread(-1)} className='nav-btn'
              style={{ fontFamily:'var(--font-pixel)', fontSize:11, background:'#000', color: curSpread === 0 ? '#444' : 'var(--white)', border: curSpread === 0 ? '2px solid #333' : '2px solid var(--white)', padding:'10px 20px', cursor: curSpread === 0 ? 'not-allowed' : 'pointer', letterSpacing:'0.08em' }}>◀ 이전</button>
            <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'#444', letterSpacing:'0.1em' }}>{curSpread + 1} / {spreads.length}</span>
            <button disabled={curSpread === spreads.length - 1} onClick={() => navSpread(1)} className='nav-btn'
              style={{ fontFamily:'var(--font-pixel)', fontSize:11, background:'#000', color: curSpread === spreads.length - 1 ? '#444' : 'var(--white)', border: curSpread === spreads.length - 1 ? '2px solid #333' : '2px solid var(--white)', padding:'10px 20px', cursor: curSpread === spreads.length - 1 ? 'not-allowed' : 'pointer', letterSpacing:'0.08em' }}>다음 ▶</button>
          </div>
        </div>
      )}

      {/* ── 저장 토스트 ── */}
      {toastMsg && (
        <div style={{ position:'fixed', bottom:32, left:'50%', transform:'translateX(-50%)', zIndex:999, background:'#1a1a1a', border:'2px solid #f5e6c8', color:'#f5e6c8', fontFamily:'var(--font-korean)', fontSize:14, padding:'10px 20px', letterSpacing:'0.04em', whiteSpace:'nowrap', boxShadow:'4px 4px 0 0 #333' }}>
          {toastMsg}
        </div>
      )}

      {/* ── 저장된 소설 뷰어 ── */}
      {viewingNovel && (
        <SavedNovelView
          novel={viewingNovel}
          onClose={() => setViewingNovel(null)}
          onDelete={handleDeleteNovel}
        />
      )}

      <style>{`
        @keyframes flipRight { 0%{transform:rotateY(0)} 50%{transform:rotateY(-15deg)} 100%{transform:rotateY(0)} }
        @keyframes flipLeft  { 0%{transform:rotateY(0)} 50%{transform:rotateY(15deg)}  100%{transform:rotateY(0)} }
        .flip-next { animation: flipRight 0.2s steps(4); }
        .flip-prev { animation: flipLeft  0.2s steps(4); }
        .nav-btn:not(:disabled):active { transform: scale(0.93); background: #1a1a1a !important; transition: transform 0.05s, background 0.05s; }
        .nav-btn:not(:disabled) { transition: transform 0.1s, background 0.1s; }
      `}</style>
    </>
  )
}
