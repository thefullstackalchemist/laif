'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { CalView } from '@/components/calendar/CalendarView'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, isSameMonth, parseISO,
  startOfWeek, endOfWeek,
} from 'date-fns'
import {
  BookOpen, Folder, FolderPlus, FilePlus, FileText, ChevronLeft,
  ChevronRight, Trash2, X, Check, Pencil, GitBranch, Loader2, PenLine,
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Main page (wrapped in Suspense for useSearchParams) ─────────────────────

function PimNotesInner() {
  const router         = useRouter()
  const searchParams   = useSearchParams()
  const folderId       = searchParams.get('folder') ?? 'root'
  const dateParam      = searchParams.get('date')

  const { silentRefresh } = useItems()

  // ── Folder data ──────────────────────────────────────────────────────────
  const [folders, setFolders] = useState<FsFolder[]>([])
  const [notes,   setNotes]   = useState<FsNote[]>([])
  const currentFolder = folders.find(f => f._id === folderId) ?? null

  // ── Note editing ─────────────────────────────────────────────────────────
  const [activeNote, setActiveNote]   = useState<FsNote | null>(null)
  const [noteContent, setNoteContent] = useState('')
  const [saving, setSaving]           = useState(false)
  const [dirty,  setDirty]            = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Journal calendar ─────────────────────────────────────────────────────
  const [calMonth, setCalMonth]       = useState(new Date())
  const [journalDate, setJournalDate] = useState<string>(
    dateParam ?? format(new Date(), 'yyyy-MM-dd')
  )
  const [loadingJournal, setLoadingJournal] = useState(false)
  const [writingJournal, setWritingJournal] = useState(false)

  // ── New folder dialog ────────────────────────────────────────────────────
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // ── Rename / delete folder ────────────────────────────────────────────────
  const [renamingId,   setRenamingId]   = useState<string | null>(null)
  const [renameValue,  setRenameValue]  = useState('')

  // ── New note dialog ──────────────────────────────────────────────────────
  const [newNoteName, setNewNoteName] = useState('')
  const [creatingNote, setCreatingNote] = useState(false)

  // ── New flow dialog ───────────────────────────────────────────────────────
  const [newFlowName, setNewFlowName] = useState('')
  const [creatingFlow, setCreatingFlow] = useState(false)

  const isJournal = folderId === 'journal'
  const isRoot    = folderId === 'root'

  // ── Load folders ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/fs-folders')
      .then(r => r.json())
      .then(setFolders)
      .catch(() => {})
  }, [])

  // ── Load notes when folder changes ───────────────────────────────────────
  useEffect(() => {
    setNotes([])
    setActiveNote(null)
    setNoteContent('')
    setDirty(false)
    fetch(`/api/fs-notes?parent=${folderId}`)
      .then(r => r.json())
      .then(setNotes)
      .catch(() => {})
  }, [folderId])

  // ── Load journal note when date changes ──────────────────────────────────
  useEffect(() => {
    if (!isJournal) return
    // Clear any pending auto-save from the previous date to prevent writing
    // stale content to the wrong date
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setNoteContent('')
    setDirty(false)
    setActiveNote(null)
    setWritingJournal(false)
    setLoadingJournal(true)

    fetch(`/api/fs-notes?parent=journal&date=${journalDate}`)
      .then(r => r.json())
      .then((data: FsNote[]) => {
        if (data.length > 0) {
          setActiveNote(data[0])
          setNoteContent(data[0].content ?? '')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingJournal(false))
  }, [isJournal, journalDate])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  const save = useCallback(async (json: string) => {
    setSaving(true)
    try {
      if (isJournal) {
        if (activeNote) {
          await fetch(`/api/fs-notes/${activeNote._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: json }),
          })
        } else {
          // Create new journal note for this date
          const res = await fetch('/api/fs-notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: journalDate,
              parent: 'journal',
              content: json,
              date: journalDate,
            }),
          })
          const created = await res.json()
          setActiveNote(created)
          setNotes(prev => [...prev, created])
        }
      } else if (activeNote) {
        await fetch(`/api/fs-notes/${activeNote._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: json }),
        })
        setNotes(prev => prev.map(n => n._id === activeNote._id ? { ...n, content: json } : n))
      }
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [isJournal, activeNote, journalDate])

  function handleContentChange(json: string) {
    setNoteContent(json)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(json), AUTOSAVE_MS)
  }

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── Create folder ─────────────────────────────────────────────────────────
  async function submitNewFolder() {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)
    const res = await fetch('/api/fs-folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim(), parent: isRoot ? 'root' : folderId }),
    })
    const folder = await res.json()
    setFolders(prev => [...prev, folder])
    setNewFolderName('')
    setCreatingFolder(false)
    router.replace(`/pim-notes?folder=${folderId}`)
  }

  // ── Rename folder ─────────────────────────────────────────────────────────
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

  // ── Delete folder (recursive) ─────────────────────────────────────────────
  async function deleteFolder(id: string) {
    await fetch(`/api/fs-folders/${id}`, { method: 'DELETE' })
    // Remove folder + all descendants from local state
    const allIds = new Set<string>()
    function collect(fid: string) {
      allIds.add(fid)
      folders.filter(f => f.parent === fid).forEach(f => collect(f._id))
    }
    collect(id)
    setFolders(prev => prev.filter(f => !allIds.has(f._id)))
    // If we're inside the deleted tree, go to root
    if (allIds.has(folderId)) router.push('/pim-notes?folder=root')
  }

  // ── Create note ───────────────────────────────────────────────────────────
  async function submitNewNote() {
    if (!newNoteName.trim()) return
    setCreatingNote(true)
    const res = await fetch('/api/fs-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newNoteName.trim(), parent: folderId, content: '' }),
    })
    const note = await res.json()
    setNotes(prev => [note, ...prev])
    setNewNoteName('')
    setCreatingNote(false)
    setActiveNote(note)
    setNoteContent('')
  }

  // ── Create flow ───────────────────────────────────────────────────────────
  async function submitNewFlow() {
    if (!newFlowName.trim()) return
    const res = await fetch('/api/fs-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFlowName.trim(), parent: folderId, content: '', type: 'flow' }),
    })
    const flow = await res.json()
    setNotes(prev => [flow, ...prev])
    setNewFlowName('')
    setCreatingFlow(false)
    setActiveNote(flow)
    setNoteContent('')
  }

  // ── Delete note ───────────────────────────────────────────────────────────
  async function deleteNote(id: string) {
    await fetch(`/api/fs-notes/${id}`, { method: 'DELETE' })
    setNotes(prev => prev.filter(n => n._id !== id))
    if (activeNote?._id === id) { setActiveNote(null); setNoteContent('') }
  }

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const journalDates = new Set(notes.filter(n => n.date).map(n => n.date!))

  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calMonth)),
    end:   endOfWeek(endOfMonth(calMonth)),
  })

  // ── Subfolders of current folder ─────────────────────────────────────────
  const subfolders = folders.filter(f => f.parent === folderId)

  // ── Breadcrumb path ───────────────────────────────────────────────────────
  function getFolderPath(id: string): FsFolder[] {
    const crumbs: FsFolder[] = []
    let current: string | null = id
    while (current) {
      const f = folders.find(x => x._id === current)
      if (!f) break
      crumbs.unshift(f)
      current = f.parent
    }
    return crumbs
  }
  const folderPath = getFolderPath(folderId)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
    <main className="flex-1 flex overflow-hidden gap-2 h-full p-3">

        {/* ── Left panel: folder browser ──────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
          style={{
            width: 260,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 rounded-t-2xl"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {isJournal
              ? <BookOpen size={13} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
              : <Folder size={13} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
            }
            <span className="text-xs font-semibold truncate flex-1" style={{ color: 'var(--text-1)' }}>
              {currentFolder?.name ?? 'Notes'}
            </span>

            {/* Action buttons — icon only */}
            {!isJournal && (
              <>
                <button
                  onClick={() => { setCreatingNote(true); setCreatingFlow(false); setCreatingFolder(false) }}
                  className="p-1.5 rounded-md transition-colors hover:opacity-80"
                  style={{ background: 'var(--accent)', color: 'white' }}
                  title="New note"
                >
                  <FilePlus size={13} />
                </button>
                <button
                  onClick={() => { setCreatingFlow(true); setCreatingNote(false); setCreatingFolder(false) }}
                  className="p-1.5 rounded-md transition-colors"
                  style={{ color: 'var(--text-2)', background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                  title="New diagram"
                >
                  <GitBranch size={13} />
                </button>
              </>
            )}
            {!isJournal && (
              <button
                onClick={() => { setCreatingFolder(true); setCreatingNote(false); setCreatingFlow(false) }}
                className="p-1.5 rounded-md transition-colors"
                style={{ color: 'var(--text-2)', background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                title="New folder"
              >
                <FolderPlus size={13} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">

            {/* ── Inline creation inputs (pinned at top of list) ─────────── */}
            {creatingNote && (
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <FilePlus size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={newNoteName}
                  onChange={e => setNewNoteName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitNewNote()
                    if (e.key === 'Escape') setCreatingNote(false)
                  }}
                  placeholder="Note name…"
                  className="flex-1 text-xs bg-transparent outline-none min-w-0"
                  style={{ color: 'var(--text-1)' }}
                />
                <button onClick={submitNewNote}><Check size={12} style={{ color: 'var(--accent)' }} /></button>
                <button onClick={() => setCreatingNote(false)}><X size={11} style={{ color: 'var(--text-3)' }} /></button>
              </div>
            )}
            {creatingFlow && (
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <GitBranch size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={newFlowName}
                  onChange={e => setNewFlowName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitNewFlow()
                    if (e.key === 'Escape') setCreatingFlow(false)
                  }}
                  placeholder="Diagram name…"
                  className="flex-1 text-xs bg-transparent outline-none min-w-0"
                  style={{ color: 'var(--text-1)' }}
                />
                <button onClick={submitNewFlow}><Check size={12} style={{ color: 'var(--accent)' }} /></button>
                <button onClick={() => setCreatingFlow(false)}><X size={11} style={{ color: 'var(--text-3)' }} /></button>
              </div>
            )}
            {creatingFolder && (
              <div className="flex items-center gap-1 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
                <FolderPlus size={12} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitNewFolder()
                    if (e.key === 'Escape') setCreatingFolder(false)
                  }}
                  placeholder="Folder name…"
                  className="flex-1 text-xs bg-transparent outline-none min-w-0"
                  style={{ color: 'var(--text-1)' }}
                />
                <button onClick={submitNewFolder}><Check size={12} style={{ color: 'var(--accent)' }} /></button>
                <button onClick={() => setCreatingFolder(false)}><X size={11} style={{ color: 'var(--text-3)' }} /></button>
              </div>
            )}

            {/* ── Journal: mini calendar ─────────────────────────────────── */}
            {isJournal && (
              <div className="px-3 pt-3 pb-2">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="btn-ghost p-1">
                    <ChevronLeft size={13} />
                  </button>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>
                    {format(calMonth, 'MMM yyyy')}
                  </span>
                  <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="btn-ghost p-1">
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center" style={{ fontSize: 10, color: 'var(--text-3)' }}>{d}</div>
                  ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-y-0.5">
                  {calDays.map(day => {
                    const ds   = format(day, 'yyyy-MM-dd')
                    const inMonth = isSameMonth(day, calMonth)
                    const today   = isToday(day)
                    const active  = ds === journalDate
                    const hasEntry = journalDates.has(ds)
                    return (
                      <button
                        key={ds}
                        onClick={() => setJournalDate(ds)}
                        className="relative flex flex-col items-center py-0.5 rounded-md transition-colors"
                        style={{
                          fontSize: 11,
                          color: !inMonth ? 'var(--text-3)' : active ? 'white' : 'var(--text-2)',
                          background: active ? 'var(--accent)' : today && !active ? 'var(--accent-muted)' : 'transparent',
                          fontWeight: today ? 600 : 400,
                        }}
                      >
                        {format(day, 'd')}
                        {hasEntry && !active && (
                          <span
                            className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                            style={{ background: 'var(--accent)' }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Subfolders ─────────────────────────────────────────────── */}
            {subfolders.length > 0 && (
              <div className="px-2 pt-2">
                {!isJournal && (
                  <p className="text-xs px-2 mb-1 font-medium tracking-wider" style={{ color: 'var(--text-3)' }}>FOLDERS</p>
                )}
                {subfolders.map(sf => (
                  <div key={sf._id} className="group relative">
                    {renamingId === sf._id ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <Folder size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter')  submitRename(sf._id)
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          onBlur={() => submitRename(sf._id)}
                          className="flex-1 text-xs bg-transparent outline-none min-w-0"
                          style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--border-hover)' }}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => router.push(`/pim-notes?folder=${sf._id}`)}
                        className="sidebar-item w-full pr-14"
                      >
                        <Folder size={13} className="flex-shrink-0" />
                        <span className="truncate text-xs">{sf.name}</span>
                      </button>
                    )}
                    {renamingId !== sf._id && (
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); setRenamingId(sf._id); setRenameValue(sf.name) }}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: 'var(--text-3)' }}
                          title="Rename folder"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteFolder(sf._id) }}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: 'var(--text-3)' }}
                          title="Delete folder"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Notes list (non-journal) ───────────────────────────────── */}
            {!isJournal && (
              <div className="px-2 pt-2">
                {notes.length > 0 && (
                  <p className="text-xs px-2 mb-1 font-medium tracking-wider" style={{ color: 'var(--text-3)' }}>NOTES</p>
                )}
                {notes.map(note => (
                  <div key={note._id} className="group relative">
                    <button
                      onClick={() => { setActiveNote(note); setNoteContent(note.content ?? '') }}
                      className={cn('sidebar-item w-full pr-6', activeNote?._id === note._id && 'active')}
                    >
                      {note.type === 'flow'
                        ? <GitBranch size={12} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                        : <FileText  size={12} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
                      }
                      <span className="truncate text-xs">{note.name}</span>
                    </button>
                    <button
                      onClick={() => deleteNote(note._id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                      style={{ color: 'var(--text-3)' }}
                      title="Delete note"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Editor panel ─────────────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Editor header — breadcrumbs */}
          <div
            className="flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 min-w-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            {/* Breadcrumb trail */}
            <nav className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              {folderPath.map((f, i) => {
                const isLast = i === folderPath.length - 1
                const isLeaf = isLast && !activeNote && !isJournal
                return (
                  <span key={f._id} className="flex items-center gap-1 min-w-0">
                    {i > 0 && (
                      <ChevronRight size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                    )}
                    <button
                      onClick={() => router.push(`/pim-notes?folder=${f._id}`)}
                      className="text-xs truncate hover:underline transition-colors"
                      style={{
                        color: isLeaf ? 'var(--text-1)' : 'var(--text-3)',
                        fontWeight: isLeaf ? 600 : 400,
                        maxWidth: isLeaf ? 200 : 100,
                      }}
                    >
                      {f._id === 'root' ? 'pim-notes' : f.name}
                    </button>
                  </span>
                )
              })}

              {/* Leaf: active note name or journal date */}
              {isJournal && (
                <>
                  <ChevronRight size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    {isToday(parseISO(journalDate))
                      ? `Today, ${format(parseISO(journalDate), 'MMM d')}`
                      : format(parseISO(journalDate), 'EEE, MMM d, yyyy')}
                  </span>
                </>
              )}
              {!isJournal && activeNote && (
                <>
                  <ChevronRight size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                    {activeNote.name}
                  </span>
                </>
              )}
            </nav>

            {/* Save indicator */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {saving && <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saving…</span>}
              {!saving && !dirty && activeNote && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saved</span>
              )}
            </div>
          </div>

          {/* Editor body */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ padding: '16px' }}>

            {/* ── Journal ── */}
            {isJournal && (
              loadingJournal ? (
                /* Loading */
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-3)' }} />
                </div>
              ) : !activeNote && !writingJournal ? (
                /* No entry for this date */
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <BookOpen size={36} style={{ color: 'var(--text-3)', opacity: 0.35 }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    No entry for {isToday(parseISO(journalDate))
                      ? 'today'
                      : format(parseISO(journalDate), 'MMM d, yyyy')}
                  </p>
                  <button
                    onClick={() => setWritingJournal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--accent)', color: 'white' }}
                  >
                    <PenLine size={14} />
                    Start writing
                  </button>
                </div>
              ) : (
                /* Editor */
                <div className="flex-1 flex flex-col overflow-hidden rounded-2xl" style={{
                  background: 'var(--surface)',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
                }}>
                  <div className="flex-1 overflow-y-auto px-10 py-10">
                    <JournalEditor
                      key={journalDate}
                      content={noteContent}
                      onChange={handleContentChange}
                      date={journalDate}
                    />
                  </div>
                </div>
              )
            )}

            {/* ── Regular note / flow ── */}
            {!isJournal && !isRoot && activeNote && (
              <div className="flex-1 flex flex-col overflow-hidden rounded-2xl" style={{
                background: 'var(--surface)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
              }}>
                {activeNote.type === 'flow' ? (
                  <MermaidEditor
                    key={activeNote._id}
                    content={noteContent}
                    onChange={handleContentChange}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto px-10 py-10">
                    <JournalEditor
                      key={activeNote._id}
                      content={noteContent}
                      onChange={handleContentChange}
                      date={activeNote._id}
                    />
                  </div>
                )}
              </div>
            )}

            {/* ── Empty states ── */}
            {!isJournal && (isRoot || !activeNote) && (
              <div className="flex flex-col items-center justify-center h-full gap-3"
                style={{ color: 'var(--text-3)', fontSize: 14 }}>
                {isRoot
                  ? <><Folder size={32} style={{ opacity: 0.3 }} /><p>Navigate to a folder to begin</p></>
                  : <><FilePlus size={32} style={{ opacity: 0.3 }} /><p>Create or select a note to start writing</p></>
                }
              </div>
            )}
          </div>
        </div>
      </main>
    <FloatingChat onRefreshItems={silentRefresh} />
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
