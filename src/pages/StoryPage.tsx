import { StoryTab } from '@/features/drawer/StoryTab'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'

export default function StoryPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title='주인공의 이야기' />
      <div style={{ paddingTop: 56, position: 'relative', zIndex: 1 }}>
        <StoryTab />
      </div>
    </>
  )
}
