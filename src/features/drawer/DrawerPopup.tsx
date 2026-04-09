import { useEffect, useState } from 'react'
import { PastSelfChat } from './PastSelfChat'
import { CharacterDex } from './CharacterDex'
import { StoryTab } from './StoryTab'
import { useMobile } from '@/hooks/useMobile'

type Tab = 0 | 1 | 2

interface Props {
  onClose: () => void
}

const TABS = [
  { label: '과거의 주인공에게 묻기', icon: '✉' },
  { label: '주인공 도감',          icon: '◈' },
  { label: '주인공의 이야기',       icon: '▒' },
]

export function DrawerPopup({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab | null>(null)
  const { isMobile, isSmall } = useMobile()

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: isSmall ? '8px' : isMobile ? '12px 12px' : '20px 16px',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 520,
        background: '#0a0a0a',
        border: '3px solid var(--white)',
        boxShadow: 'inset 0 0 0 2px var(--white), inset 0 0 0 5px #0a0a0a, 6px 6px 0 0 #333',
        maxHeight: isSmall ? '95vh' : '90vh', overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>

        {/* ── 서랍장 헤더 ── */}
        <div style={{
          padding: '12px 16px 10px',
          borderBottom: '2px solid var(--gray-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#111',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 13, color: 'var(--fire-org)', letterSpacing: '0.1em' }}>
              ▸ 주인공의 서랍
            </div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-off)', letterSpacing: '0.08em', marginTop: 3 }}>
              THE PROTAGONIST'S DRAWER
            </div>
          </div>
          <button className='modal-close' onClick={onClose}>[ x ]</button>
        </div>

        {/* ── 서랍 3칸 ── */}
        {TABS.map((tab, i) => {
          const isOpen = activeTab === i
          return (
            <div key={i}>
              {/* 서랍 손잡이 행 */}
              <button
                onClick={() => setActiveTab(isOpen ? null : i as Tab)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0 16px',
                  height: 52,
                  background: isOpen ? '#1a1000' : '#0d0d0d',
                  border: 'none',
                  borderBottom: `2px solid ${isOpen ? 'var(--fire-org)' : 'var(--gray-2)'}`,
                  borderTop: i === 0 ? 'none' : undefined,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}>
                {/* 픽셀 손잡이 */}
                <div style={{
                  width: 32, height: 14,
                  border: `2px solid ${isOpen ? 'var(--fire-org)' : 'var(--gray-3)'}`,
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isOpen ? '#3a2000' : '#1a1a1a',
                  flexShrink: 0,
                  boxShadow: isOpen ? '0 0 6px var(--fire-org)' : 'none',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ width: 14, height: 4, background: isOpen ? 'var(--fire-org)' : 'var(--gray-3)', borderRadius: 1 }} />
                </div>
                {/* 서랍 번호 */}
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 8,
                  color: isOpen ? 'var(--fire-amb)' : 'var(--gray-3)',
                  letterSpacing: '0.06em', flexShrink: 0,
                }}>
                  0{i + 1}
                </div>
                {/* 탭 이름 */}
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: isSmall ? 9 : 10,
                  color: isOpen ? 'var(--fire-tip)' : 'var(--gray-5)',
                  letterSpacing: isSmall ? '0.04em' : '0.08em', flex: 1, textAlign: 'left',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {tab.icon} {tab.label}
                </div>
                {/* 열림 표시 */}
                <div style={{
                  fontFamily: 'var(--font-pixel)', fontSize: 9,
                  color: isOpen ? 'var(--fire-org)' : 'var(--gray-3)',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}>▼</div>
              </button>

              {/* 콘텐츠 영역 */}
              {isOpen && (
                <div style={{
                  borderBottom: '2px solid var(--fire-org)',
                  background: '#070707',
                  animation: 'drawerOpen 0.18s ease-out',
                }}>
                  {i === 0 && <PastSelfChat />}
                  {i === 1 && <CharacterDex />}
                  {i === 2 && <StoryTab onClose={onClose} />}
                </div>
              )}
            </div>
          )
        })}

        {/* 서랍장 하단 바닥 */}
        <div style={{ height: 12, background: '#111', borderTop: '2px solid var(--gray-2)' }} />
      </div>

      <style>{`
        @keyframes drawerOpen {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
