import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { type Character, type NovelDiary } from '@/types'
import * as storage from '@/services/storage'
import * as avatar from '@/services/avatar/avatar-service'
import { PixelStars } from '@/components/ui/PixelStars'
import { AvatarCanvas } from '@/components/ui/AvatarCanvas'

// ── Storage Usage ─────────────────────────────────────────────────────────
function StorageUsage() {
  let bytes = 0
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (!key.startsWith('novel-diary')) continue
      bytes += (localStorage.getItem(key) ?? '').length * 2  // UTF-16
    }
  } catch { /* ignore */ }
  const kb = bytes / 1024
  const label = kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`
  const pct   = Math.min(kb / 5120, 1)  // 5 MB 기준
  const color = pct > 0.8 ? '#ff5555' : pct > 0.5 ? 'var(--fire-org)' : 'var(--gray-4)'
  return (
    <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color, letterSpacing:'0.06em' }}
      title={`localStorage 사용량 (약 5 MB 한도)`}>
      💾 {label}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatDate(iso: string | undefined) {
  if (!iso) return '날짜 없음'
  const d = new Date(iso)
  const days = ['일','월','화','수','목','금','토']
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}
function formatDateShort(iso: string | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}


// ── Character Modal ───────────────────────────────────────────────────────
function CharModal({ name, onClose }: { name: string; onClose: () => void }) {
  const [char, setChar] = useState(() => storage.getCharacter(name))
  const [editingRel, setEditingRel] = useState(false)
  const [relVal, setRelVal] = useState(char?.relationship ?? '')
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (editingRel) setEditingRel(false); else onClose() } }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, editingRel])
  if (!char) return null

  function saveRel() {
    const updated = { ...char!, relationship: relVal }
    storage.upsertCharacter(updated)
    setChar(updated)
    setEditingRel(false)
  }

  return (
    <div className='modal-overlay open' onClick={onClose}>
      <div style={{ width:'100%', maxWidth:440, background:'var(--black)', border:'3px solid var(--fire-org)', boxShadow:'inset 0 0 0 2px var(--fire-org), inset 0 0 0 5px var(--black)' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ padding:'16px 20px 14px', borderBottom:'2px solid rgba(255,90,0,0.4)', display:'flex', alignItems:'center', gap:16 }}>
          <AvatarCanvas character={char} size={72} />
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:'var(--font-korean)', fontSize:20, fontWeight:700, color:'var(--white)', marginBottom:4 }}>{char.name}</div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {editingRel ? (
                <input
                  autoFocus
                  value={relVal}
                  onChange={(e) => setRelVal(e.target.value)}
                  onBlur={saveRel}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRel(); if (e.key === 'Escape') setEditingRel(false) }}
                  style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--white)', background:'#1a1a1a', border:'1px solid var(--fire-org)', outline:'none', padding:'2px 6px', letterSpacing:'0.06em', flex:1, minWidth:0 }}
                />
              ) : (
                <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--fire-org)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  {char.relationship || '—'}
                </span>
              )}
              {!editingRel && (
                <button
                  onClick={() => { setRelVal(char.relationship ?? ''); setEditingRel(true) }}
                  style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--fire-org)', background:'transparent', border:'none', cursor:'pointer', padding:'0 2px', lineHeight:1, opacity:0.7 }}
                  title='설명 수정'>✏</button>
              )}
            </div>
          </div>
          <button className='modal-close' onClick={onClose}>[ ✕ ]</button>
        </div>
        <div style={{ padding:'16px 20px 20px' }}>
          <div style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--gray-4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>등장 일기</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:16 }}>
            {(char.appearances ?? []).length === 0
              ? <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--text-off)' }}>없음</span>
              : char.appearances.slice(-10).map((d) => (
                <span key={d} style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--fire-amb)', border:'1px solid var(--fire-org)', padding:'3px 8px', letterSpacing:'0.06em' }}>{d}</span>
              ))}
          </div>
          <div style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--gray-4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8, paddingTop:12, borderTop:'1px solid var(--gray-2)' }}>에피소드</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {(char.episodes ?? []).length === 0
              ? <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--text-off)' }}>에피소드 없음</div>
              : char.episodes.map((ep, i) => (
                <div key={i} style={{ borderLeft:'2px solid var(--fire-org)', paddingLeft:10 }}>
                  <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-4)', marginBottom:3, letterSpacing:'0.06em' }}>{ep.date}</div>
                  <div style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-5)', lineHeight:1.6 }}>{ep.summary}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Diary Modal ───────────────────────────────────────────────────────────
function DiaryModal({ diary, onClose, onDelete, onEdit }: {
  diary: NovelDiary; onClose: () => void
  onDelete: () => void; onEdit: () => void
}) {
  const [charModalName, setCharModalName] = useState<string | null>(null)
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (charModalName) setCharModalName(null); else onClose() }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose, charModalName])

  const charNames = diary.characterNames ?? (diary.characters ?? []).map((c) => typeof c === 'string' ? c : c.name)
  const chars = charNames.map((n) => storage.getCharacter(n)).filter(Boolean) as Character[]
  const kindlings = diary.kindlings ?? []
  const keyImageUrl = typeof diary.keyImage === 'string' ? diary.keyImage : (diary.keyImage as { dataUrl: string } | null)?.dataUrl

  return (
    <>
      <div className='modal-overlay open' onClick={onClose}>
        <div style={{ width:'100%', maxWidth:680, background:'var(--black)', border:'3px solid var(--white)', boxShadow:'inset 0 0 0 2px var(--white), inset 0 0 0 5px var(--black)' }}
          onClick={(e) => e.stopPropagation()}>
          <div style={{ padding:'16px 20px 14px', borderBottom:'2px solid var(--gray-2)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <div>
              <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--fire-amb)', letterSpacing:'0.1em', marginBottom:6 }}>{formatDate(diary.date)}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                {diary.generationOptions?.perspective && (
                  <span className='px-tag px-tag-white'>{diary.generationOptions.perspective}</span>
                )}
                {diary.generationOptions?.weather && (
                  <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--gray-4)' }}>{diary.generationOptions.weather}</span>
                )}
                {diary.kindlings && (
                  <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--text-off)' }}>땔감 {diary.kindlings.length}개</span>
                )}
              </div>
            </div>
            <button className='modal-close' onClick={onClose}>[ ✕ ]</button>
          </div>

          {keyImageUrl && <img src={keyImageUrl} alt='' style={{ width:'100%', maxHeight:220, objectFit:'cover', display:'block', borderBottom:'2px solid var(--gray-2)' }} />}

          <div style={{ padding:'24px 28px 28px' }}>
            <div style={{ fontFamily:'var(--font-korean)', fontSize:15, color:'var(--gray-5)', lineHeight:2, whiteSpace:'pre-wrap', wordBreak:'keep-all' }}>
              {diary.content}
            </div>

            {chars.length > 0 && (
              <>
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--gray-4)', letterSpacing:'0.1em', textTransform:'uppercase', margin:'24px 0 12px', paddingTop:18, borderTop:'1px solid var(--gray-2)' }}>등장인물</div>
                <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                  {chars.map((char) => (
                    <div key={char.name} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, cursor:'pointer' }}
                      onClick={() => setCharModalName(char.name)}>
                      <div style={{ border:'1px solid var(--gray-3)', padding:2 }}>
                        <AvatarCanvas character={char} size={48} />
                      </div>
                      <div style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--gray-4)', maxWidth:72, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{char.name}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {kindlings.length > 0 && (
              <>
                <div style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--gray-4)', letterSpacing:'0.1em', textTransform:'uppercase', margin:'24px 0 12px', paddingTop:18, borderTop:'1px solid var(--gray-2)' }}>오늘의 땔감</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {kindlings.map((k, i) => (
                    <div key={k.id ?? i} style={{ display:'flex', gap:10, padding:'9px 12px', borderLeft:'2px solid var(--gray-2)', lineHeight:1.6 }}>
                      <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--fire-org)', flexShrink:0, paddingTop:2 }}>#{i+1}</span>
                      <span style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'var(--gray-4)' }}>{k.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display:'flex', gap:8, marginTop:20, justifyContent:'flex-end', paddingTop:16, borderTop:'1px solid var(--gray-2)' }}>
              <button className='pixel-btn pixel-btn-sm' onClick={onEdit}>✎ 다시 쓰기</button>
              <button className='pixel-btn pixel-btn-sm' style={{ borderColor:'#ff5555', color:'#ff5555' }} onClick={onDelete}>✕ 삭제</button>
            </div>
          </div>
        </div>
      </div>
      {charModalName && <CharModal name={charModalName} onClose={() => setCharModalName(null)} />}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const navigate = useNavigate()
  const [diaries, setDiaries] = useState<NovelDiary[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [blockedChars, setBlockedChars] = useState<string[]>([])
  const [selectedDiary, setSelectedDiary] = useState<NovelDiary | null>(null)
  const [charModalName, setCharModalName] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBlocked, setShowBlocked] = useState(false)
  function handleExport() {
    const data = storage.exportAllData()
    const json = JSON.stringify(data, null, 2)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = `타닥타닥_백업_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target!.result as string) as storage.ExportData
        if (!confirm(`가져오면 현재 데이터 위에 덮어써져요.\n일기 ${data.diaries?.length ?? 0}편, 인물 ${data.characters?.length ?? 0}명을 가져올까요?`)) return
        storage.importAllData(data)
        loadData()
        alert('가져오기 완료!')
      } catch (err) {
        alert('파일을 읽을 수 없어요: ' + (err as Error).message)
      }
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  function loadData() {
    setDiaries(storage.getDiaries())
    setCharacters(storage.getCharacters())
    setBlockedChars(storage.getBlockedChars())
  }

  useEffect(() => { loadData() }, [])

  function handleDelete() {
    if (!deleteTarget) return
    storage.deleteDiary(deleteTarget)
    setDeleteTarget(null)
    setSelectedDiary(null)
    loadData()
  }

  function handleEdit(diary: NovelDiary) {
    setSelectedDiary(null)
    navigate(`/diary?session=${diary.sessionId ?? ''}&edit=${diary.id}`)
  }

  function regenAvatar(name: string) {
    const char = storage.getCharacter(name)
    if (!char) return
    if (!char.avatarData) char.avatarData = {}
    char.avatarData.seed = avatar.generateSeed()
    storage.upsertCharacter(char)
    loadData()
  }

  return (
    <>
      <PixelStars />
      <header className='app-header'>
        <button className='app-logo' onClick={() => navigate('/')} style={{ background:'none', border:'none', cursor:'pointer' }}>
          <span className='logo-korean'>타닥타닥</span>
          <span className='logo-en'>◀ 모닥불로</span>
        </button>
        <div className='header-actions'>
          <button className='pixel-btn pixel-btn-sm' onClick={handleExport} title='전체 데이터 내보내기'>↓ 내보내기</button>
          <label className='pixel-btn pixel-btn-sm' style={{ cursor:'pointer' }} title='백업 파일 가져오기'>
            ↑ 가져오기
            <input type='file' accept='.json' style={{ display:'none' }} onChange={handleImport} />
          </label>
          <button className='pixel-btn pixel-btn-sm pixel-btn-fire' onClick={() => navigate('/')}>▸ 새 일기</button>
          <button className='pixel-btn pixel-btn-sm' onClick={() => navigate('/novel')}>📖 나의 이야기</button>
        </div>
      </header>

      <div style={{ minHeight:'100vh', paddingTop:64, maxWidth:760, margin:'0 auto', padding:'64px 28px 0', position:'relative', zIndex:1 }}>

        <h1 style={{ fontFamily:'var(--font-pixel)', fontSize:14, color:'var(--fire-amb)', letterSpacing:'0.1em', textTransform:'uppercase', paddingTop:32 }}>
          일기 타임라인
        </h1>
        <div style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--gray-4)', margin:'12px 0 0', letterSpacing:'0.1em', paddingBottom:20, borderBottom:'2px solid var(--gray-2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span>{diaries.length > 0 ? `${diaries.length}편의 일기` : 'NO DIARIES YET'}</span>
          <StorageUsage />
        </div>

        {/* ── Character Roster ──────────────────────────────────────────── */}
        <div style={{ marginTop:24, border:'3px solid var(--fire-org)', boxShadow:'inset 0 0 0 2px var(--fire-org), inset 0 0 0 5px var(--black)', background:'var(--black)' }}>
          <div style={{ padding:'10px 16px 8px', borderBottom:'2px solid var(--fire-org)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--fire-org)', letterSpacing:'0.12em', textTransform:'uppercase' }}>▸ 등장인물</span>
            <span style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--fire-amb)' }}>{characters.length}명</span>
          </div>
          <div style={{ overflowX:'auto', overflowY:'hidden', padding:'16px 12px 12px', scrollbarWidth:'thin' } as React.CSSProperties}>
            {characters.length === 0 ? (
              <div style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--text-off)', textAlign:'center', padding:'24px 0 16px', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                NO CHARACTERS YET
              </div>
            ) : (
              <div style={{ display:'flex', gap:12, width:'max-content', paddingBottom:4 }}>
                {characters.map((char) => (
                  <div key={char.name}
                    style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer', padding:'10px 8px 8px', border:'2px solid var(--gray-3)', background:'var(--black)', width:80, flexShrink:0 }}
                    onClick={() => setCharModalName(char.name)}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--fire-org)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--gray-3)')}>
                    <AvatarCanvas character={char} size={48} />
                    <div style={{ fontFamily:'var(--font-korean)', fontSize:12, fontWeight:700, color:'var(--white)', textAlign:'center', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:72 }}>{char.name}</div>
                    <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-4)', textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:72 }}>{char.relationship}</div>
                    <div style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--fire-org)', letterSpacing:'0.06em' }}>{(char.appearances ?? []).length}회</div>
                    <div style={{ display:'flex', gap:4, justifyContent:'center', marginTop:2 }}>
                      <button
                        style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-3)', background:'transparent', border:'none', cursor:'pointer', padding:'2px 4px' }}
                        onClick={(e) => { e.stopPropagation(); regenAvatar(char.name) }}
                        title='아바타 다시 생성'>↺</button>
                      <button
                        style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'#e06060', background:'transparent', border:'1px solid #663333', cursor:'pointer', padding:'2px 5px' }}
                        onClick={(e) => { e.stopPropagation(); if (confirm(`"${char.name}"을(를) 차단하면 앞으로 이 인물이 일기에 등장하지 않아요.\n차단할까요?`)) { storage.blockChar(char.name); loadData() } }}
                        title='일기에서 차단'>🚫</button>
                      <button
                        style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-3)', background:'transparent', border:'1px solid var(--gray-3)', cursor:'pointer', padding:'2px 5px' }}
                        onClick={(e) => { e.stopPropagation(); if (confirm(`"${char.name}" 을(를) 삭제할까요?`)) { storage.deleteCharacter(char.name); loadData() } }}
                        title='인물 삭제'>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Blocked Characters ────────────────────────────────────────── */}
        {blockedChars.length > 0 && (
          <div style={{ marginTop:12, border:'1px solid #333', background:'#080808' }}>
            <button
              style={{ width:'100%', padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background:'transparent', border:'none', cursor:'pointer' }}
              onClick={() => setShowBlocked((v) => !v)}>
              <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'#663333', letterSpacing:'0.1em' }}>🚫 차단된 인물 {blockedChars.length}명</span>
              <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--gray-3)' }}>{showBlocked ? '▲' : '▼'}</span>
            </button>
            {showBlocked && (
              <div style={{ padding:'0 14px 14px', display:'flex', flexWrap:'wrap', gap:8 }}>
                {blockedChars.map((name) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:8, border:'1px solid #333', padding:'5px 10px', background:'#0a0a0a' }}>
                    <span style={{ fontFamily:'var(--font-korean)', fontSize:13, color:'#666' }}>{name}</span>
                    <button
                      style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--fire-org)', background:'transparent', border:'1px solid #442200', cursor:'pointer', padding:'2px 7px' }}
                      onClick={() => { storage.unblockChar(name); loadData() }}>
                      차단 해제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Diary List ────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', margin:'28px 0 12px', paddingBottom:10, borderBottom:'2px solid var(--gray-2)' }}>
          <span style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--gray-4)', letterSpacing:'0.1em', textTransform:'uppercase' }}>DIARIES</span>
        </div>

        {/* Search */}
        {diaries.length > 0 && (
          <div style={{ marginBottom:14, display:'flex', gap:8, alignItems:'center' }}>
            <input
              className='pixel-input'
              style={{ flex:1, fontSize:12, padding:'7px 10px' }}
              placeholder='일기 내용, 날짜로 검색...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className='pixel-btn pixel-btn-sm' onClick={() => setSearchQuery('')}
                style={{ fontSize:10, padding:'6px 10px', flexShrink:0 }}>✕</button>
            )}
          </div>
        )}

        {diaries.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', color:'var(--text-off)', fontFamily:'var(--font-pixel)', fontSize:12, textAlign:'center', lineHeight:2.4, letterSpacing:'0.1em', textTransform:'uppercase' }}>
            <div style={{ fontSize:32, marginBottom:16, opacity:0.2 }}>📖</div>
            일기가 없어요<br />먼저 일기를 써보세요
            <button className='pixel-btn pixel-btn-sm' style={{ marginTop:16 }} onClick={() => navigate('/')}>일기 쓰러 가기</button>
          </div>
        ) : (() => {
          const q = searchQuery.trim().toLowerCase()
          const filtered = q
            ? diaries.filter((d) =>
                (d.content ?? '').toLowerCase().includes(q) ||
                (d.date ?? '').includes(q) ||
                (d.kindlings ?? []).some((k) => (typeof k === 'string' ? k : k.text ?? '').toLowerCase().includes(q))
              )
            : diaries
          return (
          <div style={{ display:'flex', flexDirection:'column', gap:16, paddingBottom:60 }}>
            {filtered.length === 0 && (
              <div style={{ fontFamily:'var(--font-pixel)', fontSize:11, color:'var(--text-off)', textAlign:'center', padding:'48px 0', letterSpacing:'0.1em' }}>
                검색 결과가 없어요
              </div>
            )}
            {filtered.map((diary) => {
              const charNames = diary.characterNames ?? (diary.characters ?? []).map((c) => typeof c === 'string' ? c : c.name)
              const cardChars = charNames.slice(0, 4).map((n) => storage.getCharacter(n)).filter(Boolean) as Character[]
              const keyImageUrl = typeof diary.keyImage === 'string' ? diary.keyImage : (diary.keyImage as { dataUrl: string } | null)?.dataUrl
              return (
                <div key={diary.id}
                  style={{ border:'3px solid var(--gray-3)', background:'var(--black)', cursor:'pointer', position:'relative' }}
                  onClick={() => setSelectedDiary(diary)}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--white)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--gray-3)')}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr auto' }}>
                    <div style={{ padding:'16px 16px 14px', minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8, flexWrap:'wrap' }}>
                        <span style={{ fontFamily:'var(--font-pixel)', fontSize:12, color:'var(--fire-amb)', letterSpacing:'0.08em' }}>{formatDateShort(diary.date)}</span>
                        {diary.generationOptions?.perspective && (
                          <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, padding:'2px 7px', border:'1px solid var(--gray-3)', color:'var(--gray-4)' }}>{diary.generationOptions.perspective}</span>
                        )}
                        <span style={{ fontFamily:'var(--font-pixel)', fontSize:9, color:'var(--text-off)' }}>
                          {diary.kindlings ? `땔감 ${diary.kindlings.length}개` : ''}
                        </span>
                      </div>
                      <div style={{ fontFamily:'var(--font-korean)', fontSize:14, color:'var(--gray-5)', lineHeight:1.7, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden', marginBottom:12 }}>
                        {diary.content?.slice(0, 200)}
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:8, flexWrap:'wrap' }}>
                        {cardChars.map((char) => (
                          <div key={char.name} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}
                            onClick={(e) => { e.stopPropagation(); setCharModalName(char.name) }}>
                            <AvatarCanvas character={char} size={28} />
                            <span style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--gray-4)', maxWidth:44, textAlign:'center', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{char.name}</span>
                          </div>
                        ))}
                        {charNames.length > 4 && (
                          <span style={{ fontFamily:'var(--font-pixel)', fontSize:10, color:'var(--text-off)', alignSelf:'center', paddingBottom:4 }}>+{charNames.length - 4}</span>
                        )}
                      </div>
                    </div>
                    {keyImageUrl ? (
                      <div style={{ width:110, flexShrink:0, borderLeft:'2px solid var(--gray-3)', overflow:'hidden' }}>
                        <img src={keyImageUrl} alt='' style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                      </div>
                    ) : (
                      <div style={{ width:110, minHeight:100, display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a', borderLeft:'2px solid var(--gray-3)' }}>
                        <span style={{ fontFamily:'var(--font-pixel)', fontSize:8, color:'var(--text-off)', transform:'rotate(-90deg)', whiteSpace:'nowrap', letterSpacing:'0.06em' }}>NO IMAGE</span>
                      </div>
                    )}
                  </div>
                  <div style={{ borderTop:'1px solid var(--gray-2)', padding:'6px 10px', display:'flex', justifyContent:'flex-end', gap:6 }}>
                    <button className='pixel-btn pixel-btn-sm'
                      style={{ fontSize:9, padding:'4px 10px', borderWidth:1 }}
                      onClick={(e) => { e.stopPropagation(); handleEdit(diary) }}>✎ 다시 쓰기</button>
                    <button className='pixel-btn pixel-btn-sm'
                      style={{ fontSize:9, padding:'4px 10px', borderWidth:1, borderColor:'#ff5555', color:'#ff5555' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(diary.id) }}>✕ 삭제</button>
                  </div>
                </div>
              )
            })}
          </div>
          )
        })()}
      </div>

      {/* ── Diary Detail Modal ─────────────────────────────────────────── */}
      {selectedDiary && (
        <DiaryModal
          diary={selectedDiary}
          onClose={() => setSelectedDiary(null)}
          onDelete={() => { setSelectedDiary(null); setDeleteTarget(selectedDiary.id) }}
          onEdit={() => handleEdit(selectedDiary)}
        />
      )}

      {/* ── Character Modal ────────────────────────────────────────────── */}
      {charModalName && <CharModal name={charModalName} onClose={() => setCharModalName(null)} />}

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className='modal-overlay open' onClick={() => setDeleteTarget(null)}>
          <div style={{ background:'var(--black)', border:'3px solid var(--white)', boxShadow:'inset 0 0 0 2px var(--white), inset 0 0 0 5px var(--black)', padding:36, textAlign:'center', maxWidth:400 }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily:'var(--font-pixel)', fontSize:14, color:'var(--white)', marginBottom:24, letterSpacing:'0.08em', lineHeight:2 }}>
              정말 삭제할까요?<br />
              <span style={{ fontSize:10, color:'var(--gray-4)' }}>되돌릴 수 없어요</span>
            </div>
            <div style={{ display:'flex', gap:16, justifyContent:'center' }}>
              <button style={{ fontFamily:'var(--font-korean)', fontSize:14, fontWeight:700, padding:'10px 20px', border:'3px solid #ff5555', color:'#ff5555', background:'transparent', cursor:'pointer' }}
                onClick={handleDelete}>삭제</button>
              <button style={{ fontFamily:'var(--font-korean)', fontSize:14, fontWeight:700, padding:'10px 20px', border:'3px solid var(--white)', color:'var(--white)', background:'transparent', cursor:'pointer' }}
                onClick={() => setDeleteTarget(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
