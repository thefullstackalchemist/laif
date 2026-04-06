'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isFuture, isPast } from 'date-fns'
import { MapPin, AlertCircle, CheckCircle2, Circle, MessageSquare } from 'lucide-react'
import { ITEM_COLORS, ITEM_BG, formatTime } from '@/lib/utils'
import ItemDetailPanel from './ItemDetailPanel'
import type { AnyItem, CalendarEvent, Task, Reminder } from '@/types'

type TaskFilter = 'all' | 'active' | 'done'

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEEE, MMMM d')
}

function getDateSub(dateStr: string): string {
  const d = new Date(dateStr)
  if (isToday(d) || isTomorrow(d)) return format(d, 'EEE, MMM d')
  return format(d, 'yyyy')
}

/** Returns LOCAL yyyy-MM-dd key — safe for all timezones */
function toLocalDateKey(isoStr: string): string {
  const d = new Date(isoStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString())
}

function groupByDate(items: AnyItem[]): Map<string, AnyItem[]> {
  const map = new Map<string, AnyItem[]>()
  const sorted = [...items].sort((a, b) => {
    const da = a.type === 'event' ? a.startDate : a.type === 'task' ? (a.dueDate ?? '') : a.reminderDate
    const db = b.type === 'event' ? b.startDate : b.type === 'task' ? (b.dueDate ?? '') : b.reminderDate
    return new Date(da).getTime() - new Date(db).getTime()
  })
  const today = todayKey()
  for (const item of sorted) {
    const dateStr = item.type === 'event' ? item.startDate : item.type === 'task' ? (item.dueDate ?? '') : item.reminderDate
    if (!dateStr) continue
    const d = new Date(dateStr)
    const isOverdueTask = item.type === 'task' && (item as Task).status !== 'done' && isPast(d) && !isToday(d)
    const key = isOverdueTask ? today : toLocalDateKey(dateStr)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

const TYPE_LABEL: Record<AnyItem['type'], string> = {
  event: 'Event', task: 'Task', reminder: 'Reminder',
}

interface AgendaViewProps {
  items: AnyItem[]
  onItemClick?: (item: AnyItem) => void
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
  onDeleteItem?: (type: AnyItem['type'], id: string) => void
}

export default function AgendaView({ items, onItemClick, onUpdateItem, onDeleteItem }: AgendaViewProps) {
  const [filter, setFilter]         = useState<TaskFilter>('all')
  const [selected, setSelected]     = useState<AnyItem | null>(null)
  const [localItems, setLocalItems] = useState<AnyItem[]>(items)

  const merged = items.map(pi => {
    const local = localItems.find(li => li._id === pi._id)
    return local ?? pi
  })

  const upcoming = merged.filter(item => {
    if (item.type === 'task') return true
    const dateStr = item.type === 'event' ? item.startDate : (item as Reminder).reminderDate
    if (!dateStr) return false
    const d = new Date(dateStr)
    return isFuture(d) || isToday(d)
  })

  const filtered = upcoming.filter(item => {
    if (item.type !== 'task') return true
    const status = (item as Task).status
    if (filter === 'active') return status !== 'done'
    if (filter === 'done')   return status === 'done'
    return true
  })

  const grouped = groupByDate(filtered)

  const taskCount = {
    active: upcoming.filter(i => i.type === 'task' && (i as Task).status !== 'done').length,
    done:   upcoming.filter(i => i.type === 'task' && (i as Task).status === 'done').length,
  }

  function toggleTaskDone(task: Task) {
    if (!onUpdateItem || !task._id) return
    const next = task.status === 'done' ? 'todo' : 'done'
    onUpdateItem('task', task._id, { status: next } as Partial<AnyItem>)
    if (selected?._id === task._id) setSelected({ ...task, status: next })
  }

  function handleItemUpdated(updated: AnyItem) {
    setLocalItems(prev => prev.map(i => i._id === updated._id ? updated : i))
    setSelected(updated)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: list ──────────────────────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300"
        style={{ width: selected ? '360px' : '100%' }}
      >
        {/* Filter bar */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          {([
            { id: 'all',    label: 'All' },
            { id: 'active', label: `Active${taskCount.active ? ` ${taskCount.active}` : ''}` },
            { id: 'done',   label: `Done${taskCount.done ? ` ${taskCount.done}` : ''}` },
          ] as { id: TaskFilter; label: string }[]).map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className="px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-150"
              style={filter === p.id
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--card)', color: 'var(--text-2)', border: '1px solid var(--border)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Agenda list */}
        <div className="flex-1 overflow-y-auto">
          {grouped.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-24">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                <CheckCircle2 size={22} style={{ color: 'var(--accent-light)' }} />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>All clear!</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {filter === 'done' ? 'No completed tasks yet.' : 'No upcoming events, tasks, or reminders.'}
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([key, dayItems]) => (
              <motion.div key={key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>

                {/* Day section header */}
                <div className="flex items-center gap-3 px-4 py-3 sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
                  <div>
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      {getDateLabel(key + 'T12:00:00')}
                    </span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>
                      {getDateSub(key + 'T12:00:00')}
                    </span>
                  </div>
                  <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>
                    {dayItems.length}
                  </span>
                </div>

                {/* Items */}
                <div className="px-3 pb-2 space-y-1">
                  {dayItems.map(item => {
                    const color    = ITEM_COLORS[item.type]
                    const bg       = ITEM_BG[item.type]
                    const isTask   = item.type === 'task'
                    const isDone   = isTask && (item as Task).status === 'done'
                    const dueDateStr = isTask ? (item as Task).dueDate : undefined
                    const isOverdue  = isTask && !isDone && !!dueDateStr && isPast(new Date(dueDateStr)) && !isToday(new Date(dueDateStr))
                    const isSelected = selected?._id === item._id
                    const commentCount = (item as any).comments?.length ?? 0

                    return (
                      <motion.div
                        key={item._id}
                        whileHover={{ x: 1 }}
                        onClick={() => setSelected(isSelected ? null : item)}
                        className="flex items-stretch rounded-xl cursor-pointer overflow-hidden transition-colors duration-150"
                        style={{
                          background: isSelected ? 'var(--accent-dim)' : 'var(--card)',
                          border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                          opacity: isDone ? 0.5 : 1,
                        }}
                      >
                        {/* Left color bar */}
                        <div className="w-1 flex-shrink-0" style={{ background: isDone ? 'var(--border)' : isOverdue ? '#ef4444' : color }} />

                        {/* Content */}
                        <div className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">

                          {/* Checkbox (tasks only) */}
                          {isTask && (
                            <button
                              onClick={e => { e.stopPropagation(); toggleTaskDone(item as Task) }}
                              className="flex-shrink-0 transition-opacity hover:opacity-70"
                              style={{ color: isDone ? color : 'var(--text-3)' }}
                              title={isDone ? 'Mark as todo' : 'Mark as done'}
                            >
                              {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            </button>
                          )}

                          {/* Main content */}
                          <div className="flex-1 min-w-0">
                            {/* Type + title */}
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-xs font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
                                style={{ background: bg, color }}
                              >
                                {TYPE_LABEL[item.type]}
                              </span>
                              <span
                                className="text-sm font-medium truncate"
                                style={{
                                  color: isOverdue ? '#ef4444' : 'var(--text-1)',
                                  textDecoration: isDone ? 'line-through' : 'none',
                                }}
                              >
                                {item.title}
                              </span>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.type === 'event' && (
                                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                  {formatTime(item.startDate)} — {formatTime(item.endDate)}
                                </span>
                              )}
                              {item.type === 'event' && (item as CalendarEvent).location && (
                                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                                  <MapPin size={10} />{(item as CalendarEvent).location}
                                </span>
                              )}
                              {item.type === 'reminder' && (
                                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                  {formatTime((item as Reminder).reminderDate)}
                                </span>
                              )}
                              {isTask && (item as Task).dueDate && !isOverdue && (
                                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                                  {formatTime((item as Task).dueDate!)}
                                </span>
                              )}
                              {isTask && !isOverdue && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: bg, color }}>
                                  {(item as Task).priority}
                                </span>
                              )}
                              {isOverdue && (
                                <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                                  overdue
                                </span>
                              )}
                              {(item as Task).status === 'in-progress' && !isDone && (
                                <AlertCircle size={12} className="text-amber-400" />
                              )}
                            </div>
                          </div>

                          {/* Right: comment badge */}
                          {commentCount > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                              <MessageSquare size={11} />
                              <span className="text-xs tabular-nums">{commentCount}</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="flex-1 overflow-hidden" style={{ borderLeft: '1px solid var(--border)' }}>
            <ItemDetailPanel
              item={selected}
              onClose={() => setSelected(null)}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onItemUpdated={handleItemUpdated}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
