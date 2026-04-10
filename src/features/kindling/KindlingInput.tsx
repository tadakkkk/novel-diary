import { useEffect, useRef, useState } from 'react'
import { spawnPixelParticles } from '@/lib/particles'
import { MAX_KINDLING_LENGTH } from '@/lib/constants'
import * as claude from '@/services/claude/claude-service'
import * as storage from '@/services/storage'

interface Props {
  onAdd: (text: string) => void
}

const REBUTTAL_MIN = 10
const REBUTTAL_MAX = 60
const REBUTTAL_DELAY = 2500  // ms

export function KindlingInput({ onAdd }: Props) {
  const [value, setValue] = useState('')
  const [question, setQuestion] = useState('')
  const [questionVisible, setQuestionVisible] = useState(false)
  const [loadingQ, setLoadingQ] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const btnRef      = useRef<HTMLButtonElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastFetchRef = useRef('')

  function handleAdd() {
    const val = value.trim()
    if (!val) return
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) spawnPixelParticles(rect.left + rect.width / 2, rect.top)
    onAdd(val)
    setValue('')
    setQuestion('')
    setQuestionVisible(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  function applyQuestion() {
    if (!question) return
    setValue((prev) => {
      const trimmed = prev.trimEnd()
      return trimmed ? trimmed + ' ' + question : question
    })
    setQuestion('')
    setQuestionVisible(false)
    textareaRef.current?.focus()
  }

  // 반문 생성 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = value.trim()

    const canCall = !!import.meta.env.VITE_API_URL || !!storage.getApiKey()
    if (trimmed.length < REBUTTAL_MIN || trimmed.length > REBUTTAL_MAX || !canCall) {
      setQuestionVisible(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      if (trimmed === lastFetchRef.current) return
      lastFetchRef.current = trimmed
      setLoadingQ(true)
      try {
        const q = await claude.generateKindlingQuestion(trimmed)
        if (q && value.trim().length >= REBUTTAL_MIN && value.trim().length <= REBUTTAL_MAX) {
          setQuestion(q)
          setQuestionVisible(true)
        }
      } finally {
        setLoadingQ(false)
      }
    }, REBUTTAL_DELAY)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [value])

  const remaining = MAX_KINDLING_LENGTH - value.length
  const nearLimit = remaining <= 50

  return (
    <div className='kindling-input-section'>
      <div className='input-label'>▸ 새 땔감 추가</div>

      {/* 반문 카드 — 입력창 바로 위에 표시 */}
      {(questionVisible || loadingQ) && (
        <div style={{
          marginBottom: 6,
          padding: '8px 12px',
          border: '1px solid var(--fire-amb)',
          background: '#0d0800',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'slideUp 0.22s ease-out',
          cursor: questionVisible ? 'pointer' : 'default',
        }} onClick={questionVisible ? applyQuestion : undefined}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--fire-org)', flexShrink: 0 }}>🔥</span>
          <span style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--fire-tip)', flex: 1 }}>
            {loadingQ && !question ? '...' : question}
          </span>
          {questionVisible && (
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--fire-amb)', flexShrink: 0 }}>클릭해서 추가 ▸</span>
          )}
        </div>
      )}

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
      <div className='input-hint' style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Ctrl+Enter로 추가</span>
        <span style={{ color: nearLimit ? 'var(--fire-tip)' : 'var(--text-off)' }}>
          {value.length}/{MAX_KINDLING_LENGTH}
        </span>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
