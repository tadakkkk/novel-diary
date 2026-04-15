import { useEffect, useRef, useState } from 'react'
import { type Badge, type CharacterProfile } from '@/types'
import * as storage from '@/services/storage'
import * as claude from '@/services/claude/claude-service'
import { useMobile } from '@/hooks/useMobile'

// ── 레이더(스탯) 바 차트 ──────────────────────────────────────────────────
function StatBars({ stats }: { stats: Array<{ label: string; value: number }> }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {stats.map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', width: 28, flexShrink: 0, letterSpacing: '0.04em' }}>{label}</div>
          <div style={{ flex: 1, height: 10, background: '#1a1a1a', border: '1px solid var(--gray-2)', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${value}%`,
              background: value >= 75 ? 'var(--fire-tip)' : value >= 50 ? 'var(--fire-org)' : 'var(--fire-amb)',
              transition: 'width 0.8s ease-out',
            }} />
            {/* 눈금 */}
            {[25, 50, 75].map((tick) => (
              <div key={tick} style={{ position: 'absolute', top: 0, left: `${tick}%`, width: 1, height: '100%', background: '#2a2a2a' }} />
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--fire-org)', width: 24, textAlign: 'right', flexShrink: 0 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── SVG 레이더 차트 ───────────────────────────────────────────────────────
function RadarChart({ stats, size = 220 }: { stats: Array<{ label: string; value: number }>; size?: number }) {
  if (stats.length === 0) return null
  const N = stats.length
  const cx = size / 2, cy = size / 2, R = size * 0.386

  function pt(i: number, r: number) {
    const angle = (Math.PI * 2 * i / N) - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  }

  const gridLevels = [0.25, 0.5, 0.75, 1]
  const dataPoints = stats.map(({ value }, i) => pt(i, R * value / 100))
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'

  return (
    <svg width={size} height={size} style={{ display: 'block', margin: '0 auto' }}>
      {/* 배경 원 */}
      {gridLevels.map((lvl, gi) => {
        const pts = stats.map((_, i) => pt(i, R * lvl))
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + 'Z'
        return <path key={gi} d={path} fill='none' stroke='#2a2a2a' strokeWidth={1} />
      })}
      {/* 축선 */}
      {stats.map((_, i) => {
        const end = pt(i, R)
        return <line key={i} x1={cx} y1={cy} x2={end.x.toFixed(1)} y2={end.y.toFixed(1)} stroke='#2a2a2a' strokeWidth={1} />
      })}
      {/* 데이터 영역 */}
      <path d={dataPath} fill='rgba(255,90,0,0.18)' stroke='var(--fire-org)' strokeWidth={2} />
      {/* 데이터 포인트 */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={3} fill='var(--fire-tip)' />
      ))}
      {/* 라벨 */}
      {stats.map(({ label }, i) => {
        const p = pt(i, R + 16)
        return (
          <text key={i} x={p.x.toFixed(1)} y={p.y.toFixed(1)}
            textAnchor='middle' dominantBaseline='middle'
            style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, fill: 'var(--gray-4)' }}>
            {label}
          </text>
        )
      })}
    </svg>
  )
}

// ── 배지 그리드 ───────────────────────────────────────────────────────────
const BADGE_SLOTS = 9  // 3×3 그리드

function BadgeGrid({ badges, cols = 3 }: { badges: Badge[]; cols?: number }) {
  const slots = Array(BADGE_SLOTS).fill(null).map((_, i) => badges[i] ?? null)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 8 }}>
      {slots.map((badge, i) => (
        <div key={i} style={{
          border: badge ? '2px solid var(--fire-org)' : '2px solid #222',
          background: badge ? '#1a0a00' : '#0a0a0a',
          padding: '10px 8px', textAlign: 'center',
          boxShadow: badge ? '0 0 8px rgba(255,90,0,0.2)' : 'none',
          minHeight: 80,
        }}>
          {badge ? (
            <>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: 'var(--fire-tip)', marginBottom: 4 }}>★</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-org)', letterSpacing: '0.04em', marginBottom: 3 }}>{badge.title}</div>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 10, color: 'var(--gray-4)', lineHeight: 1.4, marginBottom: 4 }}>{badge.desc}</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--fire-amb)', border: '1px solid #3a1a00', padding: '1px 4px', display: 'inline-block' }}>{badge.tag}</div>
            </>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 16, color: '#222', marginBottom: 4 }}>★</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 10, color: '#222', letterSpacing: '0.1em' }}>???</div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────
export function CharacterDex() {
  const [profile, setProfile] = useState<CharacterProfile | null>(() => storage.getCharacterProfile())
  const [badges] = useState<Badge[]>(() => storage.getBadges())
  const [loadingStory, setLoadingStory] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [view, setView] = useState<'story' | 'stats' | 'badges'>('story')
  const hasGenerated = useRef(false)
  const { isMobile, isSmall } = useMobile()

  const diaries = storage.getDiaries().filter((d) => d.content)

  // 스탯이 없으면 자동 생성 (진입 시 1회)
  const noApiAccess = !storage.getApiKey() && !import.meta.env.VITE_API_URL
  useEffect(() => {
    if (hasGenerated.current || profile?.stats?.length || noApiAccess || diaries.length === 0) return
    hasGenerated.current = true
    setLoadingStats(true)
    claude.generateCharacterStats(diaries).then((stats) => {
      const next: CharacterProfile = { story: profile?.story ?? '', stats, generatedAt: new Date().toISOString() }
      setProfile(next)
      storage.saveCharacterProfile(next)
    }).finally(() => setLoadingStats(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerateStory() {
    if (loadingStory) return
    setLoadingStory(true)
    try {
      const story = await claude.generateCharacterStory(diaries)
      const stats = profile?.stats ?? []
      const next: CharacterProfile = { story, stats, generatedAt: new Date().toISOString() }
      setProfile(next)
      storage.saveCharacterProfile(next)
    } finally {
      setLoadingStory(false)
    }
  }

  const TAB_BTNS: Array<{ key: typeof view; label: string }> = [
    { key: 'story', label: '스토리' },
    { key: 'stats', label: '성향' },
    { key: 'badges', label: `배지 (${badges.length})` },
  ]

  return (
    <div style={{ padding: '14px 16px 18px' }}>
      {/* 서브탭 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {TAB_BTNS.map(({ key, label }) => (
          <button key={key} onClick={() => setView(key)}
            style={{
              fontFamily: 'var(--font-pixel)', fontSize: 9, letterSpacing: '0.06em',
              background: view === key ? 'var(--fire-org)' : 'transparent',
              color: view === key ? '#000' : 'var(--gray-4)',
              border: `1px solid ${view === key ? 'var(--fire-org)' : 'var(--gray-3)'}`,
              padding: '5px 10px', cursor: 'pointer',
            }}>{label}</button>
        ))}
      </div>

      {/* ── 스토리 ── */}
      {view === 'story' && (
        <div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-amb)', letterSpacing: '0.1em', marginBottom: 10 }}>► CHARACTER PROFILE</div>
          {profile?.story ? (
            <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-5)', lineHeight: 1.9, wordBreak: 'keep-all', whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--fire-org)', paddingLeft: 12, marginBottom: 14 }}>
              {profile.story}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--text-off)', marginBottom: 14, lineHeight: 1.8 }}>
              {diaries.length === 0 ? '일기가 쌓이면 캐릭터 스토리가 만들어져요.' : '아래 버튼으로 스토리를 생성해보세요.'}
            </div>
          )}
          <button
            className='pixel-btn pixel-btn-fire'
            style={{ fontSize: 9, padding: '8px 14px' }}
            disabled={loadingStory || noApiAccess || diaries.length === 0}
            onClick={handleGenerateStory}>
            {loadingStory ? '▸ 생성 중...' : profile?.story ? '↺ 스토리 업데이트' : '▸ 캐릭터 스토리 보기'}
          </button>
          {profile?.generatedAt && (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-off)', marginTop: 6 }}>
              {new Date(profile.generatedAt).toLocaleDateString('ko')} 생성
            </div>
          )}
        </div>
      )}

      {/* ── 성향 스탯 ── */}
      {view === 'stats' && (
        <div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-amb)', letterSpacing: '0.1em', marginBottom: 12 }}>► ABILITY STATS</div>
          {loadingStats ? (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--gray-4)', textAlign: 'center', padding: '24px 0' }}>분석 중...</div>
          ) : profile?.stats && profile.stats.length > 0 ? (
            <>
              <RadarChart stats={profile.stats} size={isSmall ? 180 : isMobile ? 200 : 220} />
              <div style={{ marginTop: 16 }}>
                <StatBars stats={profile.stats} />
              </div>
            </>
          ) : (
            <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--text-off)', textAlign: 'center', padding: '24px 0' }}>
              {diaries.length === 0 ? '일기가 없어 분석할 수 없어요.' : '분석 중이에요...'}
            </div>
          )}
        </div>
      )}

      {/* ── 배지 ── */}
      {view === 'badges' && (
        <div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-amb)', letterSpacing: '0.1em', marginBottom: 12 }}>► ACHIEVEMENT BADGES</div>
          {badges.length === 0 && (
            <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--text-off)', marginBottom: 12, lineHeight: 1.7 }}>
              일기를 저장할 때 의미 있는 순간이 있으면 자동으로 배지가 생성돼요.
            </div>
          )}
          <BadgeGrid badges={badges} cols={isSmall ? 2 : 3} />
        </div>
      )}
    </div>
  )
}
