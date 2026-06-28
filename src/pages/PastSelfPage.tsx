import { PastSelfChat } from '@/features/drawer/PastSelfChat'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'

export default function PastSelfPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title='과거의 주인공에게 묻기' />
      <PastSelfChat />
    </>
  )
}
