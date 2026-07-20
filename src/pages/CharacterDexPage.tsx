import { CharacterDex } from '@/features/drawer/CharacterDex'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'
import { t } from '@/i18n'

export default function CharacterDexPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title={t('page.characterDex')} />
      <div style={{ paddingTop: 56, position: 'relative', zIndex: 1 }}>
        <CharacterDex />
      </div>
    </>
  )
}
