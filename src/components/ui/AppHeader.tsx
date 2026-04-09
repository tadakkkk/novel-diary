import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DrawerPopup } from '@/features/drawer/DrawerPopup'

export function AppHeader() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header className='app-header'>
        <button className='app-logo' onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <span className='logo-korean'>타닥타닥</span>
          <span className='logo-en'>tadak-tadak</span>
        </button>
        <div className='header-actions'>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/timeline')}>
            [타임라인]
          </button>
          <button className='pixel-btn pixel-btn-sm' style={{ borderColor: 'var(--fire-org)', color: 'var(--fire-org)' }} onClick={() => setDrawerOpen(true)}>
            [주인공의 서랍]
          </button>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/style-ref')}>
            [참고 문체]
          </button>
        </div>
      </header>
      {drawerOpen && <DrawerPopup onClose={() => setDrawerOpen(false)} />}
    </>
  )
}
