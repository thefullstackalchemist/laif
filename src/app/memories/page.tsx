'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '@/components/layout/Sidebar'
import AddMemoryBar from '@/components/memories/AddMemoryBar'
import MemoryRow, { isDone, getNextStatus } from '@/components/memories/MemoryRow'
import { TYPE_CONFIG } from '@/components/memories/typeConfig'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { Memory, MemoryType } from '@/types'
import type { CalView } from '@/components/calendar/CalendarView'
import { Brain, List, Layers, ChevronDown, ChevronRight } from 'lucide-react'
import TopBarActions from '@/components/layout/TopBarActions'

type ViewMode = 'queue' | 'type'

export default function MemoriesPage() {
  const { refetch: refetchItems } = useItems()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [calView, setCalView]     = useState<CalView>('month')
  const [memories, setMemories]   = useState<Memory[]>([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [view, setView]           = useState<ViewMode>('queue')
  const [doneOpen, setDoneOpen]   = useState(false)
  const [focusedId, setFocusedId] = useState<string | null>(null)

  const loadMemories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/memories')
      if (res.ok) setMemories(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadMemories() }, [loadMemories])

  // ── Handlers ──────────────────────────────────────────────────
  async function handleAdd(text: string) {
    setAdding(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) { const m = await res.json(); setMemories(prev => [m, ...prev]) }
    } finally { setAdding(false) }
  }

  function handleDelete(id: string) {
    setMemories(prev => {
      const ids    = prev.map(m => m._id!)
      const idx    = ids.indexOf(id)
      const nextId = prev[idx + 1]?._id ?? prev[idx - 1]?._id ?? null
      setFocusedId(nextId)
      return prev.filter(m => m._id !== id)
    })
    fetch(`/api/memories/${id}`, { method: 'DELETE' })
  }

  function handleUpdate(id: string, patch: Partial<Memory>) {
    setMemories(prev => prev.map(m => m._id === id ? { ...m, ...patch } : m))
    fetch(`/api/memories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  // ── Keyboard shortcuts ────────────────────────────────────────
  const getVisibleIds = useCallback((): string[] => {
    if (view === 'queue') {
      const activeIds = memories.filter(m => !isDone(m)).map(m => m._id!)
      const doneIds   = doneOpen ? memories.filter(m => isDone(m)).map(m => m._id!) : []
      return [...activeIds, ...doneIds]
    }
    return memories.map(m => m._id!)
  }, [memories, view, doneOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const ids = getVisibleIds()
      if (!ids.length) return

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedId(prev => {
          const idx  = prev ? ids.indexOf(prev) : -1
          const next = e.key === 'ArrowDown'
            ? Math.min(idx + 1, ids.length - 1)
            : Math.max(idx - 1, 0)
          return ids[next]
        })
        return
      }

      if (!focusedId) return
      const m = memories.find(x => x._id === focusedId)
      if (!m) return

      if (e.key === 'd' || e.key === 'D') {
        const next = getNextStatus(m)
        if (next !== undefined) handleUpdate(focusedId, { status: next })
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        handleDelete(focusedId)
      }

      if (e.key === 'Escape') setFocusedId(null)
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedId, memories, getVisibleIds])

  // ── Derived lists ─────────────────────────────────────────────
  const active = memories.filter(m => !isDone(m))
  const done   = memories.filter(m =>  isDone(m))
  const byType = memories.reduce<Partial<Record<MemoryType, Memory[]>>>((acc, m) => {
    acc[m.type] = [...(acc[m.type] ?? []), m]
    return acc
  }, {})

  // Thin wrapper so focused props don't repeat everywhere
  function Row({ memory }: { memory: Memory }) {
    return (
      <MemoryRow
        memory={memory}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        isFocused={focusedId === memory._id}
        onFocus={() => setFocusedId(memory._id ?? null)}
      />
    )
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView={calView}
        onViewChange={setCalView}
        counts={{ events: 0, tasks: 0, reminders: 0 }}
        onAddItem={() => {}}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 px-6 py-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <Brain size={14} style={{ color: 'var(--accent-light)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Memories</span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>— {memories.length} captured</span>
          {(loading || adding) && (
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin ml-1"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          )}

          {/* View toggle + actions */}
          <div className="ml-auto flex items-center gap-2">
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            {([
              { id: 'queue', icon: List,   label: 'Queue'   },
              { id: 'type',  icon: Layers, label: 'By Type' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={view === id
                  ? { background: 'var(--card)', color: 'var(--text-1)', boxShadow: 'var(--card-shadow)' }
                  : { color: 'var(--text-3)' }
                }
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
          <TopBarActions />
          </div>
        </div>

        {/* Capture bar */}
        <div className="flex-shrink-0 px-6 pt-4 pb-2">
          <AddMemoryBar onAdd={handleAdd} />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 pb-2" onClick={() => setFocusedId(null)}>
          {!loading && memories.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-48 gap-3"
            >
              <Brain size={28} style={{ color: 'var(--text-3)' }} />
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Nothing captured yet</p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
                Type anything above — a movie, book, place, contact, or just a thought
              </p>
            </motion.div>
          )}

          {/* ── QUEUE VIEW ── */}
          {view === 'queue' && memories.length > 0 && (
            <div className="mt-2" onClick={e => e.stopPropagation()}>
              {active.length > 0 && (
                <section className="mb-4">
                  <p className="text-xs font-semibold tracking-widest uppercase px-3 mb-1"
                    style={{ color: 'var(--text-3)' }}>
                    Active · {active.length}
                  </p>
                  <AnimatePresence>
                    {active.map(m => (
                      <motion.div key={m._id}
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                      >
                        <Row memory={m} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </section>
              )}

              {done.length > 0 && (
                <section>
                  <button
                    onClick={() => setDoneOpen(o => !o)}
                    className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 mb-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {doneOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    Done · {done.length}
                  </button>
                  <AnimatePresence>
                    {doneOpen && done.map(m => (
                      <motion.div key={m._id}
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}
                      >
                        <Row memory={m} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </section>
              )}
            </div>
          )}

          {/* ── BY TYPE VIEW ── */}
          {view === 'type' && memories.length > 0 && (
            <div className="mt-2 space-y-6" onClick={e => e.stopPropagation()}>
              {(Object.keys(byType) as MemoryType[]).map(type => {
                const cfg   = TYPE_CONFIG[type]
                const items = byType[type] ?? []
                return (
                  <section key={type}>
                    <div className="flex items-center gap-2 px-3 mb-1">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center"
                        style={{ background: `${cfg.color}18`, color: cfg.color }}>
                        <cfg.icon size={11} />
                      </div>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
                        {cfg.label}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: `${cfg.color}12`, color: cfg.color }}>
                        {items.length}
                      </span>
                    </div>
                    {items.map(m => <Row key={m._id} memory={m} />)}
                  </section>
                )
              })}
            </div>
          )}
        </div>

        {/* Keyboard hint strip */}
        <div
          className="flex-shrink-0 flex items-center justify-center gap-4 py-2 px-6"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {([
            { keys: '↑ ↓', label: 'navigate' },
            { keys: 'D',   label: 'cycle status' },
            { keys: '⌫',   label: 'delete' },
            { keys: 'Esc', label: 'clear' },
          ]).map(({ keys, label }) => (
            <span key={keys} className="flex items-center gap-1.5">
              <kbd
                className="text-xs px-1.5 py-0.5 rounded-md font-mono"
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  fontSize: 10,
                }}
              >
                {keys}
              </kbd>
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{label}</span>
            </span>
          ))}
        </div>
      </main>

      <FloatingChat onRefreshItems={refetchItems} />
    </div>
  )
}
