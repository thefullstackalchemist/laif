'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isToday, isTomorrow, isFuture, isPast } from 'date-fns'
import { Calendar, Bell, MapPin, AlertCircle, CheckCircle2, Circle, MessageSquare } from 'lucide-react'
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

const TODAY_KEY = format(new Date(), 'yyyy-MM-dd')

function groupByDate(items: AnyItem[]): Map<string, AnyItem[]> {
  const map = new Map<string, AnyItem[]>()
  const sorted = [...items].sort((a, b) => {
    const da = a.type === 'event' ? a.startDate : a.type === 'task' ? (a.dueDate ?? '') : a.reminderDate
    const db = b.type === 'event' ? b.startDate : b.type === 'task' ? (b.dueDate ?? '') : b.reminderDate
    return da.localeCompare(db)
  })
  for (const item of sorted) {
    const dateStr = item.type === 'event' ? item.startDate : item.type === 'task' ? (item.dueDate ?? '') : item.reminderDate
    if (!dateStr) continue
    const d = new Date(dateStr)
    const isOverdueTask = item.type === 'task' && (item as Task).status !== 'done' && isPast(d) && !isToday(d)
    const key = isOverdueTask ? TODAY_KEY : format(d, 'yyyy-MM-dd')
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

interface AgendaViewProps {
  items: AnyItem[]
  onItemClick?: (item: AnyItem) => void
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
}

export default function AgendaView({ items, onItemClick, onUpdateItem }: AgendaViewProps) {
  const [filter, setFilter]           = useState<TaskFilter>('all')
  const [selected, setSelected]       = useState<AnyItem | null>(null)
  const [localItems, setLocalItems]   = useState<AnyItem[]>(items)

  // Keep localItems in sync when parent items change (but preserve comment updates)
  // We merge: keep local comment state, update everything else from parent
  const merged = items.map(pi => {
    const local = localItems.find(li => li._id === pi._id)
    return local ?? pi
  })

  // Events and reminders: hide past. Tasks: always show.
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

  function toggleTaskDone(task: Task) {
    if (!onUpdateItem || !task._id) return
    const next = task.status === 'done' ? 'todo' : 'done'
    onUpdateItem('task', task._id, { status: next } as Partial<AnyItem>)
    // Update selected if it's this task
    if (selected?._id === task._id) setSelected({ ...task, status: next })
  }

  const taskCount = {
    active: upcoming.filter(i => i.type === 'task' && (i as Task).status !== 'done').length,
    done:   upcoming.filter(i => i.type === 'task' && (i as Task).status === 'done').length,
  }

  function handleItemUpdated(updated: AnyItem) {
    setLocalItems(prev => prev.map(i => i._id === updated._id ? updated : i))
    setSelected(updated)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left: list ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden flex-shrink-0 transition-all duration-300"
        style={{ width: selected ? '320px' : '100%' }}
      >
        {/* Filter pills */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 flex-shrink-0">
          {([
            { id: 'all',    label: 'All' },
            { id: 'active', label: `Active${taskCount.active ? ` · ${taskCount.active}` : ''}` },
            { id: 'done',   label: `Done${taskCount.done   ? ` · ${taskCount.done}`   : ''}` },
          ] as { id: TaskFilter; label: string }[]).map(p => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-all duration-150"
              style={filter === p.id
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--input-bg)', color: 'var(--text-2)', border: '1px solid var(--border)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-6">
          {grouped.size === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)' }}>
                <Calendar size={24} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="font-medium" style={{ color: 'var(--text-2)' }}>All clear!</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                {filter === 'done' ? 'No completed tasks yet.' : 'No upcoming events, tasks, or reminders.'}
              </p>
            </div>
          ) : (
            Array.from(grouped.entries()).map(([key, dayItems]) => (
              <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--text-3)' }}>
                  {getDateLabel(key + 'T00:00:00')}
                </p>
                <div className="space-y-1.5">
                  {dayItems.map((item) => {
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
                        whileHover={{ x: 2 }}
                        onClick={() => setSelected(isSelected ? null : item)}
                        className="w-full text-left flex items-start gap-3 p-3 rounded-xl transition-colors duration-150 cursor-pointer"
                        style={{
                          borderLeft: `3px solid ${isDone ? 'var(--border)' : isOverdue ? '#ef4444' : color}`,
                          opacity: isDone ? 0.55 : 1,
                          background: isSelected ? 'var(--accent-dim)' : 'transparent',
                        }}
                      >
                        {/* Checkbox for tasks, icon for others */}
                        {isTask ? (
                          <button
                            onClick={e => { e.stopPropagation(); toggleTaskDone(item as Task) }}
                            className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ background: bg, color }}
                            title={isDone ? 'Mark as todo' : 'Mark as done'}
                          >
                            {isDone ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                          </button>
                        ) : (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: bg, color }}
                          >
                            {item.type === 'event' ? <Calendar size={13} /> : <Bell size={13} />}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{
                              color: 'var(--text-1)',
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {item.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                            {isTask && (
                              <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: bg, color }}>
                                {(item as Task).priority}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                                overdue
                              </span>
                            )}
                            {item.type === 'reminder' && (
                              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{formatTime(item.reminderDate)}</span>
                            )}
                          </div>
                        </div>

                        {/* Right badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                          {commentCount > 0 && (
                            <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-3)' }}>
                              <MessageSquare size={11} /> {commentCount}
                            </span>
                          )}
                          {isTask && (item as Task).status === 'in-progress' && !isDone && (
                            <AlertCircle size={14} className="text-amber-400" />
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

      {/* ── Right: detail panel ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <div className="flex-1 overflow-hidden">
            <ItemDetailPanel
              item={selected}
              onClose={() => setSelected(null)}
              onUpdateItem={onUpdateItem}
              onItemUpdated={handleItemUpdated}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
