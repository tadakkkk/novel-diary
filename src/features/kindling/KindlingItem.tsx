import { useEffect, useRef, useState } from 'react'
import { type Kindling } from '@/types'
import * as claude from '@/services/claude/claude-service'
import * as storage from '@/services/storage'

const QUESTION_MAX_LEN = 50  // 이 미만인 땔감에만 반문 생성

interface Props {
  kindling: Kindling
  index?: number
  isNew?: boolean
  onRemove: (id: string) => void
  onEditWithQuestion?: (id: string, newText: string) => void
  animate?: boolean
  onDragStart: () => void
  onDragOver: (overId: string) => void
  onDragEnd: () => void
}

export function KindlingItem({
  kindling, onRemove, isNew = false, onEditWithQuestion,
  animate = true, onDragStart, onDragOver, onDragEnd,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [question, setQuestion] = useState('')
  const [questionVisible, setQuestionVisible] = useState(false)
  const hasGeneratedRef = useRef(false)

  useEffect(() => {
    if (!animate) {
      ref.current?.classList.add('visible')
      return
    }
    const id = requestAnimationFrame(() => ref.current?.classList.add('visible'))
    return () => cancelAnimationFrame(id)
  }, [animate])

  // 새로 추가된 50자 미만 땔감에만 반문 생성
  useEffect(() => {
    if (!isNew) return
    if (hasGeneratedRef.current) return
    const text = kindling.text.trim()
    if (text.length >= QUESTION_MAX_LEN) return

    const canCall = !!import.meta.env.VITE_API_URL || !!storage.getApiKey()
    if (!canCall) return

    hasGeneratedRef.current = true
    claude.generateKindlingQuestion(text).then((q) => {
      if (q) {
        setQuestion(q)
        setQuestionVisible(true)
      }
    }).catch(() => { /* ignore */ })
  }, [isNew, kindling.text])

  function handleQuestionClick() {
    if (!question || !onEditWithQuestion) return
    const newText = kindling.text.trimEnd() + ' ' + question
    onEditWithQuestion(kindling.id, newText)
    setQuestionVisible(false)
  }

  return (
    <div ref={ref} className='kindling-item pixel-border-dim'
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(kindling.id) }}
      onDragEnd={onDragEnd}
      style={{ cursor: 'grab', display: 'block', padding: 0 }}
    >
      {/* 땔감 행 */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '8px 10px' }}>
        <span className='k-num' style={{ cursor: 'grab', opacity: 0.5, fontSize: 10 }}>⠿</span>
        <span className='k-text' style={{ flex: 1 }}>{kindling.text}</span>
        <button
          className='k-del pixel-btn'
          onClick={() => onRemove(kindling.id)}
          title='삭제'
          style={{ cursor: 'pointer', flexShrink: 0 }}
        >
          ✕
        </button>
      </div>

      {/* 반문 */}
      {questionVisible && (
        <div
          onClick={handleQuestionClick}
          style={{
            padding: '4px 10px 7px 28px',
            cursor: 'pointer',
            animation: 'slideUp 0.22s ease-out',
          }}
          title='클릭하면 이어서 작성'
        >
          <span style={{
            fontFamily: 'var(--font-korean)',
            fontSize: 11,
            color: '#4a3520',
            lineHeight: 1.5,
          }}>
            ↳ {question}
          </span>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
