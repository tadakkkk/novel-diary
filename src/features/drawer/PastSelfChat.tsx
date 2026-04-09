import { useEffect, useRef, useState } from 'react'
import { v4 as uuid } from 'uuid'
import { type ChatMessage } from '@/types'
import * as storage from '@/services/storage'
import * as claude from '@/services/claude/claude-service'
import { AvatarCanvas } from '@/components/ui/AvatarCanvas'
import { useMobile } from '@/hooks/useMobile'

const DUMMY_CHAR = {
  name: '과거의 나', relationship: '', appearances: [], episodes: [],
  avatarData: { seed: 42, hairColor: 'dark brown', skinTone: 'medium', eyeColor: 'brown', clothColor: 'navy' },
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px', height: 36 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--fire-org)',
          animation: `dotBounce 1s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

export function PastSelfChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => storage.getChatMessages())
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { isMobile, isSmall } = useMobile()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // 마운트 시 일기 데이터 로드 확인
  useEffect(() => {
    const loaded = storage.getDiaries().filter((d) => d.content)
    console.log('[PastSelfChat] mounted — diaries with content:', loaded.length, loaded.map((d) => d.date))
  }, [])

  const hasKey = !!storage.getApiKey()

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    // AI 호출 시점에 항상 최신 일기 데이터를 fresh하게 읽음 (stale 클로저 방지)
    const diaries = storage.getDiaries().filter((d) => d.content)
    console.log('[PastSelfChat] sendMessage — diaries available:', diaries.length)

    const userMsg: ChatMessage = { id: uuid(), role: 'user', content: text, createdAt: new Date().toISOString() }
    const next = [...messages, userMsg]
    setMessages(next)
    storage.saveChatMessages(next)

    setLoading(true)
    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))

      const { answer, sourceDate } = await claude.askPastSelf(text, diaries, history)
      const aiMsg: ChatMessage = {
        id: uuid(), role: 'assistant', content: answer, sourceDate,
        createdAt: new Date().toISOString(),
      }
      const final = [...next, aiMsg]
      setMessages(final)
      storage.saveChatMessages(final)
    } catch {
      const errMsg: ChatMessage = {
        id: uuid(), role: 'assistant', content: '지금은 말하기 어려워.', createdAt: new Date().toISOString(),
      }
      const final = [...next, errMsg]
      setMessages(final)
      storage.saveChatMessages(final)
    } finally {
      setLoading(false)
    }
  }

  const firstChar = storage.getCharacters()[0]
  const avatarChar = firstChar ?? DUMMY_CHAR as Parameters<typeof AvatarCanvas>[0]['character']

  const chatHeight = isSmall ? 280 : isMobile ? 340 : 420

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: chatHeight }}>
      {/* 채팅 영역 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-pixel)', fontSize: 9, color: 'var(--text-off)', letterSpacing: '0.08em', lineHeight: 2.2 }}>
            과거의 주인공이 기다리고 있어.<br />
            지금의 고민을 말해봐.
          </div>
        )}

        {!hasKey && (
          <div style={{ textAlign: 'center', padding: '8px', fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#ff6644', border: '1px solid #441100', background: '#1a0500', marginBottom: 4 }}>
            API 키가 없으면 답변을 받을 수 없어요
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
            {msg.role === 'assistant' && (
              <div style={{ width: 32, height: 48, flexShrink: 0, border: '1px solid var(--gray-2)' }}>
                <AvatarCanvas character={avatarChar} w={32} h={48} />
              </div>
            )}
            <div style={{ maxWidth: '72%' }}>
              <div style={{
                padding: '8px 12px',
                background: msg.role === 'user' ? 'var(--fire-org)' : '#1a1a1a',
                border: msg.role === 'user' ? 'none' : '1px solid var(--gray-2)',
                color: msg.role === 'user' ? '#000' : 'var(--gray-5)',
                fontFamily: 'var(--font-korean)', fontSize: 13, lineHeight: 1.65,
                wordBreak: 'keep-all', whiteSpace: 'pre-wrap',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
              }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.sourceDate && (
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: 'var(--fire-amb)', marginTop: 4, letterSpacing: '0.06em', cursor: 'default' }}>
                  {msg.sourceDate}의 나
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 32, height: 48, flexShrink: 0, border: '1px solid var(--gray-2)' }}>
              <AvatarCanvas character={avatarChar} w={32} h={48} />
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid var(--gray-2)', borderRadius: '12px 12px 12px 2px' }}>
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div style={{ borderTop: '2px solid var(--gray-2)', padding: '10px 12px', display: 'flex', gap: 8, background: '#0d0d0d' }}>
        <textarea
          className='pixel-input'
          placeholder='지금의 고민을 말해봐...'
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          style={{ flex: 1, fontSize: 12, minHeight: 38, resize: 'none', padding: '8px 10px' }}
          rows={1}
        />
        <button
          className='pixel-btn pixel-btn-fire'
          style={{ fontSize: 10, padding: '0 14px', flexShrink: 0, alignSelf: 'flex-end' }}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >▸</button>
      </div>

      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
