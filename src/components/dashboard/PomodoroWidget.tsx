'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, RotateCcw, Coffee, ChevronDown, X, Calendar, CheckSquare } from 'lucide-react'
import { isToday, format } from 'date-fns'
import type { AnyItem, Task, CalendarEvent } from '@/types'

const WORK_SEC  = 25 * 60
const BREAK_SEC =  5 * 60

interface PickerItem {
  id: string
  type: 'task' | 'event'
  title: string
  durationSec: number   // tasks → WORK_SEC, events → actual duration
  subtitle?: string     // events show time range
}

interface Props {
  items?: AnyItem[]
}

export default function PomodoroWidget({ items = [] }: Props) {
  const [mode, setMode]             = useState<'work' | 'break'>('work')
  const [totalSec, setTotalSec]     = useState(WORK_SEC)
  const [secondsLeft, setSecondsLeft] = useState(WORK_SEC)
  const [running, setRunning]       = useState(false)
  const [sessions, setSessions]     = useState(0)
  const [selected, setSelected]     = useState<PickerItem | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mounted, setMounted]       = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Build picker list: upcoming/active events today + incomplete tasks due today
  const pickerItems: PickerItem[] = [
    ...( items.filter(i => {
      if (i.type !== 'event') return false
      const e = i as CalendarEvent
      return isToday(new Date(e.startDate))
    }) as CalendarEvent[]).map(e => {
      const start = new Date(e.startDate)
      const end   = new Date(e.endDate)
      const durSec = Math.max(60, Math.round((end.getTime() - start.getTime()) / 1000))
      return {
        id: e._id!,
        type: 'event' as const,
        title: e.title,
        durationSec: durSec,
        subtitle: `${format(start, 'h:mm')}–${format(end, 'h:mm a')}`,
      }
    }),
    ...( items.filter(i => {
      if (i.type !== 'task') return false
      const t = i as Task
      return t.status !== 'done' && (t.dueDate ? isToday(new Date(t.dueDate)) : false)
    }) as Task[]).map(t => ({
      id: t._id!,
      type: 'task' as const,
      title: t.title,
      durationSec: WORK_SEC,
    })),
  ]

  function selectItem(item: PickerItem | null) {
    setSelected(item)
    const dur = item?.durationSec ?? WORK_SEC
    setTotalSec(dur)
    setSecondsLeft(dur)
    setRunning(false)
    setPickerOpen(false)
  }

  const focusActive = running && mode === 'work'
  const progress    = 1 - secondsLeft / totalSec
  const color       = mode === 'work' ? 'var(--accent)' : 'var(--color-task)'

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setRunning(false)
          if (mode === 'work') {
            setSessions(n => n + 1)
            setMode('break')
            setTotalSec(BREAK_SEC)
            return BREAK_SEC
          }
          setMode('work')
          const dur = selected?.durationSec ?? WORK_SEC
          setTotalSec(dur)
          return dur
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode, selected])

  function reset() {
    setRunning(false)
    if (mode === 'work') {
      const dur = selected?.durationSec ?? WORK_SEC
      setTotalSec(dur)
      setSecondsLeft(dur)
    } else {
      setTotalSec(BREAK_SEC)
      setSecondsLeft(BREAK_SEC)
    }
  }

  function switchMode(next: 'work' | 'break') {
    if (next === mode) return
    setMode(next)
    setRunning(false)
    if (next === 'work') {
      const dur = selected?.durationSec ?? WORK_SEC
      setTotalSec(dur)
      setSecondsLeft(dur)
    } else {
      setTotalSec(BREAK_SEC)
      setSecondsLeft(BREAK_SEC)
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  function Ring({ size, strokeW, r }: { size: number; strokeW: number; r: number }) {
    const c = 2 * Math.PI * r
    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={strokeW} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
        />
      </svg>
    )
  }

  // ── Focus overlay ────────────────────────────────────────────
  const overlay = focusActive && mounted ? createPortal(
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: 'rgba(7, 11, 20, 0.94)', backdropFilter: 'blur(6px)' }}
    >
      <button onClick={reset} className="absolute top-6 right-6 btn-ghost p-2 opacity-40 hover:opacity-100" title="End session">
        <X size={16} />
      </button>

      <div className="mb-12 text-center px-8">
        {selected ? (
          <>
            <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>
              {selected.type === 'event' ? 'in session' : 'focusing on'}
            </p>
            <p className="text-xl font-semibold" style={{ color: '#e2e8f0', maxWidth: 440 }}>
              {selected.title}
            </p>
            {selected.subtitle && (
              <p className="text-sm mt-1.5" style={{ color: '#4a5880' }}>{selected.subtitle}</p>
            )}
          </>
        ) : (
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3d5068' }}>deep focus</p>
        )}
      </div>

      <div className="relative flex items-center justify-center">
        <div className="breathing-ring absolute" style={{ width: 260, height: 260 }} />
        <Ring size={180} strokeW={5} r={84} />
        <div className="absolute flex flex-col items-center">
          <span className="font-bold tabular-nums" style={{ fontSize: 52, color: '#e2e8f0', letterSpacing: '-2px', lineHeight: 1 }}>
            {mm}:{ss}
          </span>
          <span className="text-sm mt-2" style={{ color: '#3d5068' }}>focus</span>
        </div>
      </div>

      <div className="flex items-center gap-5 mt-12">
        <button onClick={reset} className="btn-ghost p-2.5 opacity-50 hover:opacity-100">
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {running ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
        </button>
        <div className="w-10 flex items-center gap-1" style={{ color: '#3d5068' }}>
          {sessions > 0 && <><Coffee size={13} /><span className="text-sm">{sessions}</span></>}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  // ── Widget ───────────────────────────────────────────────────
  return (
    <>
      {overlay}
      <div className="flex flex-col h-full">
        {/* Header + mode toggle */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>Focus</p>
          <div className="flex items-center gap-1">
            {(['work', 'break'] as const).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors capitalize"
                style={mode === m
                  ? { background: m === 'work' ? 'var(--accent)' : 'var(--color-task)', color: '#fff' }
                  : { background: 'var(--input-bg)', color: 'var(--text-3)' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Picker — work mode only */}
        {mode === 'work' && (
          <div className="mb-3 flex-shrink-0 relative">
            <button
              onClick={() => setPickerOpen(o => !o)}
              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-colors"
              style={{
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: selected ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              <span className="flex-1 text-left truncate">
                {selected ? selected.title : 'Pick a task or event…'}
              </span>
              <ChevronDown size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
            </button>

            {pickerOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-1 rounded-xl z-10"
                style={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                <button
                  onClick={() => selectItem(null)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--input-bg)] transition-colors"
                  style={{ color: 'var(--text-3)' }}
                >
                  No specific task
                </button>

                {pickerItems.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-3)' }}>Nothing scheduled today</p>
                )}

                {/* Group by type */}
                {(['event', 'task'] as const).map(type => {
                  const group = pickerItems.filter(p => p.type === type)
                  if (group.length === 0) return null
                  return (
                    <div key={type}>
                      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
                        {type === 'event' ? 'Events' : 'Tasks'}
                      </p>
                      {group.map(item => (
                        <button
                          key={item.id}
                          onClick={() => selectItem(item)}
                          className="w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2"
                          style={{
                            color: item.id === selected?.id ? 'var(--accent)' : 'var(--text-1)',
                            background: item.id === selected?.id ? 'var(--accent-dim)' : 'transparent',
                          }}
                        >
                          {type === 'event'
                            ? <Calendar size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
                            : <CheckSquare size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
                          }
                          <span className="flex-1 truncate">{item.title}</span>
                          {item.subtitle && (
                            <span className="opacity-50 flex-shrink-0">{item.subtitle}</span>
                          )}
                          {type === 'task' && (
                            <span className="opacity-40 flex-shrink-0">25m</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Ring + timer */}
        <div className="flex-1 flex items-center justify-center" onClick={() => pickerOpen && setPickerOpen(false)}>
          <div className="relative flex items-center justify-center">
            <Ring size={120} strokeW={6} r={48} />
            <div className="absolute flex flex-col items-center">
              <span className="font-bold tabular-nums leading-none" style={{ fontSize: 26, color: 'var(--text-1)', letterSpacing: '-1px' }}>
                {mm}:{ss}
              </span>
              <span className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {mode === 'work' ? 'focus' : 'break'}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 flex-shrink-0">
          <button onClick={reset} className="btn-ghost p-2"><RotateCcw size={13} /></button>
          <button
            onClick={() => setRunning(r => !r)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: color, color: '#fff' }}
          >
            {running ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>
          <div className="flex items-center gap-1 w-8" style={{ color: 'var(--text-3)' }}>
            {sessions > 0 && <><Coffee size={12} /><span className="text-xs">{sessions}</span></>}
          </div>
        </div>
      </div>
    </>
  )
}
