'use client'
import { useState } from 'react'
import Sidebar from '@/components/layout/Sidebar'
import CalendarView, { type CalView } from '@/components/calendar/CalendarView'
import AddItemModal from '@/components/modals/AddItemModal'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { AnyItem } from '@/types'

export default function HomePage() {
  const { items, loading, refetch, silentRefresh, addItem, updateItem } = useItems()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [view, setView] = useState<CalView>('month')
  const [modalOpen, setModalOpen] = useState(false)
  const [dragStart, setDragStart] = useState<string | undefined>()
  const [dragEnd, setDragEnd]   = useState<string | undefined>()

  const counts = {
    events:    items.filter(i => i.type === 'event').length,
    tasks:     items.filter(i => i.type === 'task').length,
    reminders: items.filter(i => i.type === 'reminder').length,
  }

  async function handleAddItem(type: AnyItem['type'], data: Record<string, unknown>) {
    await addItem(type, data as Parameters<typeof addItem>[1])
  }

  function handleNewItem(start: Date, end: Date) {
    const fmt = (d: Date) => {
      d.setSeconds(0, 0)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    setDragStart(fmt(start))
    setDragEnd(fmt(end))
    setModalOpen(true)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView={view}
        onViewChange={setView}
        counts={counts}
        onAddItem={() => { setDragStart(undefined); setDragEnd(undefined); setModalOpen(true) }}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div
          className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top right, var(--accent-dim) 0%, transparent 70%)' }}
        />
        <CalendarView
          view={view}
          items={items}
          loading={loading}
          onItemClick={() => {}}
          onNewItem={handleNewItem}
          onViewChange={setView}
          onUpdateItem={updateItem}
        />
      </main>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddItem}
        defaultStart={dragStart}
        defaultEnd={dragEnd}
      />

      <FloatingChat onRefreshItems={silentRefresh} />
    </div>
  )
}
