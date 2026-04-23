'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import {
  Folder, FolderPlus, FilePlus, FileText,
  ChevronRight, ChevronDown, Trash2, X, Check, Pencil, GitBranch, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const JournalEditor = dynamic(
  () => import('@/components/journal/JournalEditor'),
  { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading editor…</div> }
)

const MermaidEditor = dynamic(
  () => import('@/components/notes/MermaidEditor'),
  { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading diagram…</div> }
)

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FsFolder {
  _id:    string
  name:   string
  parent: string | null
}

interface FsNote {
  _id:     string
  name:    string
  parent:  string
  content: string
  date:    string | null
  type:    'note' | 'flow'
}

const AUTOSAVE_MS = 1500

// ─── Main component ────────────────────────────────────────────────────────────

function PimNotesInner() {
  const { silentRefresh } = useItems()

  // ── Data ──────────────────────────────────────────────────────────────────
  const [folders,     setFolders]     = useState<FsFolder[]>([])
  const [folderNotes, setFolderNotes] = useState<Record<string, FsNote[]>>({})

  // ── Sidebar tree ───────────────────────────────────────────────────────────
  const [expanded,       setExpanded]       = useState<Set<string>>(new Set(['root']))
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())
  const loadedRef = useRef<Set<string>>(new Set())

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [tabs,        setTabs]        = useState<FsNote[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  // ── Per-tab content & save state ───────────────────────────────────────────
  const [tabContents, setTabContents] = useState<Record<string, string>>({})
  const [savingTabs,  setSavingTabs]  = useState<Set<string>>(new Set())
  const [dirtyTabs,   setDirtyTabs]   = useState<Set<string>>(new Set())
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Inline creation ────────────────────────────────────────────────────────
  const [creatingIn,   setCreatingIn]   = useState<string | null>(null)
  const [creatingKind, setCreatingKind] = useState<'note' | 'flow' | 'folder' | null>(null)
  const [createName,   setCreateName]   = useState('')

  // ── Rename ─────────────────────────────────────────────────────────────────
  const [renamingId,  setRenamingId]  = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // ── Delete confirmations ───────────────────────────────────────────────────
  const [confirmNote,      setConfirmNote]      = useState<FsNote | null>(null)   // note pending delete
  const [confirmFolder,    setConfirmFolder]    = useState<FsFolder | null>(null) // folder pending delete
  const [folderConfirmVal, setFolderConfirmVal] = useState('')                    // typed name input

  // ── Load all folders on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/fs-folders')
      .then(r => r.json())
      .then((data: FsFolder[]) => {
        setFolders(data)
        loadNotesForFolder('root')
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load notes for a folder (lazy, once) ──────────────────────────────────
  async function loadNotesForFolder(folderId: string) {
    if (loadedRef.current.has(folderId)) return
    loadedRef.current.add(folderId)
    setLoadingFolders(prev => { const n = new Set(prev); n.add(folderId); return n })
    try {
      const res   = await fetch(`/api/fs-notes?parent=${folderId}`)
      const notes: FsNote[] = await res.json()
      setFolderNotes(prev => ({ ...prev, [folderId]: notes }))
    } catch {
      loadedRef.current.delete(folderId)
    }
    setLoadingFolders(prev => { const n = new Set(prev); n.delete(folderId); return n })
  }

  // ── Expand / collapse ──────────────────────────────────────────────────────
  function toggleFolder(folderId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
        loadNotesForFolder(folderId)
      }
      return next
    })
  }

  // ── Open note in tab ───────────────────────────────────────────────────────
  function openNote(note: FsNote) {
    setTabs(prev =>
      prev.some(t => t._id === note._id) ? prev : [...prev, note]
    )
    setActiveTabId(note._id)
    setTabContents(prev =>
      note._id in prev ? prev : { ...prev, [note._id]: note.content ?? '' }
    )
  }

  // ── Close tab ─────────────────────────────────────────────────────────────
  function closeTab(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setTabs(prev => {
      const idx  = prev.findIndex(t => t._id === id)
      if (idx === -1) return prev
      const next = prev.filter((_, i) => i !== idx)
      if (activeTabId === id) {
        setActiveTabId(next[Math.min(idx, next.length - 1)]?._id ?? null)
      }
      return next
    })
  }

  // ── Auto-save ──────────────────────────────────────────────────────────────
  const save = useCallback(async (tabId: string, content: string) => {
    setSavingTabs(prev => { const n = new Set(prev); n.add(tabId); return n })
    try {
      await fetch(`/api/fs-notes/${tabId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setFolderNotes(prev => {
        const next = { ...prev }
        for (const fid of Object.keys(next)) {
          next[fid] = next[fid].map(n => n._id === tabId ? { ...n, content } : n)
        }
        return next
      })
      setDirtyTabs(prev => { const n = new Set(prev); n.delete(tabId); return n })
    } finally {
      setSavingTabs(prev => { const n = new Set(prev); n.delete(tabId); return n })
    }
  }, [])

  function handleContentChange(tabId: string, content: string) {
    setTabContents(prev => ({ ...prev, [tabId]: content }))
    setDirtyTabs(prev => { const n = new Set(prev); n.add(tabId); return n })
    if (saveTimers.current[tabId]) clearTimeout(saveTimers.current[tabId])
    saveTimers.current[tabId] = setTimeout(() => save(tabId, content), AUTOSAVE_MS)
  }

  useEffect(() => () => {
    Object.values(saveTimers.current).forEach(clearTimeout)
  }, [])

  // ── CRUD ───────────────────────────────────────────────────────────────────
  function startCreate(folderId: string, kind: 'note' | 'flow' | 'folder') {
    setCreatingIn(folderId)
    setCreatingKind(kind)
    setCreateName('')
    setExpanded(prev => { const n = new Set(prev); n.add(folderId); return n })
  }

  async function submitCreate() {
    if (!createName.trim() || !creatingIn || !creatingKind) return
    const name = createName.trim()

    if (creatingKind === 'folder') {
      const res    = await fetch('/api/fs-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent: creatingIn }),
      })
      const folder: FsFolder = await res.json()
      setFolders(prev => [...prev, folder])
    } else {
      const res  = await fetch('/api/fs-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parent: creatingIn, content: '', type: creatingKind }),
      })
      const note: FsNote = await res.json()
      setFolderNotes(prev => ({
        ...prev,
        [creatingIn]: [note, ...(prev[creatingIn] ?? [])],
      }))
      openNote(note)
    }

    setCreatingIn(null)
    setCreatingKind(null)
    setCreateName('')
  }

  async function submitRename(id: string) {
    const name = renameValue.trim()
    if (!name) { setRenamingId(null); return }
    await fetch(`/api/fs-folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    setFolders(prev => prev.map(f => f._id === id ? { ...f, name } : f))
    setRenamingId(null)
  }

  async function confirmDeleteFolder() {
    if (!confirmFolder) return
    const id = confirmFolder._id
    await fetch(`/api/fs-folders/${id}`, { method: 'DELETE' })
    const allIds = new Set<string>()
    const collect = (fid: string) => {
      allIds.add(fid)
      folders.filter(f => f.parent === fid).forEach(f => collect(f._id))
    }
    collect(id)
    setFolders(prev => prev.filter(f => !allIds.has(f._id)))
    setFolderNotes(prev => {
      const next = { ...prev }
      allIds.forEach(fid => delete next[fid])
      return next
    })
    setTabs(prev => prev.filter(t => !allIds.has(t.parent)))
    setConfirmFolder(null)
    setFolderConfirmVal('')
  }

  async function confirmDeleteNote() {
    if (!confirmNote) return
    await fetch(`/api/fs-notes/${confirmNote._id}`, { method: 'DELETE' })
    setFolderNotes(prev => ({
      ...prev,
      [confirmNote.parent]: (prev[confirmNote.parent] ?? []).filter(n => n._id !== confirmNote._id),
    }))
    closeTab(confirmNote._id)
    setConfirmNote(null)
  }

  // ── Recursive folder tree ──────────────────────────────────────────────────
  function renderFolderTree(folder: FsFolder, depth: number): React.ReactNode {
    const isExpanded  = expanded.has(folder._id)
    const isLoading   = loadingFolders.has(folder._id)
    const notes       = folderNotes[folder._id] ?? []
    const subfolders  = folders.filter(f => f.parent === folder._id)
    const isProtected = folder._id === 'root'
    const label       = folder._id === 'root' ? 'Notes' : folder.name
    const indent      = depth * 10

    return (
      <div key={folder._id}>
        {/* Folder row */}
        <div className="group relative flex items-center" style={{ paddingLeft: indent }}>
          {renamingId === folder._id ? (
            <div className="flex items-center gap-1 px-2 py-1 flex-1 min-w-0">
              <Folder size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  submitRename(folder._id)
                  if (e.key === 'Escape') setRenamingId(null)
                }}
                onBlur={() => submitRename(folder._id)}
                className="flex-1 text-sm bg-transparent outline-none min-w-0"
                style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--border-hover)' }}
              />
            </div>
          ) : (
            <button
              onClick={() => toggleFolder(folder._id)}
              className="sidebar-item flex-1 min-w-0 pr-20"
            >
              {isExpanded
                ? <ChevronDown  size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                : <ChevronRight size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              }
              <Folder
                size={14}
                style={{ color: isExpanded ? 'var(--accent-light)' : 'var(--text-3)', flexShrink: 0 }}
              />
              <span className="truncate text-sm font-medium flex-1 text-left">{label}</span>
              {isLoading && (
                <Loader2 size={10} className="animate-spin flex-shrink-0" style={{ color: 'var(--text-3)' }} />
              )}
            </button>
          )}

          {renamingId !== folder._id && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={e => { e.stopPropagation(); startCreate(folder._id, 'note') }}
                className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-3)' }} title="New note"
              ><FilePlus size={10} /></button>
              <button
                onClick={e => { e.stopPropagation(); startCreate(folder._id, 'flow') }}
                className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-3)' }} title="New diagram"
              ><GitBranch size={10} /></button>
              <button
                onClick={e => { e.stopPropagation(); startCreate(folder._id, 'folder') }}
                className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-3)' }} title="New folder"
              ><FolderPlus size={10} /></button>
              {!isProtected && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setRenamingId(folder._id); setRenameValue(folder.name) }}
                    className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-3)' }} title="Rename"
                  ><Pencil size={10} /></button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmFolder(folder); setFolderConfirmVal('') }}
                    className="p-1 rounded hover:opacity-80" style={{ color: 'var(--text-3)' }} title="Delete"
                  ><Trash2 size={10} /></button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Children */}
        {isExpanded && (
          <div>
            {/* Inline create input */}
            {creatingIn === folder._id && creatingKind && (
              <div
                className="flex items-center gap-1 py-1 px-2"
                style={{ paddingLeft: (depth + 1) * 10 + 8, borderBottom: '1px solid var(--border)' }}
              >
                {creatingKind === 'folder'
                  ? <FolderPlus size={11} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                  : creatingKind === 'flow'
                    ? <GitBranch size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    : <FilePlus  size={11} style={{ color: 'var(--accent)',      flexShrink: 0 }} />}
                <input
                  autoFocus
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter')  submitCreate()
                    if (e.key === 'Escape') { setCreatingIn(null); setCreatingKind(null) }
                  }}
                  placeholder={
                    creatingKind === 'folder' ? 'Folder name…' :
                    creatingKind === 'flow'   ? 'Diagram name…' : 'Note name…'
                  }
                  className="flex-1 text-sm bg-transparent outline-none min-w-0"
                  style={{ color: 'var(--text-1)' }}
                />
                <button onClick={submitCreate}>
                  <Check size={11} style={{ color: 'var(--accent)' }} />
                </button>
                <button onClick={() => { setCreatingIn(null); setCreatingKind(null) }}>
                  <X size={10} style={{ color: 'var(--text-3)' }} />
                </button>
              </div>
            )}

            {/* Sub-folders */}
            {subfolders.map(sf => renderFolderTree(sf, depth + 1))}

            {/* Notes */}
            {notes.map(note => (
              <div
                key={note._id}
                className="group relative"
                style={{ paddingLeft: (depth + 1) * 10 }}
              >
                <button
                  onClick={() => openNote(note)}
                  className={cn('sidebar-item w-full pr-6', activeTabId === note._id && 'active')}
                >
                  {note.type === 'flow'
                    ? <GitBranch size={13} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                    : <FileText  size={13} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                  }
                  <span className="truncate text-sm">{note.name}</span>
                </button>
                <button
                  onClick={() => setConfirmNote(note)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  style={{ color: 'var(--text-3)' }}
                  title="Delete"
                ><Trash2 size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Active tab ─────────────────────────────────────────────────────────────
  const activeNote    = tabs.find(t => t._id === activeTabId) ?? null
  const activeContent = activeTabId ? (tabContents[activeTabId] ?? '') : ''
  const isActiveSaving = activeTabId ? savingTabs.has(activeTabId) : false
  const isActiveDirty  = activeTabId ? dirtyTabs.has(activeTabId) : false

  const rootFolder = folders.find(f => f._id === 'root')

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <main className="flex-1 flex overflow-hidden gap-2 h-full p-3">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
          style={{
            width: '28%',
            minWidth: 220,
            maxWidth: 380,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <div
            className="flex items-center gap-1.5 px-3 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-xs font-semibold flex-1 tracking-wider" style={{ color: 'var(--text-3)' }}>
              EXPLORER
            </span>
            <button
              onClick={() => startCreate('root', 'note')}
              className="p-1.5 rounded-md transition-colors hover:opacity-80"
              style={{ background: 'var(--accent)', color: 'white' }}
              title="New note"
            ><FilePlus size={12} /></button>
            <button
              onClick={() => startCreate('root', 'folder')}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: 'var(--text-2)', background: 'var(--input-bg)', border: '1px solid var(--border)' }}
              title="New folder"
            ><FolderPlus size={12} /></button>
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {rootFolder && renderFolderTree(rootFolder, 0)}
          </div>
        </div>

        {/* ── Editor panel ────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Tab bar */}
          <div
            className="flex-shrink-0 flex items-end overflow-x-auto"
            style={{
              borderBottom: '1px solid var(--border)',
              minHeight: 38,
              paddingTop: 6,
              paddingLeft: 8,
              paddingRight: 8,
              gap: 2,
            }}
          >
            {tabs.length === 0 ? (
              <span className="text-xs pb-2 pl-1" style={{ color: 'var(--text-3)' }}>No open files</span>
            ) : (
              tabs.map(note => {
                const isActive = activeTabId === note._id
                const isDirty  = dirtyTabs.has(note._id)
                return (
                  <button
                    key={note._id}
                    onClick={() => setActiveTabId(note._id)}
                    className="group/tab flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs transition-colors flex-shrink-0"
                    style={{
                      color:        isActive ? 'var(--text-1)' : 'var(--text-3)',
                      background:   isActive ? 'var(--surface)' : 'transparent',
                      fontWeight:   isActive ? 500 : 400,
                      maxWidth:     160,
                      border:       isActive ? '1px solid var(--border)' : '1px solid transparent',
                      borderBottom: isActive ? '1px solid var(--surface)' : '1px solid transparent',
                      marginBottom: isActive ? -1 : 0,
                    }}
                  >
                    <span style={{ flexShrink: 0, color: isActive ? 'var(--accent-light)' : 'var(--text-3)' }}>
                      {note.type === 'flow' ? <GitBranch size={11} /> : <FileText size={11} />}
                    </span>
                    <span className="truncate">{note.name}</span>
                    {isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />
                    )}
                    <span
                      role="button"
                      className="flex-shrink-0 opacity-0 group-hover/tab:opacity-50 hover:!opacity-100 transition-opacity"
                      onClick={e => closeTab(note._id, e)}
                    ><X size={10} style={{ color: 'var(--text-3)' }} /></span>
                  </button>
                )
              })
            )}

            {/* Save indicator */}
            <div className="ml-auto flex items-center pb-1.5 pr-1 flex-shrink-0">
              {isActiveSaving && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                  <Loader2 size={10} className="animate-spin" /> Saving…
                </span>
              )}
              {!isActiveSaving && !isActiveDirty && activeNote && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saved</span>
              )}
            </div>
          </div>

          {/* Editor body */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">

            {!activeNote && (
              <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: 'var(--text-3)', fontSize: 14 }}>
                <FileText size={32} style={{ opacity: 0.3 }} />
                <p>Select a note from the sidebar to start writing</p>
              </div>
            )}

            {activeNote && (
              <div
                className="flex-1 flex flex-col overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--surface)',
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                {activeNote.type === 'flow' ? (
                  <MermaidEditor
                    key={activeNote._id}
                    content={activeContent}
                    onChange={c => handleContentChange(activeNote._id, c)}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto px-10 py-10">
                    <JournalEditor
                      key={activeNote._id}
                      content={activeContent}
                      onChange={c => handleContentChange(activeNote._id, c)}
                      date={activeNote._id}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <FloatingChat onRefreshItems={silentRefresh} />

      {/* ── Note delete confirm ──────────────────────────────────────────── */}
      {confirmNote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setConfirmNote(null)}
        >
          <div
            className="flex flex-col gap-4 rounded-2xl p-6"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
              width: 360,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Delete note?</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>"{confirmNote.name}"</span> will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmNote(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteNote}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: '#ef4444', color: 'white' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folder delete confirm (type name) ───────────────────────────── */}
      {confirmFolder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => { setConfirmFolder(null); setFolderConfirmVal('') }}
        >
          <div
            className="flex flex-col gap-4 rounded-2xl p-6"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
              width: 400,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <Trash2 size={16} style={{ color: '#ef4444' }} />
              </div>
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-1)' }}>Delete folder?</p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  This will permanently delete <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>"{confirmFolder.name}"</span> and all notes and subfolders inside it.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: 'var(--text-3)' }}>
                Type <span style={{ color: 'var(--text-2)', fontWeight: 600, fontFamily: 'monospace' }}>{confirmFolder.name}</span> to confirm
              </label>
              <input
                autoFocus
                value={folderConfirmVal}
                onChange={e => setFolderConfirmVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && folderConfirmVal === confirmFolder.name) confirmDeleteFolder()
                  if (e.key === 'Escape') { setConfirmFolder(null); setFolderConfirmVal('') }
                }}
                placeholder={confirmFolder.name}
                className="px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: 'var(--input-bg)',
                  border: `1px solid ${folderConfirmVal === confirmFolder.name ? '#ef4444' : 'var(--border)'}`,
                  color: 'var(--text-1)',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setConfirmFolder(null); setFolderConfirmVal('') }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                disabled={folderConfirmVal !== confirmFolder.name}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
                style={{
                  background: folderConfirmVal === confirmFolder.name ? '#ef4444' : 'var(--input-bg)',
                  color: folderConfirmVal === confirmFolder.name ? 'white' : 'var(--text-3)',
                  border: `1px solid ${folderConfirmVal === confirmFolder.name ? '#ef4444' : 'var(--border)'}`,
                  cursor: folderConfirmVal === confirmFolder.name ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Delete folder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function PimNotesPage() {
  return (
    <Suspense>
      <PimNotesInner />
    </Suspense>
  )
}
