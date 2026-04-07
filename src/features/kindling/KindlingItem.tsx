import { useEffect, useRef } from 'react'
import { type Kindling } from '@/types'

interface Props {
  kindling: Kindling
  index?: number
  onRemove: (id: string) => void
  animate?: boolean
  onDragStart: () => void
  onDragOver: (overId: string) => void
  onDragEnd: () => void
}

export function KindlingItem({ kindling, onRemove, animate = true, onDragStart, onDragOver, onDragEnd }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!animate) {
      ref.current?.classList.add('visible')
      return
    }
    const id = requestAnimationFrame(() => ref.current?.classList.add('visible'))
    return () => cancelAnimationFrame(id)
  }, [animate])

  return (
    <div
      ref={ref}
      className='kindling-item pixel-border-dim'
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver(kindling.id) }}
      onDragEnd={onDragEnd}
      style={{ cursor: 'grab' }}
    >
      <span className='k-num' style={{ cursor:'grab', opacity:0.5, fontSize:10 }}>⠿</span>
      <span className='k-text'>{kindling.text}</span>
      <button
        className='k-del pixel-btn'
        onClick={() => onRemove(kindling.id)}
        title='삭제'
        style={{ cursor:'pointer' }}
      >
        ✕
      </button>
    </div>
  )
}
