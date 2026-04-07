import { useNavigate } from 'react-router-dom'

export function AppHeader() {
  const navigate = useNavigate()

  return (
    <header className='app-header'>
      <button className='app-logo' onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <span className='logo-korean'>타닥타닥</span>
        <span className='logo-en'>tadak-tadak</span>
      </button>
      <div className='header-actions'>
        <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/timeline')}>
          [타임라인]
        </button>
        <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/novel')}>
          [나의 이야기]
        </button>
        <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/style-ref')}>
          [참고 문체]
        </button>
      </div>
    </header>
  )
}
