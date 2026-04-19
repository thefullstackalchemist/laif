'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import CalendarView, { type CalView } from '@/components/calendar/CalendarView'
import AddItemModal from '@/components/modals/AddItemModal'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { AnyItem } from '@/types'

const VALID_VIEWS: CalView[] = ['agenda', 'month', 'week', 'day']

// useSearchParams must live inside a Suspense boundary
function CalendarContent() {
  const { items, loading, silentRefresh, addItem, updateItem, deleteItem } = useItems()
  const searchParams = useSearchParams()
  const paramView    = searchParams.get('view') as CalView | null

  const [view, setView]         = useState<CalView>(
    paramView && VALID_VIEWS.includes(paramView) ? paramView : 'month'
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [dragStart, setDragStart] = useState<string | undefined>()
  const [dragEnd,   setDragEnd]   = useState<string | undefined>()

  // Sync view when URL param changes (same-route navigation from dock)
  useEffect(() => {
    if (paramView && VALID_VIEWS.includes(paramView)) setView(paramView)
  }, [paramView])

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
    <>
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <CalendarView
          view={view}
          items={items}
          loading={loading}
          onItemClick={() => {}}
          onNewItem={handleNewItem}
          onViewChange={setView}
          onUpdateItem={updateItem}
          onDeleteItem={deleteItem}
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
    </>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarContent />
    </Suspense>
  )
}
