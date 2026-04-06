'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Clock, Calendar, Bell, CheckCircle2, Circle, Send, MessageSquare } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ITEM_COLORS, ITEM_BG, formatTime } from '@/lib/utils'
import type { AnyItem, CalendarEvent, Task, Reminder, Comment } from '@/types'

function formatDT(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return `Today ${formatTime(iso)}`
  return format(d, 'EEE, MMM d · ') + formatTime(iso)
}

interface ItemDetailPanelProps {
  item: AnyItem
  onClose: () => void
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
  onItemUpdated?: (item: AnyItem) => void  // called after comment added
}

export default function ItemDetailPanel({ item, onClose, onUpdateItem, onItemUpdated }: ItemDetailPanelProps) {
  const color  = ITEM_COLORS[item.type]
  const bg     = ITEM_BG[item.type]
  const isTask = item.type === 'task'
  const isDone = isTask && (item as Task).status === 'done'

  const [comments, setComments] = useState<Comment[]>((item as any).comments ?? [])
  const [draft, setDraft]       = useState('')
  const [posting, setPosting]   = useState(false)

  async function submitComment() {
    const text = draft.trim()
    if (!text || posting || !item._id) return
    setPosting(true)
    try {
      const res = await fetch(`/api/${item.type}s/${item._id}/comments`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
      if (res.ok) {
        const updated = await res.json()
        setComments(updated.comments ?? [])
        setDraft('')
        onItemUpdated?.({ ...item, ...updated, comments: updated.comments })
      }
    } finally {
      setPosting(false)
    }
  }

  function toggleTaskDone() {
    if (!onUpdateItem || !item._id) return
    const next = (item as Task).status === 'done' ? 'todo' : 'done'
    onUpdateItem('task', item._id, { status: next } as Partial<AnyItem>)
  }

  const TYPE_LABEL: Record<AnyItem['type'], string> = {
    event: 'Event', task: 'Task', reminder: 'Reminder',
  }
  const TYPE_ICON: Record<AnyItem['type'], React.ReactNode> = {
    event:    <Calendar size={13} />,
    task:     <CheckCircle2 size={13} />,
    reminder: <Bell size={13} />,
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      className="flex flex-col h-full overflow-hidden"
      style={{ borderLeft: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: bg, color }}>
              {TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}
            </span>
            {isTask && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: ITEM_BG.task, color: ITEM_COLORS.task }}>
                {(item as Task).priority}
              </span>
            )}
          </div>
          <h2 className="text-base font-semibold leading-snug" style={{
            color: 'var(--text-1)',
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.6 : 1,
          }}>
            {item.title}
          </h2>
        </div>
        <button onClick={onClose} className="btn-ghost p-1.5 flex-shrink-0">
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Meta */}
        <div className="space-y-2">
          {item.type === 'event' && (
            <>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                <Clock size={13} style={{ color }} />
                <span>{formatDT((item as CalendarEvent).startDate)} — {formatTime((item as CalendarEvent).endDate)}</span>
              </div>
              {(item as CalendarEvent).location && (
                <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                  <MapPin size={13} style={{ color }} />
                  <span>{(item as CalendarEvent).location}</span>
                </div>
              )}
            </>
          )}
          {item.type === 'task' && (item as Task).dueDate && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
              <Clock size={13} style={{ color: isPast(new Date((item as Task).dueDate!)) && !isToday(new Date((item as Task).dueDate!)) ? '#ef4444' : color }} />
              <span>Due {formatDT((item as Task).dueDate!)}</span>
            </div>
          )}
          {item.type === 'reminder' && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
              <Bell size={13} style={{ color }} />
              <span>{formatDT((item as Reminder).reminderDate)}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {(item as any).description && (
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-3)' }}>DESCRIPTION</p>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{(item as any).description}</p>
          </div>
        )}

        {/* Task action */}
        {isTask && (
          <button
            onClick={toggleTaskDone}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl w-full transition-colors"
            style={{ background: isDone ? ITEM_BG.task : bg, color: isDone ? ITEM_COLORS.task : color, border: `1px solid ${color}30` }}
          >
            {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
            {isDone ? 'Mark as to-do' : 'Mark as done'}
          </button>
        )}

        {/* Comments */}
        <div>
          <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
            <MessageSquare size={11} /> NOTES & COMMENTS {comments.length > 0 && `· ${comments.length}`}
          </p>

          {comments.length === 0 && (
            <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>No comments yet</p>
          )}

          <div className="space-y-2 mb-4">
            {[...comments].reverse().map((c, i) => (
              <div key={c._id ?? i} className="rounded-xl p-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <p className="text-sm" style={{ color: 'var(--text-1)' }}>{c.text}</p>
                {c.createdAt && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {format(new Date(c.createdAt), 'MMM d, h:mm a')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add comment */}
      <div className="flex-shrink-0 p-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex gap-2">
          <textarea
            className="input-field flex-1 resize-none text-sm"
            rows={2}
            placeholder="Add a note or comment…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment() }}
          />
          <button
            onClick={submitComment}
            disabled={!draft.trim() || posting}
            className="btn-primary px-3 flex items-center justify-center self-end disabled:opacity-40"
          >
            <Send size={13} />
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>⌘↵ to submit</p>
      </div>
    </motion.div>
  )
}
