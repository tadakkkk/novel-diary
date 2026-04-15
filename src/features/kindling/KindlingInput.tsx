import { useEffect, useRef, useState } from 'react'
import { spawnPixelParticles } from '@/lib/particles'
import { MAX_KINDLING_LENGTH } from '@/lib/constants'

interface Props {
  onAdd: (text: string) => void
  prefillValue?: string
  onPrefillConsumed?: () => void
}

export function KindlingInput({ onAdd, prefillValue, onPrefillConsumed }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const btnRef      = useRef<HTMLButtonElement>(null)

  // 외부에서 prefill이 들어오면 입력창에 채우고 포커스
  useEffect(() => {
    if (!prefillValue) return
    setValue(prefillValue)
    textareaRef.current?.focus()
    onPrefillConsumed?.()
  }, [prefillValue, onPrefillConsumed])

  function handleAdd() {
    const val = value.trim()
    if (!val) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) spawnPixelParticles(rect.left + rect.width / 2, rect.top)
    onAdd(val)
    setValue('')
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  const remaining = MAX_KINDLING_LENGTH - value.length
  const nearLimit = remaining <= 50

  return (
    <div className='kindling-input-section'>
      <div className='input-label'>▸ 새 땔감 추가</div>
      <div className='input-row'>
        <textarea
          ref={textareaRef}
          className='pixel-input kindling-textarea'
          placeholder='오늘 있었던 일을 조각조각 던져보세요...'
          maxLength={MAX_KINDLING_LENGTH}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          ref={btnRef}
          className='kindling-add-btn'
          onClick={handleAdd}
          title='추가 (Ctrl+Enter)'
        >
          +
        </button>
      </div>
      <div className='input-hint' style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ color: nearLimit ? 'var(--fire-tip)' : 'var(--text-off)' }}>
          {value.length}/{MAX_KINDLING_LENGTH}
        </span>
      </div>
    </div>
  )
}
