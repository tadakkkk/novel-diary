import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMobile } from '@/hooks/useMobile'

const DRAWER_BG      = '#0d0a07'
const DRAWER_BORDER  = '#2a1e0f'
const DRAWER_DIVIDER = '#1a1208'
const TEXT_BASE      = '#c8b49a'
const TEXT_DESC      = '#4a3520'
const TEXT_NUM       = '#3a2a18'
const HANDLE_BG      = '#1e1610'
const HANDLE_PIN     = '#3a2a18'
const ACCENT         = '#EF9F27'
const HEADER_BG      = '#111008'

interface SlotDef {
  num: string
  name: string
  desc: string
  path: string
  isNew?: boolean
}

const SLOTS: SlotDef[] = [
  { num: '01', name: '과거의 주인공에게 묻기', desc: '일기 기반 대화',    path: '/past-self' },
  { num: '02', name: '주인공 도감',           desc: '성향 분석 + 배지', path: '/character-dex' },
  { num: '03', name: '주인공의 이야기',        desc: '소설로 엮기',      path: '/story' },
  { num: '04', name: '다음 챕터',             desc: '오늘 ???의 편지', path: '/next-chapter' },
]

interface Props {
  onClose: () => void
}

function DrawerSlot({ slot, onNavigate }: { slot: SlotDef; onNavigate: (path: string) => void }) {
  const [hovered, setHovered] = useState(false)
  const { isSmall } = useMobile()

  return (
    <button
      onClick={() => onNavigate(slot.path)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: `0 16px`,
        height: 60,
        background: hovered ? '#1a1208' : DRAWER_BG,
        border: 'none',
        borderBottom: `1px solid ${DRAWER_DIVIDER}`,
        cursor: 'pointer',
        transition: 'background 0.12s',
        textAlign: 'left',
      }}
    >
      {/* 번호 */}
      <div style={{
        fontFamily: 'var(--font-pixel)',
        fontSize: 9,
        color: hovered ? TEXT_BASE : TEXT_NUM,
        letterSpacing: '0.06em',
        flexShrink: 0,
        width: 20,
        transition: 'color 0.12s',
      }}>
        {slot.num}
      </div>

      {/* 이름 + 설명 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: isSmall ? 9 : 10,
            color: hovered ? TEXT_BASE : '#8a7060',
            letterSpacing: '0.06em',
            transition: 'color 0.12s',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {slot.name}
          </span>
          {slot.isNew && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 7,
                color: ACCENT,
                border: `1px solid ${ACCENT}`,
                padding: '1px 4px',
                letterSpacing: '0.06em',
              }}>NEW</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
            </span>
          )}
        </div>
        <div style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 8,
          color: hovered ? TEXT_DESC : '#2a1e10',
          letterSpacing: '0.05em',
          marginTop: 3,
          transition: 'color 0.12s',
        }}>
          {slot.desc}
        </div>
      </div>

      {/* 손잡이 (가운데 정렬) */}
      <div style={{
        width: 36,
        height: 16,
        border: `2px solid ${hovered ? ACCENT : HANDLE_PIN}`,
        background: HANDLE_BG,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'border-color 0.12s',
      }}>
        <div style={{
          width: 16,
          height: 5,
          background: hovered ? ACCENT : HANDLE_PIN,
          transition: 'background 0.12s',
        }} />
      </div>

      {/* 화살표 */}
      <div style={{
        fontFamily: 'var(--font-pixel)',
        fontSize: 12,
        color: hovered ? ACCENT : TEXT_NUM,
        transform: hovered ? 'translateX(3px)' : 'translateX(0)',
        transition: 'color 0.12s, transform 0.12s',
        flexShrink: 0,
        lineHeight: 1,
      }}>›</div>
    </button>
  )
}

export function DrawerPopup({ onClose }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isMobile, isSmall } = useMobile()
  const initialPath = useRef(location.pathname)

  // location이 바뀐 뒤에 닫기 — route 전환 render가 먼저, drawer 해제는 그 다음
  useEffect(() => {
    if (location.pathname !== initialPath.current) {
      onClose()
    }
  }, [location.pathname, onClose])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  function handleNavigate(path: string) {
    navigate(path)
    // onClose는 useEffect에서 location 변경 감지 후 처리
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: isSmall ? '8px' : isMobile ? '12px' : '20px 16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 480,
          background: DRAWER_BG,
          border: `3px solid ${DRAWER_BORDER}`,
          boxShadow: `inset 0 0 0 1px ${DRAWER_BORDER}, 4px 4px 0 0 #1a1208`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          padding: '12px 16px 10px',
          borderBottom: `2px solid ${DRAWER_DIVIDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: HEADER_BG,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 12,
              color: ACCENT, letterSpacing: '0.1em',
            }}>
              ▸ 주인공의 서랍
            </div>
            <div style={{
              fontFamily: 'var(--font-pixel)', fontSize: 7,
              color: TEXT_NUM, letterSpacing: '0.08em', marginTop: 3,
            }}>
              THE PROTAGONIST'S DRAWER
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              fontFamily: 'var(--font-pixel)', fontSize: 10,
              color: TEXT_DESC, background: 'transparent', border: 'none',
              cursor: 'pointer', letterSpacing: '0.06em', padding: '4px 6px',
            }}
          >[ x ]</button>
        </div>

        {/* 슬롯 목록 */}
        {SLOTS.map((slot) => (
          <DrawerSlot key={slot.num} slot={slot} onNavigate={handleNavigate} />
        ))}

        {/* 하단 바닥 */}
        <div style={{
          height: 10,
          background: HEADER_BG,
          borderTop: `1px solid ${DRAWER_DIVIDER}`,
        }} />
      </div>
    </div>
  )
}
