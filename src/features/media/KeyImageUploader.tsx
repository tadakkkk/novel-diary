import { useRef } from 'react'
import { type KeyImage } from '@/types'

interface Props {
  keyImage: KeyImage | null
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
}

export function KeyImageUploader({ keyImage, onUpload, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    onRemove()
  }

  return (
    <div className='key-image-section'>
      <div className='key-image-upload'>
        <input
          ref={inputRef}
          type='file'
          accept='image/*'
          onChange={handleChange}
        />
        {keyImage ? (
          <>
            <img
              className='key-image-preview'
              src={keyImage.dataUrl}
              alt='대표 이미지'
            />
            <button className='key-image-remove' onClick={handleRemove} title='이미지 제거'>
              [x]
            </button>
          </>
        ) : (
          <div className='key-image-placeholder'>
            오늘의 대표 이미지<br />(선택)
          </div>
        )}
      </div>
    </div>
  )
}
