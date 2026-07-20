import { useNavigate } from 'react-router-dom'
import { useAppContext } from '@/App'
import { isDiaryQuotaExceeded } from '@/services/quota/quota-service'
import { t } from '@/i18n'

interface Props {
  visible: boolean
  sessionId: string
}

export function GenerateButton({ visible, sessionId }: Props) {
  const navigate = useNavigate()
  const { showPaywall } = useAppContext()

  async function handleClick() {
    if (await isDiaryQuotaExceeded()) { showPaywall(); return }
    navigate(`/diary?session=${encodeURIComponent(sessionId)}`)
  }

  return (
    <div className={`generate-btn-wrap${visible ? ' visible' : ''}`}>
      <button className='generate-btn' onClick={handleClick}>
        {t('bonfire.writeDiary')}
      </button>
    </div>
  )
}
