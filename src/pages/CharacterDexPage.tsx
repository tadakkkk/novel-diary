import { CharacterDex } from '@/features/drawer/CharacterDex'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'

export default function CharacterDexPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title='주인공 도감' />
      <div style={{ paddingTop: 56, position: 'relative', zIndex: 1 }}>
        <CharacterDex />
      </div>
    </>
  )
}
