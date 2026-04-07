import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { type Character, type NovelDiary, type Perspective, type ProcessingLevel, type StyleReference } from '@/types'
import * as storage from '@/services/storage'
import * as claude from '@/services/claude/claude-service'
import { PixelStars } from '@/components/ui/PixelStars'
import { AvatarCanvas } from '@/components/ui/AvatarCanvas'

const LV_LABELS: Record<number, string> = { 1:'SUBTLE', 2:'CALM', 3:'NORMAL', 4:'DRAMATIC', 5:'INTENSE' }

const WEATHER_OPTIONS = [
  { val:'맑음', icon:'☀' }, { val:'흐림', icon:'☁' },
  { val:'비', icon:'☂' },   { val:'눈', icon:'❄' },
  { val:'바람', icon:'〰' },  { val:'안개', icon:'≋' },
]

const PERSPECTIVES: Array<{ val: Perspective; name: string; ex: string }> = [
  { val:'1인칭주인공', name:'1인칭 주인공', ex:'"나는 오늘…"' },
  { val:'1인칭관찰자', name:'1인칭 관찰자', ex:'"나는 그를 봤다…"' },
  { val:'3인칭관찰자', name:'3인칭 관찰자', ex:'"그녀는 걸었다…"' },
  { val:'3인칭전지적', name:'3인칭 전지적', ex:'"그가 몰랐던 건…"' },
]

// ── Typewriter ────────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!active || !text) return
    setDisplayed(''); setDone(false)
    let i = 0
    function tick() {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1))
        i++
        setTimeout(tick, 14 + (text[i] === '\n' ? 100 : 0))
      } else { setDone(true) }
    }
    tick()
  }, [text, active])
  return { displayed, done }
}

// ── API Key Status ────────────────────────────────────────────────────────
function ApiKeyStatus({ onClear }: { onClear: () => void }) {
  const [key, setKey] = useState(() => storage.getApiKey())
  function clear() { storage.saveApiKey(''); setKey(null); onClear() }
  if (!key) return (
    <div style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--gray-3)', letterSpacing:'0.06em', textAlign:'center' }}>
      API KEY: <span style={{ color:'#ff4444' }}>NOT SET</span>
    </div>
  )
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
      <div style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--gray-3)', letterSpacing:'0.06em' }}>
        API KEY: <span style={{ color:'var(--fire-org)' }}>{'●●●●' + key.slice(-4)}</span>
      </div>
      <button onClick={clear} style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--gray-3)', background:'transparent', border:'1px solid var(--gray-3)', padding:'2px 5px', cursor:'pointer', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>변경</button>
    </div>
  )
}

// ── API Key Modal ─────────────────────────────────────────────────────────
function ApiKeyModal({ onSaved, onClose }: { onSaved: () => void; onClose: () => void }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState('')
  function save() {
    if (!val.trim().startsWith('sk-ant')) { setErr('⚠ 유효하지 않은 키 형식입니다.'); return }
    storage.saveApiKey(val.trim())
    onSaved()
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.9)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'var(--black)', border:'3px solid var(--fire-org)', boxShadow:'inset 0 0 0 2px var(--fire-org),inset 0 0 0 5px var(--black)', padding:28, maxWidth:420, width:'90%' }}>
        <h2 style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--fire-amb)', marginBottom:12, letterSpacing:'.1em' }}>API KEY REQUIRED</h2>
        <p style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)', marginBottom:14, lineHeight:1.7 }}>
          Claude API 키를 입력하세요.<br />키는 localStorage에만 저장되며 외부로 전송되지 않습니다.
        </p>
        <input type='password' className='pixel-input' placeholder='sk-ant-api...' value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
        <small style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--text-off)', letterSpacing:'.06em', display:'block', marginTop:6 }}>⚠ NEVER EXPOSE YOUR KEY IN PRODUCTION. MVP ONLY.</small>
        <div style={{ fontFamily:'var(--font-pixel)', fontSize:7, color:'#ff4444', marginTop:8, minHeight:14 }}>{err}</div>
        <div style={{ marginTop:14, display:'flex', gap:8 }}>
          <button className='pixel-btn pixel-btn-fire' onClick={save}>▸ 저장하기</button>
          <button className='pixel-btn' onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  )
}

// ── Character Modal ───────────────────────────────────────────────────────
function CharacterModal({ character, onClose }: { character: Character; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])
  return (
    <div className='modal-overlay open' onClick={onClose}>
      <div className='modal-box' onClick={(e) => e.stopPropagation()}>
        <div className='modal-header'>
          <AvatarCanvas character={character} size={64} />
          <div>
            <div className='modal-name'>{character.name}</div>
            <div className='modal-rel'>{character.relationship?.toUpperCase() ?? ''}</div>
          </div>
        </div>
        <div className='modal-section'>
          <div className='modal-sec-title'>등장한 일기</div>
          <div className='appear-list'>
            {(character.appearances ?? []).map((d) => (
              <span key={d} className='px-tag px-tag-white'>{d}</span>
            ))}
          </div>
        </div>
        <div className='modal-section'>
          <div className='modal-sec-title'>에피소드</div>
          {(character.episodes ?? []).map((e, i) => (
            <div key={i} className='episode-item'><b>{e.date}</b> {e.summary ?? ''}</div>
          ))}
        </div>
        <button className='modal-close' onClick={onClose}>[ 닫기 ]</button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function DiaryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // ── 초기 상태 로드 ─────────────────────────────────────────────────────
  const sessionId     = params.get('session') ?? ''
  const editId        = params.get('edit') ?? ''
  const [isEditLoad, setIsEditLoad] = useState(false)  // 편집 로드 시 타이핑 스킵

  // 편집 시 sessionId가 없으면 일기 스냅샷에서 땔감 복원
  const kindlings = (() => {
    if (sessionId) return storage.getKindlings(sessionId)
    if (editId) {
      const diary = storage.getDiary(editId)
      if (diary?.kindlings && diary.kindlings.length > 0) {
        return diary.kindlings.map((k, i) => ({
          id: k.id ?? `snap-${i}`, sessionId: editId,
          text: k.text, order: k.order ?? i,
          mediaAttachments: [] as never[], createdAt: '',
        }))
      }
    }
    return [] as ReturnType<typeof storage.getKindlings>
  })()
  const keyImageData = sessionId ? storage.getKeyImage(sessionId) : null
  const prefs        = storage.getPrefs()

  // ── Options state ──────────────────────────────────────────────────────
  const [weather, setWeather]       = useState<string | null>(null)
  const [perspective, setPerspective] = useState<Perspective>('1인칭주인공')
  const [procLevel, setProcLevel]   = useState<ProcessingLevel>(3)
  const [nickname, setNickname]     = useState(prefs.nickname ?? '')
  const [styleRefs, setStyleRefs]   = useState<StyleReference[]>([])
  const [selectedSrIds, setSelectedSrIds] = useState<Set<string>>(new Set())
  const [showAddSr, setShowAddSr]   = useState(false)
  const newSrTitleRef   = useRef<HTMLInputElement>(null)
  const newSrContentRef = useRef<HTMLTextAreaElement>(null)

  // ── Generation state ───────────────────────────────────────────────────
  type Status = 'idle' | 'generating' | 'done' | 'error'
  const [status, setStatus]         = useState<Status>('idle')
  const [progress, setProgress]     = useState('')
  const [diaryContent, setDiaryContent] = useState('')
  const [savedDiary, setSavedDiary] = useState<NovelDiary | null>(null)
  const [chars, setChars]           = useState<Character[]>([])
  const [charModal, setCharModal]   = useState<Character | null>(null)
  const [showApiModal, setShowApiModal] = useState(false)
  const [pendingGen, setPendingGen] = useState(false)
  const isGenerating  = useRef(false)
  const abortCtrl     = useRef<AbortController | null>(null)

  const { displayed: typedText, done: typingDone } = useTypewriter(diaryContent, status === 'done' && diaryContent !== '' && !isEditLoad)
  const displayed = isEditLoad ? diaryContent : typedText

  useEffect(() => {
    setStyleRefs(storage.getStyleReferences())
    if (editId) loadForEdit(editId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function loadForEdit(id: string) {
    const diary = storage.getDiary(id)
    if (!diary) return
    const opts = diary.generationOptions ?? {}
    if (opts.perspective) setPerspective(opts.perspective)
    if (opts.processingLevel) setProcLevel(opts.processingLevel)
    if (opts.weather) setWeather(opts.weather)
    if (diary.content) {
      setIsEditLoad(true)  // 타이핑 애니메이션 스킵
      setDiaryContent(diary.content)
      setSavedDiary(diary)
      setStatus('done')
      const savedChars = (diary.characterNames ?? []).map((n) => storage.getCharacter(n) ?? { name: n, relationship: '', appearances: [], episodes: [], avatarData: {} } as Character)
      setChars(savedChars)
    }
  }

  // ── Style ref helpers ──────────────────────────────────────────────────
  function toggleStyleRef(id: string) {
    setSelectedSrIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function saveNewStyleRef() {
    const title   = newSrTitleRef.current?.value.trim() ?? ''
    const content = newSrContentRef.current?.value.trim() ?? ''
    if (!title || !content) { alert('제목과 내용을 입력해주세요.'); return }
    const ref: StyleReference = { id: uuid(), userId: '', title, content, excerpt: content.slice(0, 200), createdAt: new Date().toISOString() }
    storage.saveStyleReference(ref)
    const updated = storage.getStyleReferences()
    setStyleRefs(updated)
    setSelectedSrIds((prev) => { const n = new Set(prev); n.add(ref.id); return n })
    setShowAddSr(false)
    if (newSrTitleRef.current) newSrTitleRef.current.value = ''
    if (newSrContentRef.current) newSrContentRef.current.value = ''
  }

  // ── Generation ─────────────────────────────────────────────────────────
  const startGeneration = useCallback(async () => {
    if (!storage.getApiKey()) { setShowApiModal(true); setPendingGen(true); return }
    await doGenerate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspective, procLevel, weather, nickname, selectedSrIds])

  function cancelGeneration() {
    abortCtrl.current?.abort()
    abortCtrl.current = null
    isGenerating.current = false
    setStatus('idle'); setProgress('')
  }

  async function doGenerate() {
    if (isGenerating.current) return
    if (kindlings.length === 0) { alert('땔감이 없어요. 먼저 사건을 입력해주세요.'); return }
    isGenerating.current = true
    abortCtrl.current = new AbortController()
    setIsEditLoad(false)
    setStatus('generating'); setProgress('▸ 일기를 쓰고 있어요...')

    try {
      const allRefs    = storage.getStyleReferences()
      const selRefs    = selectedSrIds.size > 0 ? allRefs.filter((r) => selectedSrIds.has(r.id)) : []
      const diaries    = storage.getDiaries()
      const continuity = diaries.length > 0 ? diaries[0].continuityContext : undefined
      const nick       = perspective.startsWith('3인칭') ? nickname || null : null
      const attachments = sessionId ? storage.getAttachments(sessionId) : []

      const { content, continuityContext } = await claude.generateDiary({
        kindlings, perspective, processingLevel: procLevel,
        styleRefs: selRefs, weather, nickname: nick,
        continuityContext: continuity, keyImageObj: keyImageData?.base64Data && keyImageData?.mediaType
          ? { mediaType: keyImageData.mediaType, base64Data: keyImageData.base64Data, dataUrl: keyImageData.dataUrl }
          : null,
        attachments,
        signal: abortCtrl.current?.signal,
      })

      setProgress('▸ 등장인물 추출 중...')
      const sessionDate = new Date().toISOString().slice(0, 10)
      const allChars    = await claude.extractCharacters(content, sessionDate).catch(() => [])
      const blocked     = storage.getBlockedChars()
      const rawChars    = allChars.filter((c) => !blocked.includes(c.name))

      const diaryId = editId || ('diary-' + Date.now())
      const prevDiary = editId ? (storage.getDiary(diaryId) ?? {}) : {}
      const diary: NovelDiary = {
        ...prevDiary as Partial<NovelDiary>,
        id: diaryId, sessionId,
        content, continuityContext,
        generationOptions: { perspective, processingLevel: procLevel, styleReferenceIds: [...selectedSrIds], weather, nickname: nick ?? undefined, styleRefIds: [...selectedSrIds] },
        kindlings: kindlings.map((k) => ({ id: k.id, text: k.text })),
        kindlingSnapshot: kindlings.map((k) => k.text),
        characters: rawChars.map((c) => ({ name: c.name, relationship: c.relationship })),
        characterNames: rawChars.map((c) => c.name),
        keyImage: keyImageData?.dataUrl ?? null,
        date: sessionDate, wordCount: content.length,
        createdAt: (prevDiary as Partial<NovelDiary>).createdAt ?? new Date().toISOString(),
      }
      storage.saveDiary(diary)
      rawChars.forEach((c) => storage.upsertCharacter(c as Character))

      const savedChars = rawChars.map((c) => storage.getCharacter(c.name) ?? c as unknown as Character)
      setDiaryContent(content); setSavedDiary(diary); setChars(savedChars); setStatus('done')
    } catch (err) {
      const msg = (err as Error).message ?? ''
      if ((err as Error).name === 'AbortError' || msg.includes('AbortError')) {
        // 사용자가 취소함 — 조용히 처리
        return
      }
      if (msg === 'API_KEY_MISSING') {
        setShowApiModal(true); setPendingGen(true)
      } else {
        setStatus('idle')
        const userMsg =
          msg.includes('401') || msg.includes('authentication') || msg.includes('invalid x-api-key')
            ? 'API 키가 올바르지 않아요. 키를 다시 확인해주세요.'
          : msg.includes('429') || msg.includes('rate_limit') || msg.includes('overloaded')
            ? 'Claude 서버가 혼잡해요. 잠시 후 다시 시도해주세요.'
          : msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')
            ? '네트워크 연결을 확인해주세요.'
          : `오류가 발생했어요: ${msg}`
        alert(userMsg)
      }
    } finally {
      isGenerating.current = false; abortCtrl.current = null; setProgress('')
    }
  }

  return (
    <>
      <PixelStars />
      <header className='app-header' style={{ height: 52 }}>
        <button className='app-logo' onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer' }}>
          <span className='logo-korean'>타닥타닥</span>
          <span className='logo-en'>◀ 모닥불로</span>
        </button>
        <div className='header-actions'>
          <span className='px-tag px-tag-fire'>KINDLING ×{kindlings.length}</span>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/timeline')}>[타임라인]</button>
        </div>
      </header>

      <div className='diary-grid' style={{ minHeight:'100vh', paddingTop:52, display:'grid', gridTemplateColumns:'300px 1fr', height:'100vh', position:'relative', zIndex:1 }}>

        {/* ── LEFT: Options Panel ── */}
        <aside className='diary-aside' style={{ borderRight:'3px solid var(--white)', height:'calc(100vh - 52px)', position:'sticky', top:52, overflowY:'auto', padding:'16px 14px', display:'flex', flexDirection:'column', gap:18, background:'var(--black)' }}>

          {/* Weather */}
          <div>
            <div className='opt-title'>► 날씨 <span style={{ color:'var(--text-off)', fontSize:7 }}>(선택)</span></div>
            <div className='weather-grid'>
              {WEATHER_OPTIONS.map((w) => (
                <div key={w.val} className={`weather-opt${weather === w.val ? ' sel' : ''}`}
                  onClick={() => setWeather((prev) => prev === w.val ? null : w.val)}>
                  <span className='weather-icon'>{w.icon}</span>{w.val}
                </div>
              ))}
            </div>
          </div>

          {/* Perspective */}
          <div>
            <div className='opt-title'>► 서술 시점</div>
            <div className='pv-grid'>
              {PERSPECTIVES.map((p) => (
                <div key={p.val} className={`pv-card${perspective === p.val ? ' sel' : ''}`} onClick={() => setPerspective(p.val)}>
                  <div className='pv-name'>{p.name}</div>
                  <div className='pv-ex'>{p.ex}</div>
                </div>
              ))}
            </div>
            {perspective.startsWith('3인칭') && (
              <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
                <div className='nickname-label'>▸ 소설 속 내 이름/호칭</div>
                <input className='pixel-input' placeholder='예: 지유, 그녀, 청년'
                  style={{ fontSize:12, padding:'7px 10px' }} value={nickname}
                  onChange={(e) => { setNickname(e.target.value); storage.savePrefs({ nickname: e.target.value }) }} />
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:6, color:'var(--text-off)', marginTop:3 }}>저장됨 · 다음에 자동 입력</div>
              </div>
            )}
          </div>

          {/* Processing Level */}
          <div>
            <div className='opt-title'>► 가공 정도</div>
            <div className='slider-wrap'>
              <div className='slider-ends'><span>담백하게</span><span>극적으로</span></div>
              <input type='range' min={1} max={5} value={procLevel}
                onChange={(e) => setProcLevel(+e.target.value as ProcessingLevel)} />
              <div className='slider-val'>[ {LV_LABELS[procLevel]} ]</div>
            </div>
          </div>

          {/* Style Refs */}
          <div>
            <div className='opt-title'>► 참고 문체 <span style={{ color:'var(--gray-4)', fontSize:6 }}>(복수 선택 가능)</span></div>
            <div className='sr-list'>
              <div className={`sr-none${selectedSrIds.size === 0 ? ' sel' : ''}`}
                onClick={() => setSelectedSrIds(new Set())}>
                [기본 문체]<span className='sr-check'>✓</span>
              </div>
              {styleRefs.map((sr) => (
                <div key={sr.id} className={`sr-item${selectedSrIds.has(sr.id) ? ' sel' : ''}`}
                  onClick={() => toggleStyleRef(sr.id)}>
                  <div className='sr-title'>{sr.title}</div>
                  <div className='sr-ex'>{sr.content.slice(0, 60)}…</div>
                  <span className='sr-check'>✓</span>
                </div>
              ))}
            </div>
            <div className='add-sr-toggle' style={{ marginTop:8 }} onClick={() => setShowAddSr(!showAddSr)}>
              + 새 문체 추가
            </div>
            {showAddSr && (
              <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:6 }}>
                <input ref={newSrTitleRef} className='pixel-input' placeholder='문체 이름' style={{ fontSize:12, padding:'6px 8px' }} />
                <textarea ref={newSrContentRef} className='pixel-input' placeholder='문체 샘플 텍스트 (최대 10,000자)' maxLength={10000} style={{ fontSize:12, minHeight:70 }} />
                <button className='pixel-btn pixel-btn-fire' style={{ fontSize:7, padding:'7px 10px' }} onClick={saveNewStyleRef}>▸ 저장 + 선택</button>
              </div>
            )}
          </div>

          {/* API Key status */}
          <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            <ApiKeyStatus key={showApiModal ? 'open' : 'closed'} onClear={() => setShowApiModal(true)} />
            <button className='gen-btn' disabled={status === 'generating'} onClick={startGeneration}>
              ▶ GENERATE DIARY ◀
            </button>
          </div>
        </aside>

        {/* ── RIGHT: Result Panel ── */}
        <main style={{ padding:'32px 40px', height:'calc(100vh - 52px)', overflowY:'auto', background:'var(--black)' }}>
          {status === 'idle' && (
            <div className='diary-empty'>
              <div className='de-ascii'>▒▒▒▒▒<br />░░░░░<br />▒▒▒▒▒</div>
              <div className='de-txt'>SET OPTIONS<br />PRESS GENERATE</div>
            </div>
          )}

          {status === 'generating' && (
            <div className='gen-overlay active'>
              <div className='gen-fire'>🔥</div>
              <div className='gen-label'>WRITING YOUR STORY</div>
              <div className='gen-sub'>타닥타닥, 이야기가 피어오르는 중</div>
              <div className='gen-progress'>{progress}</div>
              <button className='pixel-btn pixel-btn-sm' style={{ marginTop:16, fontSize:9, borderColor:'#555', color:'#888' }} onClick={cancelGeneration}>
                ✕ 취소
              </button>
            </div>
          )}

          {(status === 'done') && savedDiary && (
            <div>
              <div className='diary-meta'>
                <div className='diary-tags'>
                  <span className='px-tag px-tag-fire'>▸ GENERATED</span>
                  <span className='px-tag px-tag-white'>{perspective}</span>
                  <span className='px-tag px-tag-white'>{LV_LABELS[procLevel]}</span>
                  {weather && <span className='px-tag px-tag-white'>{weather}</span>}
                </div>
                <div className='diary-title'>{savedDiary.date}</div>
                <div className='diary-sub-meta'>
                  STYLE: {selectedSrIds.size > 0
                    ? styleRefs.filter((r) => selectedSrIds.has(r.id)).map((r) => r.title).join(', ').toUpperCase()
                    : '기본 문체'}
                </div>
              </div>

              <div className='diary-content'>
                {displayed}
                {!typingDone && <span className='px-cursor' />}
              </div>

              <div className='diary-actions'>
                <button className='pixel-btn' onClick={startGeneration}>↺ 다시 생성</button>
                <button className='pixel-btn' onClick={() => {
                  if (!savedDiary) return
                  const text = `${savedDiary.date}\n${'─'.repeat(32)}\n\n${savedDiary.content}\n`
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
                  a.download = `일기_${savedDiary.date}.txt`
                  a.click()
                  URL.revokeObjectURL(a.href)
                }}>↓ 텍스트 저장</button>
                <button className='pixel-btn pixel-btn-fire' onClick={() => navigate('/timeline')}>▸ 타임라인으로</button>
              </div>

              {chars.length > 0 && (
                <div className='char-section'>
                  <div className='char-section-title'>► 등장인물</div>
                  <div className='char-grid'>
                    {chars.map((char) => (
                      <div key={char.name} className='char-card' onClick={() => setCharModal(char)}>
                        <AvatarCanvas character={char} size={48} />
                        <div className='char-name'>{char.name}</div>
                        <div className='char-rel'>{char.relationship}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showApiModal && (
        <ApiKeyModal
          onSaved={() => { setShowApiModal(false); if (pendingGen) { setPendingGen(false); doGenerate() } }}
          onClose={() => { setShowApiModal(false); setPendingGen(false) }}
        />
      )}
      {charModal && <CharacterModal character={charModal} onClose={() => setCharModal(null)} />}
    </>
  )
}
