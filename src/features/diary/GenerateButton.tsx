import { useNavigate } from 'react-router-dom'

interface Props {
  visible: boolean
  sessionId: string
}

export function GenerateButton({ visible, sessionId }: Props) {
  const navigate = useNavigate()

  return (
    <div className={`generate-btn-wrap${visible ? ' visible' : ''}`}>
      <button
        className='generate-btn'
        onClick={() => navigate(`/diary?session=${encodeURIComponent(sessionId)}`)}
      >
        ▶ 일기 쓰기 ◀
      </button>
    </div>
  )
}
