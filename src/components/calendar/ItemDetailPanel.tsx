'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, MapPin, Clock, Calendar, Bell, CheckCircle2, Circle, Send, MessageSquare, Pencil, Check, Trash2 } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { ITEM_COLORS, ITEM_BG, formatTime } from '@/lib/utils'
import UmbrellaPicker from '@/components/umbrellas/UmbrellaPicker'
import type { AnyItem, CalendarEvent, Task, Reminder, Comment } from '@/types'

// datetime-local value  →  ISO string
function toISO(local: string) { return new Date(local).toISOString() }
// ISO string  →  datetime-local value
function toLocal(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDT(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return `Today ${formatTime(iso)}`
  return format(d, 'EEE, MMM d · ') + formatTime(iso)
}

interface ItemDetailPanelProps {
  item: AnyItem
  onClose: () => void
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
  onDeleteItem?: (type: AnyItem['type'], id: string) => void
  onItemUpdated?: (item: AnyItem) => void
}

export default function ItemDetailPanel({ item, onClose, onUpdateItem, onDeleteItem, onItemUpdated }: ItemDetailPanelProps) {
  const color  = ITEM_COLORS[item.type]
  const bg     = ITEM_BG[item.type]
  const isTask = item.type === 'task'
  const isDone = isTask && (item as Task).status === 'done'

  const [comments, setComments]           = useState<Comment[]>((item as any).comments ?? [])
  const [draft, setDraft]                 = useState('')
  const [posting, setPosting]             = useState(false)
  const [editingTitle, setEditingTitle]   = useState(false)
  const [titleDraft, setTitleDraft]       = useState(item.title)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Date editing state
  const [editingDate, setEditingDate]     = useState(false)
  const [dateDraft, setDateDraft]         = useState(() => getDateValue(item))

  // Umbrella state (local copy so changes feel instant)
  const [umbrellas, setUmbrellas]         = useState<string[]>((item as any).umbrellas?.map(String) ?? [])

  // Reset all local state when selected item changes
  useEffect(() => {
    setTitleDraft(item.title)
    setEditingTitle(false)
    setConfirmDelete(false)
    setEditingDate(false)
    setDateDraft(getDateValue(item))
    setUmbrellas((item as any).umbrellas?.map(String) ?? [])
    setComments((item as any).comments ?? [])
  }, [item._id])

  function getDateValue(it: AnyItem): string {
    if (it.type === 'event')    return toLocal((it as CalendarEvent).startDate)
    if (it.type === 'task')     return (it as Task).dueDate ? toLocal((it as Task).dueDate!) : ''
    if (it.type === 'reminder') return toLocal((it as Reminder).reminderDate)
    return ''
  }

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
    } finally { setPosting(false) }
  }

  function saveTitle() {
    const trimmed = titleDraft.trim()
    if (!trimmed || trimmed === item.title || !onUpdateItem || !item._id) {
      setTitleDraft(item.title); setEditingTitle(false); return
    }
    onUpdateItem(item.type, item._id, { title: trimmed } as Partial<AnyItem>)
    setEditingTitle(false)
  }

  function saveDate() {
    if (!dateDraft || !onUpdateItem || !item._id) { setEditingDate(false); return }
    const iso = toISO(dateDraft)
    if (item.type === 'event') {
      // Keep same duration, shift both start + end
      const ev   = item as CalendarEvent
      const dur  = new Date(ev.endDate).getTime() - new Date(ev.startDate).getTime()
      const newStart = new Date(iso)
      const newEnd   = new Date(newStart.getTime() + dur)
      onUpdateItem('event', item._id, { startDate: newStart.toISOString(), endDate: newEnd.toISOString() } as Partial<AnyItem>)
    } else if (item.type === 'task') {
      onUpdateItem('task', item._id, { dueDate: iso } as Partial<AnyItem>)
    } else if (item.type === 'reminder') {
      onUpdateItem('reminder', item._id, { reminderDate: iso } as Partial<AnyItem>)
    }
    setEditingDate(false)
  }

  function handleUmbrellaChange(ids: string[]) {
    setUmbrellas(ids)
    if (!onUpdateItem || !item._id) return
    onUpdateItem(item.type, item._id, { umbrellas: ids } as Partial<AnyItem>)
  }

  function handleDelete() {
    if (!onDeleteItem || !item._id) return
    onDeleteItem(item.type, item._id)
    onClose()
  }

  function toggleTaskDone() {
    if (!onUpdateItem || !item._id) return
    const next = (item as Task).status === 'done' ? 'todo' : 'done'
    onUpdateItem('task', item._id, { status: next } as Partial<AnyItem>)
  }

  const TYPE_LABEL: Record<AnyItem['type'], string> = { event: 'Event', task: 'Task', reminder: 'Reminder' }
  const TYPE_ICON:  Record<AnyItem['type'], React.ReactNode> = {
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
          {editingTitle ? (
            <div className="flex items-center gap-1.5 mt-1">
              <input
                autoFocus
                className="input-field text-base font-semibold flex-1 py-1"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') { setTitleDraft(item.title); setEditingTitle(false) }
                }}
                onBlur={saveTitle}
              />
              <button onMouseDown={e => { e.preventDefault(); saveTitle() }} className="btn-ghost p-1.5 flex-shrink-0" style={{ color }}>
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button className="group flex items-start gap-1.5 text-left mt-1 w-full" onClick={() => setEditingTitle(true)} title="Click to edit title">
              <h2 className="text-base font-semibold leading-snug flex-1" style={{
                color: 'var(--text-1)',
                textDecoration: isDone ? 'line-through' : 'none',
                opacity: isDone ? 0.6 : 1,
              }}>
                {item.title}
              </h2>
              <Pencil size={12} className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-50 transition-opacity" style={{ color: 'var(--text-2)' }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {confirmDelete ? (
            <>
              <button onClick={handleDelete} className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: '#ef4444', color: '#fff' }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost p-1.5 text-xs">Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost p-1.5" title="Delete" style={{ color: 'var(--text-3)' }}>
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={15} /></button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Date / time — editable */}
        <div>
          {editingDate ? (
            <div className="space-y-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>
                {item.type === 'event' ? 'START DATE & TIME' : item.type === 'task' ? 'DUE DATE' : 'REMINDER TIME'}
              </p>
              <input
                type="datetime-local"
                value={dateDraft}
                onChange={e => setDateDraft(e.target.value)}
                className="input-field text-sm w-full"
              />
              {item.type === 'event' && (
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Duration is preserved when shifting start time.</p>
              )}
              <div className="flex gap-2">
                <button onClick={saveDate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: color, color: '#fff' }}>
                  <Check size={11} /> Save
                </button>
                <button onClick={() => { setEditingDate(false); setDateDraft(getDateValue(item)) }} className="px-3 py-1.5 rounded-lg text-xs" style={{ background: 'var(--border)', color: 'var(--text-2)' }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className="group flex items-center gap-2 text-sm w-full text-left"
              style={{ color: 'var(--text-2)' }}
            >
              {item.type === 'event' && <Clock size={13} style={{ color }} />}
              {item.type === 'task'  && <Clock size={13} style={{ color: isPast(new Date((item as Task).dueDate ?? '')) && !isToday(new Date((item as Task).dueDate ?? '')) ? '#ef4444' : color }} />}
              {item.type === 'reminder' && <Bell size={13} style={{ color }} />}
              <span className="flex-1">
                {item.type === 'event'    && `${formatDT((item as CalendarEvent).startDate)} — ${formatTime((item as CalendarEvent).endDate)}`}
                {item.type === 'task'     && ((item as Task).dueDate ? `Due ${formatDT((item as Task).dueDate!)}` : 'No due date')}
                {item.type === 'reminder' && formatDT((item as Reminder).reminderDate)}
              </span>
              <Pencil size={11} className="opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0" />
            </button>
          )}

          {/* Location for events */}
          {item.type === 'event' && (item as CalendarEvent).location && !editingDate && (
            <div className="flex items-center gap-2 text-sm mt-2" style={{ color: 'var(--text-2)' }}>
              <MapPin size={13} style={{ color }} />
              <span>{(item as CalendarEvent).location}</span>
            </div>
          )}
        </div>

        {/* Umbrellas */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-3)' }}>UMBRELLAS</p>
          <UmbrellaPicker selected={umbrellas} onChange={handleUmbrellaChange} />
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
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{format(new Date(c.createdAt), 'MMM d, h:mm a')}</p>
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
          <button onClick={submitComment} disabled={!draft.trim() || posting} className="btn-primary px-3 flex items-center justify-center self-end disabled:opacity-40">
            <Send size={13} />
          </button>
        </div>
        <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>⌘↵ to submit</p>
      </div>
    </motion.div>
  )
}
