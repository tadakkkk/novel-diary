import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { isQuotaExceeded } from '@/services/quota/quota-service'
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
  const { showPaywall } = useAppContext()
  const [prefillValue, setPrefillValue] = useState('')

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

  function handleEditWithQuestion(id: string, newText: string) {
    removeKindling(id)
    setPrefillValue(newText)
  }

  async function handleGoWrite() {
    if (await isQuotaExceeded()) { showPaywall(); return }
    navigate(`/diary?session=${encodeURIComponent(sessionId)}`)
  }

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
  if (isMobile) {
    return (
      <>
        <PixelStars />
        <div className='bf-m-root'>
          {/* 헤더 */}
          <AppHeader />

          {/* 상단 50%: 날짜/불꽃/게이지/이미지/버튼 */}
          <div style={{
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-evenly',
            padding: '4px 12px 2px',
            overflow: 'hidden',
          }}>
            {/* 날짜 */}
            <div className='scene-date bf-m-date' style={{ marginBottom: 0 }}>
              <span className='date-main'>{formatKoreanDate()}</span>
              TODAY / BONFIRE NIGHT
            </div>

            {/* 불꽃 */}
            <div className='bonfire-scene bf-m-flame' style={{ flexShrink: 1, minHeight: 0 }}>
              <FlameAnimation level={flameLevel} />
              <div className='pixel-ground' />
            </div>

            {/* 게이지 + 카운터 */}
            <div className='gauge-row' style={{ margin: 0 }}>
              <span className='gauge-bar'>{gaugeBar}</span>
              <span className='gauge-count'>[<span>{count}</span>/∞]</span>
            </div>

            {/* 힌트 */}
            <div className='threshold-hint bf-m-hint' style={{ color: ready ? 'var(--fire-tip)' : 'var(--text-dim)', margin: 0 }}>
              {hint}
            </div>

            {/* 대표 이미지 */}
            <KeyImageUploader keyImage={keyImage} onUpload={uploadKeyImage} onRemove={removeKeyImage} />

            {/* 새 일기 시작 버튼 */}
            <button className='pixel-btn pixel-btn-sm' style={{ fontSize: 9 }} onClick={handleNewSession}>
              🔥 새 일기 시작
            </button>
          </div>

          {/* 하단 50%: KINDLING 헤더 + 땔감 목록(스크롤) + 입력창(고정) */}
          <div style={{
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '2px solid var(--gray-2)',
            overflow: 'hidden',
          }}>
            {/* 헤더 행 */}
            <div className='bf-m-bottom-hd' style={{ flexShrink: 0 }}>
              <span className='bf-m-kcount'>KINDLING <b>{count}</b></span>
              {ready && (
                <button className='bf-m-genbtn' onClick={handleGoWrite}>
                  ▶ 일기 쓰기 ◀
                </button>
              )}
            </div>

            {/* 땔감 목록 (스크롤 영역) */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <KindlingList
                kindlings={kindlings}
                onRemove={removeKindling}
                onReorder={reorderKindlings}
                onEditWithQuestion={handleEditWithQuestion}
              />
            </div>

            {/* 입력창 */}
            <div style={{ flexShrink: 0 }}>
              <KindlingInput
                onAdd={addKindling}
                prefillValue={prefillValue}
                onPrefillConsumed={() => setPrefillValue('')}
              />
            </div>
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

          <KindlingList
            kindlings={kindlings}
            onRemove={removeKindling}
            onReorder={reorderKindlings}
            onEditWithQuestion={handleEditWithQuestion}
          />

          <KindlingInput
            onAdd={addKindling}
            prefillValue={prefillValue}
            onPrefillConsumed={() => setPrefillValue('')}
          />
        </aside>
      </div>

      <GenerateButton visible={ready} sessionId={sessionId} />
    </>
  )
}
