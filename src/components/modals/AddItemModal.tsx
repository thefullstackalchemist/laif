'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CheckSquare, Bell, MapPin, BellRing } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnyItem } from '@/types'

type Tab = 'event' | 'task' | 'reminder'

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onAdd: (type: AnyItem['type'], data: Record<string, unknown>) => Promise<void>
  defaultDate?: string
  defaultStart?: string
  defaultEnd?: string
  defaultType?: Tab
}

const TABS: { id: Tab; label: string; icon: typeof Calendar }[] = [
  { id: 'event', label: 'Event', icon: Calendar },
  { id: 'task', label: 'Task', icon: CheckSquare },
  { id: 'reminder', label: 'Reminder', icon: Bell },
]

// Format a Date as a local datetime string for datetime-local inputs (no UTC conversion)
function toLocalDT(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const now = () => {
  const d = new Date()
  d.setSeconds(0, 0)
  return toLocalDT(d)
}
const hourLater = () => {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return toLocalDT(d)
}

export default function AddItemModal({ open, onClose, onAdd, defaultDate, defaultStart, defaultEnd, defaultType }: AddItemModalProps) {
  const [tab, setTab] = useState<Tab>(defaultType ?? 'event')
  const [loading, setLoading] = useState(false)

  // Event fields
  const [eventTitle, setEventTitle] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventStart, setEventStart] = useState(defaultStart ?? defaultDate ?? now())
  const [eventEnd, setEventEnd] = useState(defaultEnd ?? defaultDate ?? hourLater())
  const [eventLocation, setEventLocation] = useState('')
  const [eventNotifyBefore, setEventNotifyBefore] = useState<number | null>(15)

  // Task fields
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskDue, setTaskDue] = useState(defaultStart ?? defaultDate ?? now())
  const [taskPriority, setTaskPriority] = useState<'low'|'medium'|'high'>('medium')
  const [taskStatus, setTaskStatus] = useState<'todo'|'in-progress'|'done'>('todo')

  // Reminder fields
  const [reminderTitle, setReminderTitle] = useState('')
  const [reminderDesc, setReminderDesc] = useState('')
  const [reminderDate, setReminderDate] = useState(defaultDate ?? now())

  // Sync drag-selected times and default type when modal opens
  useEffect(() => {
    if (open) {
      if (defaultType) setTab(defaultType)
      if (defaultStart) { setEventStart(defaultStart); setTaskDue(defaultStart); setReminderDate(defaultStart) }
      if (defaultEnd) setEventEnd(defaultEnd)
    }
  }, [open, defaultType, defaultStart, defaultEnd])

  function reset() {
    setEventTitle(''); setEventDesc(''); setEventStart(now()); setEventEnd(hourLater()); setEventLocation(''); setEventNotifyBefore(15)
    setTaskTitle(''); setTaskDesc(''); setTaskDue(now()); setTaskPriority('medium'); setTaskStatus('todo')
    setReminderTitle(''); setReminderDesc(''); setReminderDate(now())
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      if (tab === 'event') {
        if (!eventTitle.trim()) return
        await onAdd('event', {
          title: eventTitle.trim(),
          description: eventDesc,
          startDate: new Date(eventStart).toISOString(),
          endDate: new Date(eventEnd).toISOString(),
          location: eventLocation || undefined,
          notifyBefore: eventNotifyBefore ?? undefined,
        })
      } else if (tab === 'task') {
        if (!taskTitle.trim()) return
        await onAdd('task', { title: taskTitle.trim(), description: taskDesc, dueDate: taskDue ? new Date(taskDue).toISOString() : undefined, priority: taskPriority, status: taskStatus })
      } else {
        if (!reminderTitle.trim()) return
        await onAdd('reminder', { title: reminderTitle.trim(), description: reminderDesc, reminderDate: new Date(reminderDate).toISOString() })
      }
      reset()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)',  }}
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none"
          >
            <div className="glass-card w-full max-w-md pointer-events-auto shadow-float overflow-hidden max-h-[88vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <h3 className="text-base font-semibold text-slate-100">Add item</h3>
                <button onClick={onClose} className="btn-ghost p-1.5 -mr-1">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-3 pb-0">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={tab === id
                      ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                      : { color: 'var(--text-3)' }
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Form */}
              <div className="p-5 space-y-3 overflow-y-auto flex-1">
                {tab === 'event' && (
                  <>
                    <div>
                      <label className="label">Title *</label>
                      <input className="input-field" placeholder="What's the event?" value={eventTitle} onChange={e => setEventTitle(e.target.value)} autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Start</label>
                        <input type="datetime-local" className="input-field" value={eventStart} onChange={e => setEventStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">End</label>
                        <input type="datetime-local" className="input-field" value={eventEnd} onChange={e => setEventEnd(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Location</label>
                        <input className="input-field" placeholder="Optional" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                      </div>
                      <div>
                        <label className="label flex items-center gap-1"><BellRing size={11} /> Notify before</label>
                        <select
                          className="input-field"
                          value={eventNotifyBefore ?? ''}
                          onChange={e => setEventNotifyBefore(e.target.value ? Number(e.target.value) : null)}
                        >
                          <option value="">None</option>
                          <option value="5">5 min</option>
                          <option value="10">10 min</option>
                          <option value="15">15 min</option>
                          <option value="30">30 min</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="input-field resize-none" rows={2} placeholder="Details..." value={eventDesc} onChange={e => setEventDesc(e.target.value)} />
                    </div>
                  </>
                )}

                {tab === 'task' && (
                  <>
                    <div>
                      <label className="label">Title *</label>
                      <input className="input-field" placeholder="What needs to be done?" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">Due date</label>
                        <input type="datetime-local" className="input-field" value={taskDue} onChange={e => setTaskDue(e.target.value)} />
                      </div>
                      <div>
                        <label className="label">Priority</label>
                        <select className="input-field" value={taskPriority} onChange={e => setTaskPriority(e.target.value as 'low'|'medium'|'high')}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input-field" value={taskStatus} onChange={e => setTaskStatus(e.target.value as 'todo'|'in-progress'|'done')}>
                        <option value="todo">To do</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="input-field resize-none" rows={2} placeholder="Details..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} />
                    </div>
                  </>
                )}

                {tab === 'reminder' && (
                  <>
                    <div>
                      <label className="label">Title *</label>
                      <input className="input-field" placeholder="Remind me to..." value={reminderTitle} onChange={e => setReminderTitle(e.target.value)} autoFocus />
                    </div>
                    <div>
                      <label className="label">Remind at</label>
                      <input type="datetime-local" className="input-field" value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="input-field resize-none" rows={2} placeholder="Details..." value={reminderDesc} onChange={e => setReminderDesc(e.target.value)} />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 pb-5">
                <button onClick={onClose} className="btn-ghost">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
