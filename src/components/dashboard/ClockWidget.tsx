'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'

export default function ClockWidget() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh   = format(now, 'hh')
  const mm   = format(now, 'mm')
  const ampm = format(now, 'a')
  const date = format(now, 'EEEE, MMMM d')

  return (
    <div className="flex flex-col justify-between h-full">
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
        Local time
      </p>
      <div>
        <div className="flex items-end gap-1 leading-none">
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: 'clamp(48px, 5vw, 72px)', color: 'var(--text-1)', letterSpacing: '-2px' }}
          >
            {hh}
            <span style={{ color: 'var(--text-3)', animation: 'blink 1s step-end infinite' }}>:</span>
            {mm}
          </span>
          <span className="pb-2 text-2xl font-medium" style={{ color: 'var(--accent-light)' }}>{ampm}</span>
        </div>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-2)' }}>{date}</p>
      </div>

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
