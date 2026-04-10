import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { isAnonQuotaExceeded } from '@/services/quota/quota-service'
import { getSession } from '@/services/auth/auth-service'

interface Props {
  visible: boolean
  sessionId: string
}

export function GenerateButton({ visible, sessionId }: Props) {
  const navigate = useNavigate()
  const { showPaywall } = useAppContext()

  async function handleClick() {
    if (import.meta.env.VITE_API_URL) {
      const session = await getSession()
      if (!session && isAnonQuotaExceeded()) { showPaywall(); return }
    }
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
