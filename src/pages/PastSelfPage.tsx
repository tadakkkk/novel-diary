import { PastSelfChat } from '@/features/drawer/PastSelfChat'
import { PixelStars } from '@/components/ui/PixelStars'
import { FeatureHeader } from '@/components/ui/FeatureHeader'
import { t } from '@/i18n'

export default function PastSelfPage() {
  return (
    <>
      <PixelStars />
      <FeatureHeader title={t('page.pastSelf')} />
      <PastSelfChat />
    </>
  )
}
