import { useNavigate } from 'react-router-dom'
import { StoryTab } from '@/features/drawer/StoryTab'
import { PixelStars } from '@/components/ui/PixelStars'

export default function StoryPage() {
  const navigate = useNavigate()
  return (
    <>
      <PixelStars />
      <header className='app-header'>
        <button
          onClick={() => navigate(-1)}
          style={{
            fontFamily: 'var(--font-pixel)', fontSize: 10,
            color: 'var(--fire-org)', background: 'none', border: 'none',
            cursor: 'pointer', letterSpacing: '0.06em',
          }}
        >← 주인공의 서랍</button>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.1em' }}>
            주인공의 이야기
          </span>
        </div>
      </header>
      <div style={{ paddingTop: 56, position: 'relative', zIndex: 1 }}>
        <StoryTab onClose={() => navigate(-1)} />
      </div>
    </>
  )
}
