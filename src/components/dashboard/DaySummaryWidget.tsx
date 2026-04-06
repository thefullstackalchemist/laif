'use client'
import { useMemo } from 'react'
import { isToday, isPast, format } from 'date-fns'
import { Calendar, CheckSquare, Bell, AlertCircle, Sparkles } from 'lucide-react'
import type { AnyItem, Task, CalendarEvent, Reminder } from '@/types'
import { formatTime } from '@/lib/utils'

interface Props { items: AnyItem[] }

export default function DaySummaryWidget({ items }: Props) {
  const { greeting, todayEvents, todayTasks, overdue, nextEvent } = useMemo(() => {
    const h = new Date().getHours()
    const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

    const todayEvents = items.filter(i => i.type === 'event' && isToday(new Date((i as CalendarEvent).startDate))) as CalendarEvent[]
    const todayTasks  = items.filter(i => i.type === 'task' && isToday(new Date((i as Task).dueDate ?? ''))) as Task[]
    const overdue     = items.filter(i => i.type === 'task' && !(['done'].includes((i as Task).status)) && (i as Task).dueDate && isPast(new Date((i as Task).dueDate!)) && !isToday(new Date((i as Task).dueDate!))) as Task[]

    const upcoming = todayEvents
      .filter(e => !isPast(new Date(e.startDate)))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const nextEvent = upcoming[0] ?? null

    return { greeting, todayEvents, todayTasks, overdue, nextEvent }
  }, [items])

  const pendingTasks = todayTasks.filter(t => t.status !== 'done')

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2">
        <Sparkles size={13} style={{ color: 'var(--accent-light)' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          Today
        </p>
      </div>

      <p className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>{greeting}!</p>

      {nextEvent ? (
        <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)30' }}>
          <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--accent-light)' }}>Next up</p>
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{nextEvent.title}</p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>{formatTime(nextEvent.startDate)} — {formatTime(nextEvent.endDate)}</p>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No upcoming events today.</p>
      )}

      <div className="space-y-1.5 flex-1">
        <StatRow icon={<Calendar size={12} />} label="Events today" count={todayEvents.length} color="var(--color-event)" />
        <StatRow icon={<CheckSquare size={12} />} label="Tasks due" count={pendingTasks.length} color="var(--color-task)" />
        {overdue.length > 0 && (
          <StatRow icon={<AlertCircle size={12} />} label="Overdue" count={overdue.length} color="#ef4444" />
        )}
        <StatRow icon={<Bell size={12} />} label="Reminders" count={items.filter(i => i.type === 'reminder' && isToday(new Date((i as Reminder).reminderDate))).length} color="var(--color-reminder)" />
      </div>
    </div>
  )
}

function StatRow({ icon, label, count, color }: { icon: React.ReactNode; label: string; count: number; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2" style={{ color: 'var(--text-2)' }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color: count > 0 ? 'var(--text-1)' : 'var(--text-3)' }}>{count}</span>
    </div>
  )
}
