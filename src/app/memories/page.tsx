'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from '@/components/layout/Sidebar'
import MemoryCard from '@/components/memories/MemoryCard'
import AddMemoryBar from '@/components/memories/AddMemoryBar'
import { TYPE_CONFIG } from '@/components/memories/typeConfig'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { Memory, MemoryType } from '@/types'
import type { CalView } from '@/components/calendar/CalendarView'
import { Brain } from 'lucide-react'

export default function MemoriesPage() {
  const { refetch: refetchItems } = useItems()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [calView, setCalView] = useState<CalView>('month')
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const loadMemories = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/memories')
      if (res.ok) setMemories(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMemories() }, [loadMemories])

  async function handleAdd(text: string) {
    setAdding(true)
    try {
      const res = await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const newMemory = await res.json()
        setMemories(prev => [newMemory, ...prev])
      }
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    setMemories(prev => prev.filter(m => m._id !== id))
    await fetch(`/api/memories/${id}`, { method: 'DELETE' })
  }

  async function handleUpdate(id: string, patch: Partial<Memory>) {
    setMemories(prev => prev.map(m => m._id === id ? { ...m, ...patch } : m))
    await fetch(`/api/memories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  // Group by type
  const byType = memories.reduce<Record<MemoryType, Memory[]>>((acc, m) => {
    if (!acc[m.type]) acc[m.type] = []
    acc[m.type].push(m)
    return acc
  }, {} as Record<MemoryType, Memory[]>)

  const activeTypes = Object.keys(byType) as MemoryType[]

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
          className="flex-shrink-0 px-6 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <Brain size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'var(--text-1)' }}>Memories</h1>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {memories.length} {memories.length === 1 ? 'memory' : 'memories'} stored
            </p>
          </div>
          {loading && (
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ml-2"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {/* Add bar */}
        <div className="flex-shrink-0 px-6 py-4">
          <AddMemoryBar onAdd={handleAdd} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {!loading && memories.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-48 gap-3"
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                <Brain size={28} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Nothing remembered yet</p>
              <p className="text-xs text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
                Try typing "remember The Alchemist" or "remember John with number 555-0123"
              </p>
            </motion.div>
          )}

          {activeTypes.map(type => {
            const cfg = TYPE_CONFIG[type]
            const items = byType[type]
            return (
              <section key={type} className="mb-8">
                {/* Section header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: `${cfg.color}20`, color: cfg.color }}
                  >
                    <cfg.icon size={13} />
                  </div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>{cfg.label}</h2>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}
                  >
                    {items.length}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  <AnimatePresence>
                    {items.map(memory => (
                      <MemoryCard
                        key={memory._id}
                        memory={memory}
                        onDelete={handleDelete}
                        onUpdate={handleUpdate}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )
          })}
        </div>
      </main>

      <FloatingChat onRefreshItems={refetchItems} />
    </div>
  )
}
