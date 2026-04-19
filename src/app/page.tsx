'use client'
import { useState, useMemo } from 'react'
import { CalendarPlus, CheckSquare, Bell } from 'lucide-react'
import Image from 'next/image'
import AddItemModal from '@/components/modals/AddItemModal'
import FloatingChat from '@/components/chat/FloatingChat'
import ClockWidget from '@/components/dashboard/ClockWidget'
import MiniCalendarWidget from '@/components/dashboard/MiniCalendarWidget'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import AllItemsWidget from '@/components/dashboard/AllItemsWidget'
import PomodoroWidget from '@/components/dashboard/PomodoroWidget'
import DailyJournalWidget from '@/components/dashboard/DailyJournalWidget'
import AIBriefWidget from '@/components/dashboard/AIBriefWidget'
import PWAInstallButton from '@/components/PWAInstallButton'
import TopBarActions from '@/components/layout/TopBarActions'
import { useItems } from '@/hooks/useItems'
import { isToday as dfIsToday, isPast as dfIsPast } from 'date-fns'
import type { AnyItem, Task, CalendarEvent } from '@/types'

function BentoCard({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties
}) {
  return (
    <div
      className={`rounded-2xl p-4 overflow-hidden ${className}`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow, none)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

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
    if (total >= 3)        return 'a few things on the plate today'
    return 'your day, at a glance'
  }, [items])
}

export default function DashboardPage() {
  const { items, loading, silentRefresh, addItem, updateItem } = useItems()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'event' | 'task' | 'reminder'>('task')
  const subtitle = useAmbientGreeting(items)

  function openAddModal(type: 'event' | 'task' | 'reminder') {
    setModalType(type)
    setModalOpen(true)
  }

  async function handleAddItem(type: AnyItem['type'], data: Record<string, unknown>) {
    await addItem(type, data as Parameters<typeof addItem>[1])
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <Image src="/logo_new.png" alt="PIM" width={26} height={26} unoptimized className="object-contain flex-shrink-0" />
        <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>PIM</span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>— {subtitle}</span>
        {loading && (
          <div
            className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin ml-1"
            style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
          />
        )}

        {/* Quick-add buttons */}
        <div className="flex items-center gap-1 ml-4">
          {([
            { type: 'task'     as const, icon: CheckSquare,  label: 'Task'     },
            { type: 'event'    as const, icon: CalendarPlus, label: 'Event'    },
            { type: 'reminder' as const, icon: Bell,         label: 'Reminder' },
          ]).map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => openAddModal(type)}
              className="btn-ghost flex items-center gap-1 px-2 py-1"
              style={{ fontSize: 11 }}
              title={`Add ${label}`}
            >
              <Icon size={11} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <PWAInstallButton />
          <TopBarActions />
        </div>
      </div>

      {/* ── Bento grid ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-4" style={{ minHeight: 0 }}>
          {/* 4 columns × 2 rows */}
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
            <BentoCard style={{ gridColumn: '1', gridRow: '1' }}>
              <ClockWidget items={items} />
            </BentoCard>

            <BentoCard style={{ gridColumn: '2', gridRow: '1' }}>
              <AIBriefWidget items={items} />
            </BentoCard>

            <BentoCard style={{ gridColumn: '3', gridRow: '1' }}>
              <MiniCalendarWidget items={items} />
            </BentoCard>

            <BentoCard style={{ gridColumn: '4', gridRow: '1 / 3', display: 'flex', flexDirection: 'column' }}>
              <DailyJournalWidget />
            </BentoCard>

            <BentoCard style={{ gridColumn: '1', gridRow: '2' }}>
              <PomodoroWidget items={items} />
            </BentoCard>

            <BentoCard style={{ gridColumn: '2', gridRow: '2', display: 'flex', flexDirection: 'column' }}>
              <AllItemsWidget items={items} onUpdateItem={updateItem} />
            </BentoCard>

            <BentoCard style={{ gridColumn: '3', gridRow: '2' }}>
              <WeatherWidget />
            </BentoCard>
          </div>
      </div>

      <AddItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleAddItem}
        defaultType={modalType}
      />

      <FloatingChat onRefreshItems={silentRefresh} />
    </div>
  )
}
