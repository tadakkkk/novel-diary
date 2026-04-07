'use strict'
// ── 타닥타닥 localStorage 서비스 ──────────────────────────────────────────────
const StorageService = (() => {
  const P = 'tadak:'
  const K = {
    API_KEY:    P + 'api-key',
    USER:       P + 'user',
    PREFS:      P + 'user-prefs',      // { nickname, lastDuration }
    STYLE_REFS: P + 'style-refs',
    SESSIONS:   P + 'sessions',
    DIARIES:    P + 'diaries',
    CHARACTERS: P + 'characters',
    BLOCKED:    P + 'blocked-chars',   // 등록 차단된 인물 이름 목록
    kindlings:  id => P + `kindlings:${id}`,
    keyImage:   id => P + `key-image:${id}`,
    attachments:id => P + `attachments:${id}`,
  }

  const read  = key => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null } catch { return null } }
  const write = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch(e) { console.error('storage write error', e) } }

  return {
    // ── API Key ──────────────────────────────────────────────────────────────
    getApiKey: ()    => localStorage.getItem(K.API_KEY) || '',
    setApiKey: (key) => localStorage.setItem(K.API_KEY, key),

    // ── User / Prefs ─────────────────────────────────────────────────────────
    getPrefs: ()          => read(K.PREFS) || {},
    savePrefs: (prefs)    => write(K.PREFS, { ...(read(K.PREFS) || {}), ...prefs }),

    // ── Style References ─────────────────────────────────────────────────────
    getStyleRefs: ()           => read(K.STYLE_REFS) || [],
    saveStyleRef: (ref) => {
      const list = read(K.STYLE_REFS) || []
      const idx  = list.findIndex(r => r.id === ref.id)
      if (idx >= 0) list[idx] = ref; else list.push(ref)
      write(K.STYLE_REFS, list)
    },
    deleteStyleRef: (id) => {
      write(K.STYLE_REFS, (read(K.STYLE_REFS) || []).filter(r => r.id !== id))
    },

    // ── Sessions ─────────────────────────────────────────────────────────────
    getSessions: ()           => read(K.SESSIONS) || [],
    getSession: (id)          => (read(K.SESSIONS) || []).find(s => s.id === id) || null,
    saveSession: (session)    => {
      const list = read(K.SESSIONS) || []
      const idx  = list.findIndex(s => s.id === session.id)
      if (idx >= 0) list[idx] = session; else list.push(session)
      write(K.SESSIONS, list)
    },

    // ── Kindlings ────────────────────────────────────────────────────────────
    getKindlings: (sessionId)         => read(K.kindlings(sessionId)) || [],
    saveKindlings: (sessionId, list)  => write(K.kindlings(sessionId), list),

    // ── KeyImage ─────────────────────────────────────────────────────────────
    getKeyImage: (sessionId)       => read(K.keyImage(sessionId)),
    saveKeyImage: (sessionId, img) => write(K.keyImage(sessionId), img),

    // ── Diaries ──────────────────────────────────────────────────────────────
    getDiaries: ()          => read(K.DIARIES) || [],
    getDiary:   (id)        => (read(K.DIARIES) || []).find(d => d.id === id) || null,
    saveDiary: (diary)      => {
      const list = read(K.DIARIES) || []
      const idx  = list.findIndex(d => d.id === diary.id)
      if (idx >= 0) list[idx] = diary; else list.unshift(diary) // newest first
      write(K.DIARIES, list)
    },
    deleteDiary: (id) => {
      write(K.DIARIES, (read(K.DIARIES) || []).filter(d => d.id !== id))
    },

    // ── Characters ───────────────────────────────────────────────────────────
    getCharacters: ()          => read(K.CHARACTERS) || [],
    getCharacter:  (name)      => (read(K.CHARACTERS) || []).find(c => c.name === name) || null,
    upsertCharacter: (char)    => {
      const list = read(K.CHARACTERS) || []
      const idx  = list.findIndex(c => c.name === char.name)
      if (idx >= 0) {
        // merge: append new diary appearances, update episodes
        const existing = list[idx]
        list[idx] = {
          ...existing, ...char,
          appearances: [...new Set([...(existing.appearances || []), ...(char.appearances || [])])],
          episodes:    (() => {
            const merged = [...(existing.episodes || []), ...(char.episodes || [])]
            const seen = new Set()
            return merged.filter(e => {
              const key = (e.date || '') + '|' + (e.summary || e.role || '')
              if (seen.has(key)) return false
              seen.add(key); return true
            }).slice(-20)
          })(),
          avatarData:  char.avatarData || existing.avatarData,
        }
      } else { list.push(char) }
      write(K.CHARACTERS, list)
    },
    saveCharacterAvatar: (name, avatarData) => {
      const list = read(K.CHARACTERS) || []
      const idx  = list.findIndex(c => c.name === name)
      if (idx >= 0) { list[idx].avatarData = avatarData; write(K.CHARACTERS, list) }
    },
    deleteCharacter: (name) => {
      write(K.CHARACTERS, (read(K.CHARACTERS) || []).filter(c => c.name !== name))
    },

    // ── Blocked Characters ────────────────────────────────────────────────────
    getBlockedChars: ()       => read(K.BLOCKED) || [],
    blockChar:       (name)   => {
      const list = read(K.BLOCKED) || []
      if (!list.includes(name)) { list.push(name); write(K.BLOCKED, list) }
    },
    unblockChar:     (name)   => write(K.BLOCKED, (read(K.BLOCKED) || []).filter(n => n !== name)),
    isBlocked:       (name)   => (read(K.BLOCKED) || []).includes(name),

    // ── Attachments ───────────────────────────────────────────────────────────
    getAttachments:  (id)     => read(K.attachments(id)) || [],
    saveAttachment:  (id, att) => {
      const list = read(K.attachments(id)) || []
      list.push(att)
      write(K.attachments(id), list.slice(-3))  // 최대 3개
    },
  }
})()
