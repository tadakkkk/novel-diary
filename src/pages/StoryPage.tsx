import { StoryTab } from '@/features/drawer/StoryTab'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'
import { t } from '@/i18n'

export default function StoryPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title={t('novel.title')} />
      <div style={{ paddingTop: 56, position: 'relative', zIndex: 1 }}>
        <StoryTab />
      </div>
    </>
  )
}
