import { useNavigate } from 'react-router-dom'
import { AppHeader } from '@/components/ui/AppHeader'
import { PixelStars } from '@/components/ui/PixelStars'
import { FlameAnimation } from '@/features/bonfire/FlameAnimation'
import { useBonfireSession, newBonfireSession } from '@/features/bonfire/useBonfireSession'
import { GenerateButton } from '@/features/diary/GenerateButton'
import { KindlingInput } from '@/features/kindling/KindlingInput'
import { KindlingList } from '@/features/kindling/KindlingList'
import { KeyImageUploader } from '@/features/media/KeyImageUploader'
import { isGenerationReady, getThresholdHint } from '@/lib/flame'
import { formatKoreanDate } from '@/lib/date'
import { useMobile } from '@/hooks/useMobile'

export default function BonfirePage() {
  const navigate = useNavigate()
  const { isMobile } = useMobile()

  const {
    sessionId,
    kindlings,
    flameLevel,
    keyImage,
    addKindling,
    removeKindling,
    reorderKindlings,
    uploadKeyImage,
    removeKeyImage,
  } = useBonfireSession()

  const count    = kindlings.length
  const ready    = isGenerationReady(count)
  const hint     = getThresholdHint(count)
  const gaugeBar = '█'.repeat(flameLevel) + '░'.repeat(5 - flameLevel)

  function handleNewSession() {
    if (count > 0 && !confirm('현재 땔감을 버리고 새 일기를 시작할까요?')) return
    newBonfireSession()
    window.location.reload()
  }

  // ── 모바일 레이아웃 ────────────────────────────────────────────────────
  // AppHeader를 bf-m-root 안으로 포함 → 전체 100dvh flex column 구성
  if (isMobile) {
    return (
      <>
        <PixelStars />
        <div className='bf-m-root'>
          {/* 헤더: bf-m-root 안에서 position:relative, height:48px */}
          <AppHeader />

          {/* 중간: 날짜/불꽃/게이지/이미지/버튼 — flex:1, space-evenly */}
          <div className='bf-m-middle'>
            {/* 날짜 */}
            <div className='scene-date bf-m-date'>
              <span className='date-main'>{formatKoreanDate()}</span>
              TODAY / BONFIRE NIGHT
            </div>

            {/* 불꽃 — max-height: 30dvh */}
            <div className='bonfire-scene bf-m-flame'>
              <FlameAnimation level={flameLevel} />
              <div className='pixel-ground' />
            </div>

            {/* 게이지 + 카운터 */}
            <div className='gauge-row'>
              <span className='gauge-bar'>{gaugeBar}</span>
              <span className='gauge-count'>[<span>{count}</span>/∞]</span>
            </div>

            {/* 힌트 */}
            <div className='threshold-hint bf-m-hint' style={{ color: ready ? 'var(--fire-tip)' : 'var(--text-dim)' }}>
              {hint}
            </div>

            {/* 대표 이미지 */}
            <KeyImageUploader keyImage={keyImage} onUpload={uploadKeyImage} onRemove={removeKeyImage} />

            {/* 새 일기 버튼 */}
            <button className='pixel-btn pixel-btn-sm' style={{ fontSize: 9 }} onClick={handleNewSession}>
              🔥 새 일기 시작
            </button>
          </div>

          {/* 하단: KINDLING 입력창 */}
          <div className='bf-m-bottom'>
            <div className='bf-m-bottom-hd'>
              <span className='bf-m-kcount'>KINDLING <b>{count}</b></span>
              {ready && (
                <button
                  className='bf-m-genbtn'
                  onClick={() => navigate(`/diary?session=${encodeURIComponent(sessionId)}`)}
                >
                  ▶ 일기 쓰기 ◀
                </button>
              )}
            </div>
            <KindlingInput onAdd={addKindling} />
          </div>
        </div>
      </>
    )
  }

  // ── PC 레이아웃 (기존 코드 완전 유지) ─────────────────────────────────
  return (
    <>
      <PixelStars />
      <AppHeader />

      <div className='bonfire-page'>
        {/* ── LEFT: Bonfire Stage ── */}
        <main className='bonfire-stage'>
          <div className='scene-date'>
            <span className='date-main'>{formatKoreanDate()}</span>
            TODAY / BONFIRE NIGHT
          </div>

          <div className='bonfire-scene'>
            <FlameAnimation level={flameLevel} />
            <div className='pixel-ground' />
          </div>

          <div className='gauge-row'>
            <span className='gauge-label'>FLAME</span>
            <span className='gauge-bar'>{gaugeBar}</span>
            <span className='gauge-count'>
              [<span>{count}</span>/∞]
            </span>
          </div>

          <div
            className='threshold-hint'
            style={{ color: ready ? 'var(--fire-tip)' : 'var(--text-dim)' }}
          >
            {hint}
          </div>

          <KeyImageUploader
            keyImage={keyImage}
            onUpload={uploadKeyImage}
            onRemove={removeKeyImage}
          />

          <div style={{ display:'flex', gap:8, marginTop:16, flexWrap:'wrap', justifyContent:'center' }}>
            <button
              className='pixel-btn pixel-btn-sm'
              style={{ fontSize:9 }}
              onClick={handleNewSession}
            >
              🔥 새 일기 시작
            </button>
          </div>
        </main>

        {/* ── RIGHT: Kindling Panel ── */}
        <aside className='right-panel'>
          <div className='panel-header'>
            <div className='panel-title'>
              KINDLING
              <span className='count-box'>{count}</span>
            </div>
            <span className='px-tag px-tag-white'>CTRL+ENTER</span>
          </div>

          <KindlingList kindlings={kindlings} onRemove={removeKindling} onReorder={reorderKindlings} />

          <KindlingInput onAdd={addKindling} />
        </aside>
      </div>

      <GenerateButton visible={ready} sessionId={sessionId} />
    </>
  )
}
