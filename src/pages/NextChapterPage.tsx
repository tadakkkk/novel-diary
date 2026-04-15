import { useEffect, useRef, useState } from 'react'
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

const ACCENT   = '#EF9F27'
const LETTER_BG = '#1a1208'
const TEXT_BASE = '#c8b49a'

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

// 편지가 도착 가능한지 (scheduled_at가 현재 시각 이전)
function isDelivered(letter: { arrivedAt: string } | { scheduled_at: string }): boolean {
  const ts = 'arrivedAt' in letter ? letter.arrivedAt : letter.scheduled_at
  return new Date(ts) <= new Date()
}

// scheduled_at 포맷: "내일 오전 3:17에 도착할 예정이야"
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

// ── 우체통 픽셀아트 (미수신용) ────────────────────────────────────────────
function Mailbox() {
  return (
    <div style={{ position: 'relative', width: 80, height: 100, margin: '0 auto' }}>
      {/* 기둥 */}
      <div style={{
        position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: 10, height: 36,
        background: '#2a1e10',
      }} />
      {/* 우체통 몸체 */}
      <div style={{
        position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
        width: 64, height: 62,
        background: '#1e1610',
        border: `2px solid #3a2a18`,
        borderRadius: '8px 8px 4px 4px',
      }}>
        {/* 반원 지붕 */}
        <div style={{
          position: 'absolute', top: -1, left: -2, right: -2, height: 22,
          background: '#261c10',
          border: `2px solid #3a2a18`,
          borderRadius: '30px 30px 0 0',
          borderBottom: 'none',
        }} />
        {/* 투입구 */}
        <div style={{
          position: 'absolute', bottom: 16, left: 8, right: 8, height: 6,
          background: '#0d0a07',
          border: `1px solid #2a1e10`,
          borderRadius: 1,
        }} />
        {/* 경첩 점 */}
        <div style={{
          position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)',
          width: 6, height: 6,
          background: '#3a2a18',
          borderRadius: '50%',
        }} />
      </div>
      {/* 깃발 (내려간 상태 = 편지 없음) */}
      <div style={{
        position: 'absolute', top: 12, right: 4,
        width: 3, height: 18,
        background: '#3a2a18',
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 3,
          width: 10, height: 7,
          background: '#4a3520',
          borderRadius: '0 2px 2px 0',
        }} />
      </div>
    </div>
  )
}

// ── 봉투 픽셀아트 (수신용) ────────────────────────────────────────────────
function Envelope({ open, pulse }: { open: boolean; pulse?: boolean }) {
  return (
    <div style={{
      position: 'relative',
      width: 96, height: 72,
      margin: '0 auto',
      animation: pulse ? 'envPulse 2s ease-in-out infinite' : undefined,
    }}>
      {/* 봉투 몸체 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: 56,
        background: '#1e1610',
        border: `2px solid ${open ? ACCENT : '#3a2a18'}`,
        transition: 'border-color 0.3s',
      }}>
        {/* 봉투 가운데 모서리 선 */}
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: '100%',
          backgroundImage: `linear-gradient(135deg, transparent 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 50.5%, transparent 50.5%)`,
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0, height: '100%',
          backgroundImage: `linear-gradient(45deg, transparent 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 49.5%, ${open ? '#3a2a18' : '#2a1e10'} 50.5%, transparent 50.5%)`,
        }} />
      </div>
      {/* 봉투 플랩 (윗덮개) */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 40,
        background: '#1e1610',
        border: `2px solid ${open ? ACCENT : '#3a2a18'}`,
        borderBottom: 'none',
        clipPath: open
          ? 'polygon(0 0, 100% 0, 100% 100%, 0 100%)'
          : 'polygon(0 0, 100% 0, 50% 85%)',
        transform: open ? 'rotateX(160deg) translateY(-2px)' : 'none',
        transformOrigin: 'bottom center',
        transition: 'transform 0.4s ease, clip-path 0.4s ease, border-color 0.3s',
        zIndex: open ? 2 : 1,
      }}>
        {!open && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 8, height: 8,
            background: '#3a2a18',
            borderRadius: '50%',
          }} />
        )}
      </div>
      {/* 편지가 살짝 보임 (열린 상태) */}
      {open && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, right: 10,
          height: 30,
          background: LETTER_BG,
          border: `1px solid ${ACCENT}`,
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
      <style>{`
        @keyframes envPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(0.97); }
        }
        @keyframes letterUnfold {
          from { opacity: 0; transform: scaleY(0.6) translateY(-10px); }
          to   { opacity: 1; transform: scaleY(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── 타이핑 텍스트 ─────────────────────────────────────────────────────────
function TypingText({ text, onDone }: { text: string; onDone: () => void }) {
  const [displayed, setDisplayed] = useState('')
  const idxRef = useRef(0)

  useEffect(() => {
    idxRef.current = 0
    setDisplayed('')
    const timer = setInterval(() => {
      idxRef.current++
      setDisplayed(text.slice(0, idxRef.current))
      if (idxRef.current >= text.length) {
        clearInterval(timer)
        onDone()
      }
    }, 40)
    return () => clearInterval(timer)
  }, [text, onDone])

  return (
    <div style={{
      fontFamily: 'var(--font-korean)', fontSize: 14,
      color: TEXT_BASE, lineHeight: 2.2, whiteSpace: 'pre-wrap',
      wordBreak: 'keep-all',
    }}>
      {/* -??? 서명 줄 주황 처리 */}
      {displayed.split('\n').map((line, i, arr) => {
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

// ── 편지 전체 표시 ────────────────────────────────────────────────────────
function LetterContent({ content }: { content: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-korean)', fontSize: 14,
      color: TEXT_BASE, lineHeight: 2.2, whiteSpace: 'pre-wrap',
      wordBreak: 'keep-all',
    }}>
      {content.split('\n').map((line, i, arr) => {
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

// ── 메인 페이지 ───────────────────────────────────────────────────────────
export default function NextChapterPage() {
  const navigate = useNavigate()
  const { isMobile } = useMobile()

  // 공통: 표시용 편지 (Letter | ServerLetter 모두 저장, content + scheduled/arrivedAt 포함)
  const [todayLetter, setTodayLetter] = useState<Letter | ServerLetter | null>(null)
  const [allLetters, setAllLetters]   = useState<(Letter | ServerLetter)[]>([])
  const [loading, setLoading]         = useState(false)
  const [pending, setPending]         = useState(false)   // 편지 도착 대기 중
  const [pendingTime, setPendingTime] = useState('')      // "내일 오전 3:17에 도착할 예정이야"
  const [opened, setOpened]           = useState(false)
  const [typingDone, setTypingDone]   = useState(false)
  const [showArchive, setShowArchive] = useState(false)
  const [expandedId, setExpandedId]   = useState<string | null>(null)

  const diaries = storage.getDiaries().filter((d) => d.content)
  const today   = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    void loadLetter()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadLetter() {
    if (SERVER_MODE) {
      // ── 서버 모드 ─────────────────────────────────────────────────────
      setLoading(true)
      try {
        const [existing, all] = await Promise.all([fetchTodayLetter(), fetchAllLetters()])
        setAllLetters(all)

        if (existing) {
          if (!isDelivered({ scheduled_at: existing.scheduled_at })) {
            setPending(true)
            setPendingTime(formatScheduledAt(existing.scheduled_at))
          } else {
            setTodayLetter(existing)
          }
          return
        }

        // 일기 없으면 생성 안 함
        if (diaries.length === 0) return

        // 서버에 편지 생성 요청
        const letter = await requestLetterGeneration(diaries)
        if (!isDelivered({ scheduled_at: letter.scheduled_at })) {
          setPending(true)
          setPendingTime(formatScheduledAt(letter.scheduled_at))
          // 생성은 했지만 도착 전 — 목록에는 반영
          setAllLetters((prev) => [letter, ...prev.filter((l) => l.date !== today)])
        } else {
          setTodayLetter(letter)
          setAllLetters((prev) => [letter, ...prev.filter((l) => l.date !== today)])
        }
      } catch (e) {
        console.error('[NextChapter] 서버 편지 로드 실패:', e)
      } finally {
        setLoading(false)
      }
    } else {
      // ── 로컬 모드 (VITE_API_URL 없음) ────────────────────────────────
      const letters  = storage.getLetters()
      const existing = letters.find((l) => l.date === today)
      setAllLetters(letters)
      if (existing) {
        if (!isDelivered({ arrivedAt: existing.arrivedAt })) {
          setPending(true)
          setPendingTime(formatScheduledAt(existing.arrivedAt))
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
        setTodayLetter(letter)
        setAllLetters(storage.getLetters())
      }
    } catch (e) {
      console.error('[NextChapter] 편지 생성 실패:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    if (!todayLetter) return
    setOpened(true)
    if ('read' in todayLetter && !todayLetter.read) {
      storage.markLetterRead(todayLetter.id)
      setTodayLetter({ ...todayLetter, read: true } as Letter)
    } else if ('is_read' in todayLetter && !todayLetter.is_read) {
      void markServerLetterRead()
      setTodayLetter({ ...todayLetter, is_read: true } as ServerLetter)
    }
  }

  // 편지의 도착 시각 (Letter or ServerLetter)
  function getArrivedAt(letter: Letter | ServerLetter): string {
    return 'arrivedAt' in letter ? letter.arrivedAt : letter.scheduled_at
  }

  const px = isMobile ? 16 : 32

  return (
    <>
      <PixelStars />
      <header className='app-header'>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            color: 'var(--fire-org)', background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >← 주인공의 서랍</button>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.1em' }}>
            다음 챕터
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#4a3520', letterSpacing: '0.08em', marginTop: 2 }}>
            FROM. ???
          </div>
        </div>
      </header>

      <div style={{
        minHeight: '100vh',
        paddingTop: 64,
        maxWidth: 600,
        margin: '0 auto',
        padding: `64px ${px}px 60px`,
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── 미수신 (일기 없음) ── */}
        {!loading && !todayLetter && !pending && diaries.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
            <Mailbox />
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 12,
              color: TEXT_BASE, letterSpacing: '0.08em',
            }}>
              아직 편지가 오지 않았어
            </div>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 9,
              color: '#4a3520', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 2,
            }}>
              오늘 일기를 쓰면<br />-???가 읽고 편지를 보내줄 거야
            </div>
          </div>
        )}

        {/* ── 생성 중 ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
            <Envelope open={false} pulse />
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 11,
              color: '#4a3520', letterSpacing: '0.08em',
            }}>
              편지를 기다리는 중<span style={{ animation: 'blink 1s step-end infinite' }}>...</span>
            </div>
          </div>
        )}

        {/* ── 도착 대기 중 ── */}
        {!loading && pending && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 64, gap: 24 }}>
            <Envelope open={false} />
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 10,
              color: '#4a3520', letterSpacing: '0.06em', textAlign: 'center', lineHeight: 2,
            }}>
              편지가 쓰여지고 있어<br />
              <span style={{ color: TEXT_BASE }}>{pendingTime}</span>
            </div>
          </div>
        )}

        {/* ── 수신 완료 ── */}
        {!loading && todayLetter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* 도착 시각 */}
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 9,
              color: '#4a3520', letterSpacing: '0.08em', textAlign: 'center',
              paddingTop: 24,
            }}>
              {formatArrivedAt(getArrivedAt(todayLetter))}
            </div>

            {/* 봉투 */}
            <Envelope open={opened} />

            {/* 편지 열기 버튼 */}
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
            {opened && (
              <div style={{
                background: LETTER_BG,
                border: `2px solid ${ACCENT}`,
                padding: isMobile ? '20px 18px 24px' : '28px 28px 32px',
                animation: 'letterUnfold 0.35s ease-out',
                transformOrigin: 'top center',
              }}>
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 8,
                  color: '#4a3520', letterSpacing: '0.1em',
                  marginBottom: 20,
                }}>
                  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                </div>

                {!typingDone
                  ? <TypingText text={todayLetter.content} onDone={() => setTypingDone(true)} />
                  : <LetterContent content={todayLetter.content} />
                }

                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 8,
                  color: '#4a3520', letterSpacing: '0.1em',
                  marginTop: 20,
                }}>
                  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
                </div>
              </div>
            )}

            {/* 지난 편지 보기 버튼 */}
            {opened && typingDone && allLetters.length > 1 && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button
                  onClick={() => setShowArchive((v) => !v)}
                  className='pixel-btn pixel-btn-sm'
                  style={{ fontSize: 10, letterSpacing: '0.06em' }}
                >
                  {showArchive ? '▲ 보관함 닫기' : '▼ 지난 편지 보기'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 보관함 ── */}
        {showArchive && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 9,
              color: '#4a3520', letterSpacing: '0.1em',
              paddingBottom: 10, borderBottom: `1px solid #1a1208`,
              marginBottom: 8,
            }}>
              ARCHIVE — {allLetters.length}통
            </div>
            {allLetters.filter((l) => l.date !== today).map((letter) => (
              <div key={letter.id}>
                <button
                  onClick={() => setExpandedId(expandedId === letter.id ? null : letter.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px',
                    background: expandedId === letter.id ? '#1a1208' : 'transparent',
                    border: 'none',
                    borderBottom: `1px solid #1a1208`,
                    cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: '#4a3520', flexShrink: 0 }}>
                    {letter.date}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-korean)', fontSize: 12,
                    color: '#6a5040',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                  }}>
                    {letter.content.split('\n')[0]}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-pixel)', fontSize: 10,
                    color: expandedId === letter.id ? ACCENT : '#3a2a18',
                    transition: 'color 0.12s',
                  }}>
                    {expandedId === letter.id ? '▲' : '▼'}
                  </span>
                </button>
                {expandedId === letter.id && (
                  <div style={{
                    background: LETTER_BG,
                    padding: '16px 20px 20px',
                    borderBottom: `1px solid #1a1208`,
                    animation: 'letterUnfold 0.2s ease-out',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-pixel)', fontSize: 8,
                      color: '#4a3520', letterSpacing: '0.08em', marginBottom: 12,
                    }}>
                      {formatArrivedAt(getArrivedAt(letter))}
                    </div>
                    <LetterContent content={letter.content} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </>
  )
}
