import { useNavigate } from 'react-router-dom'
import * as storage from '@/services/storage'

export function StoryTab() {
  const navigate = useNavigate()
  const diaries = storage.getDiaries().filter((d) => d.content)
  const dates = diaries.map((d) => d.date ?? '').filter(Boolean).sort()

  function go() {
    navigate('/novel')
  }

  return (
    <div style={{ padding: '20px 18px 24px' }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--fire-amb)', letterSpacing: '0.1em', marginBottom: 16 }}>► 나의 이야기</div>

      {diaries.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--text-off)', lineHeight: 1.8, marginBottom: 20 }}>
          아직 저장된 일기가 없어요.<br />일기를 쓰고 저장하면 여기서 소설로 엮을 수 있어요.
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 18, marginBottom: 14 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 22, color: 'var(--fire-tip)' }}>{diaries.length}</div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', marginTop: 3, letterSpacing: '0.06em' }}>DIARIES</div>
            </div>
            {dates.length > 0 && (
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--gray-4)', lineHeight: 2.2, letterSpacing: '0.06em' }}>
                <div>FROM {dates[0]}</div>
                <div>TO   {dates[dates.length - 1]}</div>
              </div>
            )}
          </div>
          <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', lineHeight: 1.7 }}>
            일기들을 하나의 소설로 엮어 볼 수 있어요.<br />
            기간을 선택하고 책을 펼쳐보세요.
          </div>
        </div>
      )}

      <button className='pixel-btn pixel-btn-fire' style={{ fontSize: 10, padding: '10px 18px' }} onClick={go}>
        ▸ 나의 이야기 열기
      </button>
    </div>
  )
}
