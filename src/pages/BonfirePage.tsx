import { AppHeader } from '@/components/ui/AppHeader'
import { PixelStars } from '@/components/ui/PixelStars'
import { FlameAnimation } from '@/features/bonfire/FlameAnimation'
import { useBonfireSession } from '@/features/bonfire/useBonfireSession'
import { GenerateButton } from '@/features/diary/GenerateButton'
import { KindlingInput } from '@/features/kindling/KindlingInput'
import { KindlingList } from '@/features/kindling/KindlingList'
import { KeyImageUploader } from '@/features/media/KeyImageUploader'
import { isGenerationReady, getThresholdHint } from '@/lib/flame'
import { formatKoreanDate } from '@/lib/date'
import * as storage from '@/services/storage'

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

  const count   = kindlings.length
  const ready   = isGenerationReady(count)
  const hint    = getThresholdHint(count)
  const gaugeBar = '█'.repeat(flameLevel) + '░'.repeat(5 - flameLevel)

  const today = new Date().toISOString().slice(0, 10)
  const todayDiary = storage.getDiaries().find((d) => d.date === today)

  return (
    <>
      <PixelStars />
      <AppHeader />

      {todayDiary && (
        <div style={{
          position:'fixed', top:64, left:0, right:0, zIndex:40,
          background:'#1a0a00', borderBottom:'2px solid var(--fire-org)',
          padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        }}>
          <span style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'#e8a060', lineHeight:1.5 }}>
            오늘 이미 일기가 있어요. 새 땔감을 추가하면 <strong style={{ color:'var(--fire-tip)' }}>오늘 일기가 덮어써져요.</strong>
          </span>
          <button className='pixel-btn pixel-btn-sm' onClick={() => window.location.href = `/timeline`}
            style={{ flexShrink:0 }}>타임라인 보기</button>
        </div>
      )}

      <div className='bonfire-page' style={todayDiary ? { paddingTop:104 } : undefined}>
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
