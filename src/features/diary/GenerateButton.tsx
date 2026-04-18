import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { isQuotaExceeded } from '@/services/quota/quota-service'

interface Props {
  visible: boolean
  sessionId: string
}

export function GenerateButton({ visible, sessionId }: Props) {
  const navigate = useNavigate()
  const { showPaywall } = useAppContext()

  async function handleClick() {
    if (await isQuotaExceeded()) { showPaywall(); return }
    navigate(`/diary?session=${encodeURIComponent(sessionId)}`)
  }

  return (
    <div className={`generate-btn-wrap${visible ? ' visible' : ''}`}>
      <button className='generate-btn' onClick={handleClick}>
        ▶ 일기 쓰기 ◀
      </button>
    </div>
  )
}
