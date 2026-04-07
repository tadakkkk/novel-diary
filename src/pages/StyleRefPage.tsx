import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { type StyleReference } from '@/types'
import { getStyleReferences, saveStyleReferences } from '@/services/storage'
import { AppHeader } from '@/components/ui/AppHeader'
import { PixelStars } from '@/components/ui/PixelStars'
import { MAX_STYLE_REFERENCES, MAX_STYLE_REFERENCE_LENGTH } from '@/lib/constants'

export default function StyleRefPage() {
  const [refs, setRefs] = useState<StyleReference[]>([])
  const [previewRef, setPreviewRef] = useState<StyleReference | null>(null)
  const titleRef   = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const [charCount, setCharCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setRefs(getStyleReferences()) }, [])

  function save(title: string, content: string) {
    if (!title.trim()) { alert('제목을 입력해주세요.'); return }
    if (!content.trim()) { alert('내용을 입력해주세요.'); return }
    if (refs.length >= MAX_STYLE_REFERENCES) { alert('최대 10개까지 저장할 수 있어요.'); return }
    const newRef: StyleReference = {
      id: uuid(), userId: '', title: title.trim(),
      content: content.slice(0, MAX_STYLE_REFERENCE_LENGTH),
      excerpt: content.slice(0, 200),
      createdAt: new Date().toISOString(),
    }
    const next = [...refs, newRef]
    saveStyleReferences(next)
    setRefs(next)
    if (titleRef.current)   titleRef.current.value   = ''
    if (contentRef.current) { contentRef.current.value = ''; setCharCount(0) }
  }

  function handlePaste() {
    save(titleRef.current?.value ?? '', contentRef.current?.value ?? '')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (refs.length >= MAX_STYLE_REFERENCES) { alert('최대 10개까지 저장할 수 있어요.'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = (ev.target!.result as string).slice(0, MAX_STYLE_REFERENCE_LENGTH)
      const title   = file.name.replace(/\.[^.]+$/, '').slice(0, 40)
      save(title, content)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function deleteRef(id: string, title: string) {
    if (!confirm(`"${title}" 을(를) 삭제할까요?`)) return
    const next = refs.filter((r) => r.id !== id)
    saveStyleReferences(next)
    setRefs(next)
  }

  return (
    <>
      <PixelStars />
      <AppHeader />

      <div style={{ minHeight: '100vh', maxWidth: 680, margin: '0 auto', padding: '64px 28px 0', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'var(--font-pixel)', fontSize: 12, color: 'var(--fire-amb)', letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: 32 }}>
          참고 문체
        </h1>
        <p style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-4)', margin: '12px 0 28px', lineHeight: 1.7, paddingBottom: 20, borderBottom: '2px solid var(--gray-2)' }}>
          내가 쓴 소설, 좋아하는 글, 마음에 드는 문장을 저장해두세요.<br />
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--fire-org)' }}>MAX 10 FILES · 10,000 CHARS EACH</span>
        </p>

        {/* Upload */}
        <div className='pixel-border-dim'
          style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', marginBottom: 24, background: 'var(--black)', borderStyle: 'dashed', transition: 'border-color 0.1s' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--fire-org)' }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = '' }}
          onDrop={(e) => {
            e.preventDefault()
            e.currentTarget.style.borderColor = ''
            const file = e.dataTransfer.files?.[0]
            if (!file) return
            if (!/\.(txt|md)$/i.test(file.name)) { alert('.txt 또는 .md 파일만 지원해요.'); return }
            if (refs.length >= MAX_STYLE_REFERENCES) { alert('최대 10개까지 저장할 수 있어요.'); return }
            const reader = new FileReader()
            reader.onload = (ev) => {
              const content = (ev.target!.result as string).slice(0, MAX_STYLE_REFERENCE_LENGTH)
              save(file.name.replace(/\.[^.]+$/, '').slice(0, 40), content)
            }
            reader.readAsText(file, 'utf-8')
          }}>
          <input ref={fileInputRef} type='file' accept='.txt,.md' style={{ display: 'none' }} onChange={handleFileUpload} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--gray-4)', letterSpacing: '0.1em' }}>[ .TXT / .MD 업로드 ]</div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: 'var(--text-off)', letterSpacing: '0.08em' }}>CLICK OR DROP FILE HERE</div>
          </div>
        </div>

        {/* Paste */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>► 직접 붙여넣기</div>
          <input ref={titleRef} type='text' className='pixel-input' placeholder='문체 이름 (예: 내가 쓴 단편)' maxLength={40} style={{ marginBottom: 6 }} />
          <textarea ref={contentRef} className='pixel-input' placeholder='문체 샘플 텍스트를 여기에 붙여넣으세요...'
            maxLength={MAX_STYLE_REFERENCE_LENGTH} style={{ minHeight: 120 }}
            onChange={(e) => setCharCount(e.target.value.length)} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-off)' }}>
              <span style={{ color: 'var(--fire-org)' }}>{charCount}</span> / 10,000
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className='pixel-btn pixel-btn-fire' onClick={handlePaste}>▸ 저장하기</button>
          </div>
        </div>

        {/* List header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid var(--gray-2)' }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>SAVED STYLES</span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: 'var(--fire-org)' }}>{refs.length} / 10</span>
        </div>

        {/* Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 48 }}>
          {refs.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--text-off)', textAlign: 'center', padding: '32px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              NO SAVED STYLES
            </div>
          ) : refs.map((ref) => (
            <div key={ref.id} className='pixel-border-dim' style={{ padding: '14px 14px 10px', background: 'var(--black)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, fontWeight: 700, color: 'var(--white)' }}>{ref.title}</div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--gray-4)', marginTop: 3, letterSpacing: '0.06em' }}>
                    {ref.content.length.toLocaleString()} CHARS
                  </div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 12, color: 'var(--gray-4)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6, marginBottom: 10, borderLeft: '2px solid var(--gray-2)', paddingLeft: 10 }}>
                {ref.content.slice(0, 200)}{ref.content.length > 200 ? '…' : ''}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className='pixel-btn pixel-btn-sm' onClick={() => setPreviewRef(ref)}>미리보기</button>
                <button className='pixel-btn pixel-btn-sm' style={{ borderColor: 'var(--gray-3)', color: 'var(--gray-4)' }} onClick={() => deleteRef(ref.id, ref.title)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Modal */}
      {previewRef && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '60px 16px 32px', overflowY: 'auto' }}
          onClick={() => setPreviewRef(null)}>
          <div style={{ width: '100%', maxWidth: 640, background: 'var(--black)', border: '3px solid var(--white)', boxShadow: 'inset 0 0 0 2px var(--white), inset 0 0 0 5px var(--black)' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 18px 12px', borderBottom: '2px solid var(--gray-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 14, fontWeight: 700, color: 'var(--white)' }}>{previewRef.title}</div>
              <button className='modal-close' onClick={() => setPreviewRef(null)}>[ ✕ ]</button>
            </div>
            <div style={{ padding: '20px 24px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontFamily: 'var(--font-korean)', fontSize: 13, color: 'var(--gray-5)', lineHeight: 1.9, whiteSpace: 'pre-wrap', wordBreak: 'keep-all' }}>
                {previewRef.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
