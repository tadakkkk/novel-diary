import { useRef } from 'react'
import { type Kindling } from '@/types'
import { KindlingItem } from './KindlingItem'

interface Props {
  kindlings: Kindling[]
  onRemove: (id: string) => void
  onReorder: (fromId: string, toId: string) => void
  onEditWithQuestion?: (id: string, newText: string) => void
}

export function KindlingList({ kindlings, onRemove, onReorder, onEditWithQuestion }: Props) {
  const prevCountRef = useRef(kindlings.length)
  const prevCount = prevCountRef.current
  prevCountRef.current = kindlings.length

  const dragId = useRef<string | null>(null)

  return (
    <div className='kindling-list-wrap'>
      <div className='kindling-list'>
        {kindlings.length === 0 ? (
          <div className='empty-state'>
            <div className='empty-icon'>▒</div>
            NO KINDLING YET<br />ADD YOUR STORY
          </div>
        ) : (
          kindlings.map((k, i) => (
            <KindlingItem
              key={k.id}
              kindling={k}
              index={i}
              isNew={i >= prevCount}
              onRemove={onRemove}
              onEditWithQuestion={onEditWithQuestion}
              animate={i >= prevCount}
              onDragStart={() => { dragId.current = k.id }}
              onDragOver={(overId) => {
                if (dragId.current && dragId.current !== overId) {
                  onReorder(dragId.current, overId)
                }
              }}
              onDragEnd={() => { dragId.current = null }}
            />
          ))
        )}
      </div>
    </div>
  )
}
