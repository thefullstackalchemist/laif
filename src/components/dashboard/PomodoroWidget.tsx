'use client'
import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react'

const WORK_SEC  = 25 * 60
const BREAK_SEC =  5 * 60

export default function PomodoroWidget() {
  const [mode, setMode]               = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK_SEC)
  const [running, setRunning]         = useState(false)
  const [sessions, setSessions]       = useState(0)

  const total    = mode === 'work' ? WORK_SEC : BREAK_SEC
  const progress = 1 - secondsLeft / total

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          setRunning(false)
          if (mode === 'work') {
            setSessions(n => n + 1)
            setMode('break')
            return BREAK_SEC
          }
          setMode('work')
          return WORK_SEC
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, mode])

  function reset() {
    setRunning(false)
    setSecondsLeft(mode === 'work' ? WORK_SEC : BREAK_SEC)
  }

  function switchMode(next: 'work' | 'break') {
    if (next === mode) return
    setMode(next)
    setSecondsLeft(next === 'work' ? WORK_SEC : BREAK_SEC)
    setRunning(false)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const r     = 48
  const circ  = 2 * Math.PI * r
  const color = mode === 'work' ? 'var(--accent)' : 'var(--color-task)'

  return (
    <div className="flex flex-col h-full">
      {/* Header + mode toggle */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          Focus
        </p>
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

      {/* Ring + timer */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={60} cy={60} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
            <circle
              cx={60} cy={60} r={r} fill="none"
              stroke={color}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - progress)}
              style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
            />
          </svg>
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
        <button onClick={reset} className="btn-ghost p-2">
          <RotateCcw size={13} />
        </button>
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
  )
}
