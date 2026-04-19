'use client'
import { useState, useRef } from 'react'
import { CheckCircle2, Circle, CheckSquare, Plus } from 'lucide-react'
import { isToday } from 'date-fns'
import type { AnyItem, Task } from '@/types'
import { ITEM_COLORS } from '@/lib/utils'

interface Props {
  items: AnyItem[]
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
  onAddItem?: (type: AnyItem['type'], data: Record<string, unknown>) => Promise<void>
}

export default function TodayTasksWidget({ items, onUpdateItem, onAddItem }: Props) {
  const [quickInput, setQuickInput] = useState('')
  const [adding, setAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tasks = (items.filter(i => {
    if (i.type !== 'task') return false
    const d = (i as Task).dueDate
    return d ? isToday(new Date(d)) : false
  }) as Task[]).sort((a, b) => {
    // high priority first, then done tasks last
    const pri = { high: 0, medium: 1, low: 2 }
    if (a.status === 'done' && b.status !== 'done') return 1
    if (b.status === 'done' && a.status !== 'done') return -1
    return (pri[a.priority] ?? 1) - (pri[b.priority] ?? 1)
  })

  const doneCount = tasks.filter(t => t.status === 'done').length
  const pct       = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  function toggle(task: Task) {
    if (!onUpdateItem || !task._id) return
    onUpdateItem('task', task._id, { status: task.status === 'done' ? 'todo' : 'done' } as Partial<AnyItem>)
  }

  async function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const title = quickInput.trim()
    if (!title || !onAddItem) return
    setAdding(true)
    try {
      const today = new Date()
      today.setHours(23, 59, 0, 0)
      await onAddItem('task', { title, priority: 'medium', status: 'todo', dueDate: today.toISOString() })
      setQuickInput('')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <CheckSquare size={12} style={{ color: ITEM_COLORS.task }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
            Today's tasks
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-3)' }}>
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="h-1 rounded-full mb-3 overflow-hidden flex-shrink-0" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: ITEM_COLORS.task }}
          />
        </div>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-4">
            <CheckCircle2 size={22} style={{ color: 'var(--text-3)' }} />
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>No tasks due today</p>
          </div>
        ) : (
          tasks.map(task => {
            const done = task.status === 'done'
            return (
              <button
                key={task._id}
                onClick={() => toggle(task)}
                className="flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-xl transition-colors"
                style={{
                  background: done ? 'transparent' : 'var(--input-bg)',
                  border: `1px solid ${done ? 'transparent' : 'var(--border)'}`,
                  opacity: done ? 0.45 : 1,
                }}
              >
                {done
                  ? <CheckCircle2 size={14} style={{ color: ITEM_COLORS.task, flexShrink: 0 }} />
                  : <Circle      size={14} style={{ color: 'var(--text-3)',   flexShrink: 0 }} />
                }
                <span
                  className="text-xs flex-1 truncate font-medium"
                  style={{
                    color: done ? 'var(--text-3)' : 'var(--text-1)',
                    textDecoration: done ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </span>
                {task.priority === 'high' && !done && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 font-medium"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    !
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Inline quick-add */}
      {onAddItem && (
        <div className="flex-shrink-0 mt-2 flex items-center gap-1.5">
          <Plus size={11} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={quickInput}
            onChange={e => setQuickInput(e.target.value)}
            onKeyDown={handleQuickAdd}
            disabled={adding}
            placeholder="Add task… press Enter"
            className="flex-1 bg-transparent text-xs outline-none placeholder:opacity-40"
            style={{ color: 'var(--text-2)', caretColor: 'var(--accent)' }}
          />
        </div>
      )}
    </div>
  )
}
