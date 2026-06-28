import { useNavigate, useLocation } from 'react-router-dom'
import { useAppContext } from '@/App'

// 서랍에서 진입하는 기능 페이지 공용 헤더.
// 좌측 뒤로가기 + 우측 제목. 좁은 모바일에서 제목이 화면 밖으로 잘리지 않도록
// 좌측 라벨은 짧게(← 서랍), 우측 제목은 nowrap + ellipsis 처리.
export function FeatureHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { openDrawer } = useAppContext()

  // 서랍에서 왔으면 메인으로 가서 서랍 팝업을 다시 연다. 아니면 일반 뒤로가기.
  function handleBack() {
    if ((location.state as { fromDrawer?: boolean } | null)?.fromDrawer) {
      navigate('/')
      openDrawer()
    } else {
      navigate(-1)
    }
  }

  return (
    <header className='app-header'>
      <button
        onClick={handleBack}
        style={{
          fontFamily: 'var(--font-pixel)', fontSize: 12,
          color: 'var(--fire-org)', background: 'none', border: 'none',
          cursor: 'pointer', letterSpacing: '0.04em',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >← 서랍</button>
      <span style={{
        marginLeft: 'auto', minWidth: 0,
        fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)',
        letterSpacing: '0.04em', whiteSpace: 'nowrap',
        overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{title}</span>
    </header>
  )
}
