'use client'
import { useState } from 'react'
import { Calendar, CheckSquare, Bell, CheckCircle2, Circle, List } from 'lucide-react'
import { isToday, isTomorrow, isPast, format, isThisYear } from 'date-fns'
import type { AnyItem, CalendarEvent, Task, Reminder } from '@/types'
import { ITEM_COLORS } from '@/lib/utils'

interface Props {
  items: AnyItem[]
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
}

type Filter = 'all' | 'event' | 'task' | 'reminder'

function getDate(item: AnyItem): Date | null {
  if (item.type === 'event')    return new Date((item as CalendarEvent).startDate)
  if (item.type === 'task')     return (item as Task).dueDate ? new Date((item as Task).dueDate!) : null
  if (item.type === 'reminder') return new Date((item as Reminder).reminderDate)
  return null
}

function formatDate(d: Date): string {
  if (isToday(d))    return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  if (isThisYear(d)) return format(d, 'MMM d')
  return format(d, 'MMM d, yy')
}

function isDone(item: AnyItem): boolean {
  return item.type === 'task' && (item as Task).status === 'done'
}

function sortItems(items: AnyItem[]): AnyItem[] {
  return [...items].sort((a, b) => {
    const doneA = isDone(a), doneB = isDone(b)
    if (doneA && !doneB) return 1
    if (!doneA && doneB) return -1
    const da = getDate(a), db = getDate(b)
    if (!da && !db) return 0
    if (!da) return 1
    if (!db) return -1
    return da.getTime() - db.getTime()
  })
}

const FILTERS: { id: Filter; label: string; icon: typeof List }[] = [
  { id: 'all',      label: 'All',       icon: List        },
  { id: 'event',    label: 'Events',    icon: Calendar    },
  { id: 'task',     label: 'Tasks',     icon: CheckSquare },
  { id: 'reminder', label: 'Reminders', icon: Bell        },
]

export default function AllItemsWidget({ items, onUpdateItem }: Props) {
  const [filter, setFilter] = useState<Filter>('all')

  const visible = items.filter(item => {
    if (item.type === 'event')    return !isPast(new Date((item as CalendarEvent).endDate ?? (item as CalendarEvent).startDate))
    if (item.type === 'reminder') return !isPast(new Date((item as Reminder).reminderDate))
    return true // tasks always shown
  })

  const filtered = sortItems(
    filter === 'all' ? visible : visible.filter(i => i.type === filter)
  )

  const counts: Record<Filter, number> = {
    all:      visible.length,
    event:    visible.filter(i => i.type === 'event').length,
    task:     visible.filter(i => i.type === 'task').length,
    reminder: visible.filter(i => i.type === 'reminder').length,
  }

  function toggleTask(task: Task) {
    if (!onUpdateItem || !task._id) return
    onUpdateItem('task', task._id, { status: task.status === 'done' ? 'todo' : 'done' } as Partial<AnyItem>)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
        <List size={12} style={{ color: 'var(--accent-light)' }} />
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          All Items
        </p>
        <span className="ml-auto text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>
          {filtered.length}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 flex-shrink-0 flex-wrap">
        {FILTERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all"
            style={filter === id
              ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
              : { color: 'var(--text-3)' }
            }
          >
            <Icon size={10} />
            <span>{label}</span>
            {counts[id] > 0 && (
              <span className="tabular-nums opacity-60">{counts[id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <List size={22} style={{ color: 'var(--text-3)' }} />
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Nothing here yet</p>
          </div>
        ) : (
          filtered.map(item => {
            const date  = getDate(item)
            const done  = isDone(item)
            const color = ITEM_COLORS[item.type]
            const overdue = date && isPast(date) && !isToday(date) && !done

            return (
              <div
                key={item._id}
                onClick={() => item.type === 'task' ? toggleTask(item as Task) : undefined}
                className={`flex items-start gap-2.5 px-2.5 py-2 rounded-xl transition-colors ${item.type === 'task' ? 'cursor-pointer' : ''}`}
                style={{
                  background: done ? 'transparent' : 'var(--input-bg)',
                  border: `1px solid ${done ? 'transparent' : 'var(--border)'}`,
                  opacity: done ? 0.45 : 1,
                }}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {item.type === 'task'
                    ? done
                      ? <CheckCircle2 size={13} style={{ color }} />
                      : <Circle       size={13} style={{ color: 'var(--text-3)' }} />
                    : item.type === 'event'
                      ? <Calendar size={13} style={{ color }} />
                      : <Bell     size={13} style={{ color }} />
                  }
                </div>

                {/* Title + date */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-medium truncate"
                    style={{
                      color: done ? 'var(--text-3)' : 'var(--text-1)',
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </p>
                  {date && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: overdue ? '#ef4444' : 'var(--text-3)' }}
                    >
                      {overdue ? '⚠ ' : ''}{formatDate(date)}
                      {item.type === 'event' && (
                        <span className="ml-1 opacity-70">{format(date, 'h:mm a')}</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Priority badge for high-priority tasks */}
                {item.type === 'task' && (item as Task).priority === 'high' && !done && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    !
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
