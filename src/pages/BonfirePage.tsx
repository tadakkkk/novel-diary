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

export default function BonfirePage() {
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

          <button
            className='pixel-btn pixel-btn-sm'
            style={{ marginTop:16, fontSize:9 }}
            onClick={handleNewSession}
          >
            🔥 새 일기 시작
          </button>
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
