'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import AddItemModal from '@/components/modals/AddItemModal'
import FloatingChat from '@/components/chat/FloatingChat'
import ClockWidget from '@/components/dashboard/ClockWidget'
import MiniCalendarWidget from '@/components/dashboard/MiniCalendarWidget'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import RSSFeedWidget from '@/components/dashboard/RSSFeedWidget'
import PomodoroWidget from '@/components/dashboard/PomodoroWidget'
import TodayTasksWidget from '@/components/dashboard/TodayTasksWidget'
import AIBriefWidget from '@/components/dashboard/AIBriefWidget'
import { useItems } from '@/hooks/useItems'
import { isToday as dfIsToday, isPast as dfIsPast } from 'date-fns'
import type { AnyItem, Task, CalendarEvent } from '@/types'

function BentoCard({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl p-4 overflow-hidden ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)', ...style }}
    >
      {children}
    </div>
  )
}

/** Point 9 — ambient subtitle based on schedule + time */
function useAmbientGreeting(items: AnyItem[]): string {
  return useMemo(() => {
    const h = new Date().getHours()
    const todayEvents  = items.filter(i => i.type === 'event' && dfIsToday(new Date((i as CalendarEvent).startDate)))
    const pendingTasks = items.filter(i => i.type === 'task' && (i as Task).status !== 'done' && dfIsToday(new Date((i as Task).dueDate ?? '')))
    const overdue      = items.filter(i => i.type === 'task' && (i as Task).status !== 'done' && (i as Task).dueDate && dfIsPast(new Date((i as Task).dueDate!)) && !dfIsToday(new Date((i as Task).dueDate!)))
    const total        = todayEvents.length + pendingTasks.length

    if (h >= 22 || h < 5)  return 'burning the midnight oil'
    if (h >= 18) {
      if (overdue.length)  return `${overdue.length} thing${overdue.length > 1 ? 's' : ''} still need attention`
      if (total === 0)     return 'all clear — nice work today'
      return 'winding down'
    }
    if (overdue.length)    return `${overdue.length} overdue task${overdue.length > 1 ? 's' : ''} need your attention`
    if (total === 0)       return 'looks like a clear day'
    if (total >= 5)        return `busy one — ${total} things lined up`
    if (total >= 3)        return `a few things on the plate today`
    return 'your day, at a glance'
  }, [items])
}

export default function DashboardPage() {
  const router = useRouter()
  const { items, loading, silentRefresh, addItem, updateItem, deleteItem } = useItems()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const subtitle = useAmbientGreeting(items)

  const counts = {
    events:    items.filter(i => i.type === 'event').length,
    tasks:     items.filter(i => i.type === 'task').length,
    reminders: items.filter(i => i.type === 'reminder').length,
  }

  async function handleAddItem(type: AnyItem['type'], data: Record<string, unknown>) {
    await addItem(type, data as Parameters<typeof addItem>[1])
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
        currentView="agenda"
        onViewChange={() => router.push('/calendar')}
        counts={counts}
        onAddItem={() => setModalOpen(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-6 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <LayoutDashboard size={14} style={{ color: 'var(--accent-light)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>laif</span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>— {subtitle}</span>
          {loading && (
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin ml-1"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {/* Bento grid — 4 columns, 2 rows */}
        <div className="flex-1 overflow-auto p-4">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.8fr 1fr 0.95fr 1.05fr',
              gridTemplateRows: '1fr 1.15fr',
              gap: 12,
              height: '100%',
              minHeight: 480,
              maxHeight: 820,
            }}
          >
            {/* Clock + countdown — col 1, row 1 */}
            <BentoCard style={{ gridColumn: '1', gridRow: '1' }}>
              <ClockWidget items={items} />
            </BentoCard>

            {/* AI Brief — col 2, row 1 */}
            <BentoCard style={{ gridColumn: '2', gridRow: '1' }}>
              <AIBriefWidget items={items} />
            </BentoCard>

            {/* Mini Calendar — col 3, row 1 */}
            <BentoCard style={{ gridColumn: '3', gridRow: '1' }}>
              <MiniCalendarWidget items={items} />
            </BentoCard>

            {/* RSS Feed — col 4, spans both rows */}
            <BentoCard style={{ gridColumn: '4', gridRow: '1 / 3', display: 'flex', flexDirection: 'column' }}>
              <RSSFeedWidget />
            </BentoCard>

            {/* Pomodoro — col 1, row 2 */}
            <BentoCard style={{ gridColumn: '1', gridRow: '2' }}>
              <PomodoroWidget />
            </BentoCard>

            {/* Today's tasks — col 2, row 2 */}
            <BentoCard style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column' }}>
              <TodayTasksWidget items={items} onUpdateItem={updateItem} />
            </BentoCard>

            {/* Weather — col 3, row 2 */}
            <BentoCard style={{ gridColumn: '3', gridRow: '2' }}>
              <WeatherWidget />
            </BentoCard>
          </div>
        </div>
      </main>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddItem}
      />

      <FloatingChat onRefreshItems={silentRefresh} />
    </div>
  )
}
