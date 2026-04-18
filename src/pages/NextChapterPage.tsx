import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { type Letter } from '@/types'
import * as storage from '@/services/storage'
import * as claude from '@/services/claude/claude-service'
import {
  fetchTodayLetter, fetchAllLetters, requestLetterGeneration, markServerLetterRead,
  type ServerLetter,
} from '@/services/api/api-client'
import { PixelStars } from '@/components/ui/PixelStars'
import { useMobile } from '@/hooks/useMobile'

const SERVER_MODE = !!import.meta.env.VITE_API_URL

const ACCENT    = '#EF9F27'
const LETTER_BG = '#1a1208'
const TEXT_BASE = '#e8d4bc'

// ── 타입 ─────────────────────────────────────────────────────────────────────
type AnimPhase = 'idle' | 'opening' | 'typing' | 'done'
type View = 'main' | 'archive'

// ── 도착 시각 포맷 ─────────────────────────────────────────────────────────
function formatArrivedAt(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const mo = d.getMonth() + 1
  const day = d.getDate()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${y}년 ${mo}월 ${day}일 ${ampm} ${h12}:${m} 도착`
}

// ── 자정~오전 6시 랜덤 도착 시각 (로컬 fallback용) ──────────────────────
function randomArrivalTime(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setHours(Math.floor(Math.random() * 6))
  d.setMinutes(Math.floor(Math.random() * 60))
  d.setSeconds(Math.floor(Math.random() * 60))
  return d.toISOString()
}

// ── 편지가 도착 가능한지 ──────────────────────────────────────────────────
function isDelivered(letter: { arrivedAt: string } | { scheduled_at: string }): boolean {
  const ts = 'arrivedAt' in letter ? letter.arrivedAt : letter.scheduled_at
  return new Date(ts) <= new Date()
}

// ── scheduled_at 포맷: "내일 오전 3:17에 도착할 예정이야" ─────────────────
function formatScheduledAt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const dayLabel = isToday ? '오늘' : '내일'
  return `${dayLabel} ${ampm} ${h12}:${m}에 도착할 예정이야`
}

// ── letter 공통 arrivedAt 추출 ────────────────────────────────────────────
function getArrivedAt(letter: Letter | ServerLetter): string {
  return 'arrivedAt' in letter ? letter.arrivedAt : letter.scheduled_at
}

// ── letter 읽음 여부 ──────────────────────────────────────────────────────
function isRead(letter: Letter | ServerLetter): boolean {
  return 'read' in letter ? letter.read : letter.is_read
}

// ── 우체통 픽셀아트 (미수신용) ────────────────────────────────────────────
function Mailbox() {
  return (
    <div style={{ position: 'relative', width: 80, height: 100, margin: '0 auto' }}>
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 36, background: '#2a1e10',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 64, height: 62,
        background: '#1e1610', border: `2px solid #3a2a18`, borderRadius: '8px 8px 4px 4px',
      }}>
        <div style={{
          position: 'absolute', top: -1, left: -2, right: -2, height: 22,
          background: '#261c10', border: `2px solid #3a2a18`,
          borderRadius: '30px 30px 0 0', borderBottom: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 16, left: 8, right: 8, height: 6,
          background: '#0d0a07', border: `1px solid #2a1e10`, borderRadius: 1,
        }} />
        <div style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          width: 6, height: 6, background: '#3a2a18', borderRadius: '50%',
        }} />
      </div>
      <div style={{ position: 'absolute', top: 12, right: 4, width: 3, height: 18, background: '#3a2a18' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 3,
          width: 10, height: 7, background: '#4a3520', borderRadius: '0 2px 2px 0',
        }} />
      </div>
    </div>
  )
}

// ── 봉투 픽셀아트 ─────────────────────────────────────────────────────────
function Envelope({ open, pulse, size = 1 }: { open: boolean; pulse?: boolean; size?: number }) {
  const w = Math.round(96 * size)
  const h = Math.round(72 * size)
  return (
    <div style={{
      position: 'relative', width: w, height: h, margin: '0 auto',
      animation: pulse ? 'envPulse 2s ease-in-out infinite' : undefined,
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: Math.round(56 * size),
        background: '#1e1610',
        border: `2px solid ${open ? ACCENT : '#3a2a18'}`,
        transition: 'border-color 0.3s',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
          backgroundImage: `linear-gradient(135deg, transparent 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 50.5%, transparent 50.5%)`,
        }} />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '100%',
          backgroundImage: `linear-gradient(45deg, transparent 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 50.5%, transparent 50.5%)`,
        }} />
      </div>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: Math.round(40 * size),
        background: '#1e1610',
        border: `2px solid ${open ? ACCENT : '#3a2a18'}`,
        borderBottom: 'none',
        clipPath: open
          ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
          : 'polygon(0 0, 100% 0, 50% 85%)',
        transform: open ? 'rotateX(160deg) translateY(-2px)' : 'none',
        transformOrigin: 'bottom center',
        transition: 'transform 0.45s ease, clip-path 0.45s ease, border-color 0.3s',
        zIndex: open ? 2 : 1,
      }}>
        {!open && (
          <div style={{
            position: 'absolute', top: Math.round(10 * size), left: '50%', transform: 'translateX(-50%)',
            width: Math.round(8 * size), height: Math.round(8 * size),
            background: '#3a2a18', borderRadius: '50%',
          }} />
        )}
      </div>
      {open && (
        <div style={{
          position: 'absolute', bottom: Math.round(10 * size), left: Math.round(10 * size), right: Math.round(10 * size),
          height: Math.round(30 * size),
          background: LETTER_BG, border: `1px solid ${ACCENT}`,
          zIndex: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '70%', height: 1,
            background: '#3a2a18',
            boxShadow: `0 6px 0 0 #3a2a18, 0 12px 0 0 #3a2a18`,
          }} />
        </div>
      )}
    </div>
  )
}

// ── 편지 도착 팝업 ────────────────────────────────────────────────────────
function LetterArrivalPopup({ onConfirm, onLater }: { onConfirm: () => void; onLater: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 28,
      animation: 'popupFadeIn 0.3s ease-out',
    }}>
      <Envelope open size={1.6} />

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: 16,
          color: TEXT_BASE, letterSpacing: '0.12em',
        }}>
          편지가 도착했어.
        </div>
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: 9,
          color: '#4a3520', letterSpacing: '0.1em',
        }}>
          FROM. ???
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 200 }}>
        <button
          onClick={onConfirm}
          className='pixel-btn'
          style={{
            borderColor: ACCENT, color: ACCENT,
            fontFamily: 'var(--font-pixel)', fontSize: 11,
            letterSpacing: '0.08em', padding: '12px 0', width: '100%',
          }}
        >
          편지 확인하기
        </button>
        <button
          onClick={onLater}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            color: '#4a3520', letterSpacing: '0.08em', padding: '8px 0',
          }}
        >
          나중에
        </button>
      </div>
    </div>
  )
}

// ── 타이핑 텍스트 ─────────────────────────────────────────────────────────
function TypingText({ text, onDone }: { text: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')
    const timer = setInterval(() => {
      idxRef.current++
      setDisplayed(text.slice(0, idxRef.current))
      if (idxRef.current >= text.length) {
        clearInterval(timer)
        onDoneRef.current()
      }
    }, 40)
    return () => clearInterval(timer)
  }, [text])

  return <LetterLines text={displayed} />
}

// ── 편지 텍스트 렌더 (공통) ───────────────────────────────────────────────
function LetterLines({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-korean)', fontSize: 14,
      color: TEXT_BASE, lineHeight: 2.2, whiteSpace: 'pre-wrap',
      wordBreak: 'keep-all',
    }}>
      {text.split('\n').map((line, i, arr) => {
        const isSignature = line.trim().startsWith('-???')
        return (
          <span key={i}>
            <span style={isSignature ? { color: ACCENT } : undefined}>{line}</span>
            {i < arr.length - 1 && '\n'}
          </span>
        )
      })}
    </div>
  )
}

// ── 보관함 뷰 ─────────────────────────────────────────────────────────────
function ArchiveView({
  letters,
  onBack,
}: {
  letters: (Letter | ServerLetter)[]
  onBack: () => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const filtered = searchQuery.trim()
    ? letters.filter((l) => {
        const q = searchQuery.trim().replace(/\./g, '-')
        return l.date.startsWith(q)
      })
    : letters

  function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) return
    const normalized = q.trim().replace(/\./g, '-')
    const match = letters.find((l) => l.date.startsWith(normalized))
    if (match) {
      // scroll after render
      setTimeout(() => {
        itemRefs.current[match.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
    }
  }

  const totalCount = letters.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 12, borderBottom: `1px solid #1a1208`, marginBottom: 12,
      }}>
        <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: TEXT_BASE, letterSpacing: '0.08em' }}>
          지금까지 {totalCount}통의 편지를 받았어
        </div>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-pixel)', fontSize: 9,
            color: '#4a3520', letterSpacing: '0.06em',
          }}
        >← 돌아가기</button>
      </div>

      {/* 날짜 검색 */}
      <div style={{ marginBottom: 16 }}>
        <input
          type='text'
          placeholder='YYYY.MM.DD 또는 YYYY.MM'
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#1a1208', border: `1px solid #3a2a18`,
            color: TEXT_BASE,
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            letterSpacing: '0.06em',
            padding: '8px 12px',
            outline: 'none',
          }}
        />
      </div>

      {/* 결과 */}
      {filtered.length === 0 ? (
        <div style={{
          fontFamily: 'var(--font-pixel)', fontSize: 10,
          color: '#4a3520', letterSpacing: '0.06em',
          textAlign: 'center', paddingTop: 24,
        }}>
          그날은 편지가 없었어
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map((letter) => (
            <div
              key={letter.id}
              ref={(el) => { itemRefs.current[letter.id] = el }}
            >
              <button
                onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: expandedId === letter.id ? '#1a1208' : 'transparent',
                  border: 'none',
                  borderBottom: `1px solid #1a1208`,
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {/* 미읽음 점 */}
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: isRead(letter) ? 'transparent' : ACCENT,
                  border: isRead(letter) ? `1px solid #2a1e10` : 'none',
                }} />
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: '#4a3520', flexShrink: 0 }}>
                  {letter.date}
                </span>
                <span style={{
                  fontFamily: 'var(--font-korean)', fontSize: 12, color: '#6a5040',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>
                  {letter.content.split('\n')[0]}
                </span>
                <span style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 10,
                  color: expandedId === letter.id ? ACCENT : '#3a2a18',
                  transition: 'color 0.12s', flexShrink: 0,
                }}>
                  {expandedId === letter.id ? '▲' : '▼'}
                </span>
              </button>

              {expandedId === letter.id && (
                <div style={{
                  background: LETTER_BG, padding: '20px 20px 24px',
                  borderBottom: `1px solid #1a1208`,
                  animation: 'letterUnfold 0.2s ease-out',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-pixel)', fontSize: 8,
                    color: '#4a3520', letterSpacing: '0.08em', marginBottom: 14,
                  }}>
                    {formatArrivedAt(getArrivedAt(letter))}
                  </div>
                  <LetterLines text={letter.content} />
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button
                      onClick={() => setExpandedId(null)}
                      className='pixel-btn pixel-btn-sm'
                      style={{ fontSize: 10, letterSpacing: '0.06em' }}
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function NextChapterPage() {
  const navigate = useNavigate()
  const { isMobile } = useMobile()

  const [todayLetter, setTodayLetter] = useState<Letter | ServerLetter | null>(null)
  const [allLetters, setAllLetters]   = useState<(Letter | ServerLetter)[]>([])
  const [loading, setLoading]         = useState(false)
  const [pending, setPending]         = useState(false)
  const [pendingTime, setPendingTime] = useState('')

  const [showPopup, setShowPopup]   = useState(false)
  const [animPhase, setAnimPhase]   = useState<AnimPhase>('idle')
  const [view, setView]             = useState<View>('main')

  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const diaries = storage.getDiaries().filter((d) => d.content)
  const today   = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    void loadLetter()
    return () => { if (animTimer.current) clearTimeout(animTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadLetter() {
    if (SERVER_MODE) {
      setLoading(true)
      try {
        const [existing, all] = await Promise.all([fetchTodayLetter(), fetchAllLetters()])
        setAllLetters(all)

        if (existing) {
          if (!isDelivered({ scheduled_at: existing.scheduled_at })) {
            setPending(true)
            setPendingTime(formatScheduledAt(existing.scheduled_at))
          } else if (!existing.is_read) {
            // 미읽음 배달 편지 → 팝업 표시 + 읽음 처리
            void markServerLetterRead()
            const marked = { ...existing, is_read: true }
            setTodayLetter(marked)
            setAllLetters(all.map((l) => l.id === marked.id ? marked : l))
            setShowPopup(true)
          } else {
            setTodayLetter(existing)
          }
          return
        }

        if (diaries.length === 0) return

        const letter = await requestLetterGeneration(diaries)
        if (!isDelivered({ scheduled_at: letter.scheduled_at })) {
          setPending(true)
          setPendingTime(formatScheduledAt(letter.scheduled_at))
          setAllLetters((prev) => [letter, ...prev.filter((l) => l.date !== today)])
        } else {
          void markServerLetterRead()
          const marked = { ...letter, is_read: true }
          setTodayLetter(marked)
          setAllLetters((prev) => [marked, ...prev.filter((l) => l.date !== today)])
          setShowPopup(true)
        }
      } catch (e) {
        console.error('[NextChapter] 서버 편지 로드 실패:', e)
      } finally {
        setLoading(false)
      }
    } else {
      const letters  = storage.getLetters()
      const existing = letters.find((l) => l.date === today)
      setAllLetters(letters)

      if (existing) {
        if (!isDelivered({ arrivedAt: existing.arrivedAt })) {
          setPending(true)
          setPendingTime(formatScheduledAt(existing.arrivedAt))
        } else if (!existing.read) {
          // 미읽음 배달 편지 → 팝업 표시 + 읽음 처리
          storage.markLetterRead(existing.id)
          const marked = { ...existing, read: true }
          setTodayLetter(marked)
          setAllLetters(storage.getLetters())
          setShowPopup(true)
        } else {
          setTodayLetter(existing)
        }
        return
      }

      if (diaries.length === 0) return
      void generateLetterLocal()
    }
  }

  async function generateLetterLocal() {
    setLoading(true)
    try {
      const content = await claude.generateNextChapterLetter(diaries)
      const arrivedAt = randomArrivalTime(today)
      const letter: Letter = {
        id: uuid(), date: today, content, arrivedAt, read: false,
        createdAt: new Date().toISOString(),
      }
      storage.saveLetter(letter)

      if (!isDelivered({ arrivedAt })) {
        setPending(true)
        setPendingTime(formatScheduledAt(arrivedAt))
        setAllLetters(storage.getLetters())
      } else {
        storage.markLetterRead(letter.id)
        const marked = { ...letter, read: true }
        setTodayLetter(marked)
        setAllLetters(storage.getLetters())
        setShowPopup(true)
      }
    } catch (e) {
      console.error('[NextChapter] 편지 생성 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  // 봉투 열기 → 600ms 후 타이핑 시작
  function startLetterAnim() {
    setAnimPhase('opening')
    animTimer.current = setTimeout(() => setAnimPhase('typing'), 600)
  }

  const handleTypingDone = useCallback(() => setAnimPhase('done'), [])

  function handlePopupConfirm() {
    setShowPopup(false)
    startLetterAnim()
  }

  function handlePopupLater() {
    setShowPopup(false)
    navigate(-1)
  }

  // [편지 열기] — 이미 읽은 편지를 다시 볼 때
  function handleOpen() {
    if (!todayLetter) return
    startLetterAnim()
  }

  // [닫기] → 보관함으로
  function handleClose() {
    setView('archive')
    setAnimPhase('idle')
  }

  // 배달된 편지 목록 (보관함 표시용)
  const deliveredLetters = allLetters.filter((l) =>
    'arrivedAt' in l
      ? isDelivered({ arrivedAt: l.arrivedAt })
      : isDelivered({ scheduled_at: l.scheduled_at })
  )
  // 날짜 내림차순 (최신 먼저)
  const sortedDelivered = [...deliveredLetters].sort((a, b) =>
    b.date.localeCompare(a.date)
  )

  const opened = animPhase !== 'idle'
  const typingDone = animPhase === 'done'
  const px = isMobile ? 16 : 32

  return (
    <>
      <PixelStars />

      {/* ── 편지 도착 팝업 ── */}
      {showPopup && (
        <LetterArrivalPopup onConfirm={handlePopupConfirm} onLater={handlePopupLater} />
      )}

      <header className='app-header'>
        <button
          onClick={() => view === 'archive' ? setView('main') : navigate(-1)}
          style={{
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            color: 'var(--fire-org)', background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >
          {view === 'archive' ? '← 다음 챕터' : '← 주인공의 서랍'}
        </button>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.1em' }}>
            {view === 'archive' ? '편지 보관함' : '다음 챕터'}
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#4a3520', letterSpacing: '0.08em', marginTop: 2 }}>
            FROM. ???
          </div>
        </div>
      </header>

      <div style={{
        minHeight: '100vh',
        maxWidth: 600,
        margin: '0 auto',
        padding: `64px ${px}px 80px`,
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── 보관함 뷰 ── */}
        {view === 'archive' && (
          <ArchiveView
            letters={sortedDelivered}
            onBack={() => setView('main')}
          />
        )}

        {/* ── 메인 뷰 ── */}
        {view === 'main' && (
          <>
            {/* 미수신 (일기 없음) */}
            {!loading && !todayLetter && !pending && diaries.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
                <Mailbox />
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: TEXT_BASE, letterSpacing: '0.08em' }}>
                  아직 편지가 오지 않았어
                </div>
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 9,
                  color: '#4a3520', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 2,
                }}>
                  오늘 일기를 쓰면<br />???가 읽고 편지를 보내줄 거야
                </div>
              </div>
            )}

            {/* 생성 중 */}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
                <Envelope open={false} pulse />
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 11, color: '#4a3520', letterSpacing: '0.08em' }}>
                  편지를 기다리는 중<span style={{ animation: 'blink 1s step-end infinite' }}>...</span>
                </div>
              </div>
            )}

            {/* 도착 대기 중 */}
            {!loading && pending && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
                <Envelope open={false} />
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 10,
                  color: '#4a3520', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 2,
                }}>
                  편지가 배송되고 있어<br />
                  <span style={{ color: TEXT_BASE }}>{pendingTime}</span>
                </div>
              </div>
            )}

            {/* 수신 완료 */}
            {!loading && todayLetter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* 도착 시각 */}
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 9,
                  color: '#4a3520', letterSpacing: '0.08em', textAlign: 'center', paddingTop: 24,
                }}>
                  {formatArrivedAt(getArrivedAt(todayLetter))}
                </div>

                {/* 봉투 — letter-slide 애니메이션 래퍼 */}
                <div style={{
                  animation: animPhase === 'opening' ? 'envelopeShake 0.5s ease-out' : undefined,
                }}>
                  <Envelope open={opened} />
                </div>

                {/* 편지지가 나오는 슬라이드 */}
                {animPhase === 'opening' && (
                  <div style={{
                    overflow: 'hidden', height: 0,
                    animation: 'letterSlideIn 0.5s ease-out forwards',
                    animationDelay: '0.35s',
                  }} />
                )}

                {/* [편지 열기] 버튼 (미열람 → idle 상태) */}
                {!opened && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <button
                      onClick={handleOpen}
                      className='pixel-btn'
                      style={{
                        borderColor: ACCENT, color: ACCENT,
                        fontFamily: 'var(--font-pixel)', fontSize: 11,
                        letterSpacing: '0.08em', padding: '10px 24px',
                      }}
                    >
                      편지 열기
                    </button>
                  </div>
                )}

                {/* 편지 본문 */}
                {(animPhase === 'typing' || animPhase === 'done') && (
                  <div style={{
                    background: LETTER_BG,
                    border: `2px solid ${ACCENT}`,
                    padding: isMobile ? '20px 18px 24px' : '28px 28px 32px',
                    animation: 'letterUnfold 0.35s ease-out',
                    transformOrigin: 'top center',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-pixel)', fontSize: 8,
                      color: '#4a3520', letterSpacing: '0.1em', marginBottom: 20,
                    }}>
                      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                    </div>

                    {animPhase === 'typing'
                      ? <TypingText text={todayLetter.content} onDone={handleTypingDone} />
                      : <LetterLines text={todayLetter.content} />
                    }

                    <div style={{
                      fontFamily: 'var(--font-pixel)', fontSize: 8,
                      color: '#4a3520', letterSpacing: '0.1em', marginTop: 20,
                    }}>
                      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                    </div>

                    {/* [닫기] — 타이핑 완료 후 */}
                    {typingDone && (
                      <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <button
                          onClick={handleClose}
                          className='pixel-btn pixel-btn-sm'
                          style={{ fontSize: 10, letterSpacing: '0.06em' }}
                        >
                          닫기
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 지난 편지 보기 버튼 */}
            {!loading && sortedDelivered.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <button
                  onClick={() => setView('archive')}
                  className='pixel-btn pixel-btn-sm'
                  style={{ fontSize: 10, letterSpacing: '0.06em' }}
                >
                  지난 편지 보기
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes envPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.97); }
        }
        @keyframes letterUnfold {
          from { opacity: 0; transform: scaleY(0.6) translateY(-10px); }
          to   { opacity: 1; transform: scaleY(1) translateY(0); }
        }
        @keyframes popupFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes envelopeShake {
          0%   { transform: rotate(0deg); }
          20%  { transform: rotate(-1.5deg); }
          40%  { transform: rotate(1.5deg); }
          60%  { transform: rotate(-1deg); }
          80%  { transform: rotate(0.5deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes letterSlideIn {
          from { height: 0; opacity: 0; }
          to   { height: 60px; opacity: 1; }
        }
      `}</style>
    </>
  )
}
