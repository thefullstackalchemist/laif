'use client'
import { useState, useEffect, useMemo } from 'react'
import { format, isToday, isFuture } from 'date-fns'
import { Clock } from 'lucide-react'
import type { AnyItem, CalendarEvent, Reminder } from '@/types'

interface Props { items?: AnyItem[] }

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now()
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const totalMin = Math.ceil(ms / 60_000)
  if (totalMin < 60) return `in ${totalMin}m`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`
}

export default function ClockWidget({ items = [] }: Props) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const nextItem = useMemo(() => {
    const candidates = items.filter(i => {
      const dateStr = i.type === 'event'
        ? (i as CalendarEvent).startDate
        : i.type === 'reminder'
        ? (i as Reminder).reminderDate
        : null
      if (!dateStr) return false
      const d = new Date(dateStr)
      return isToday(d) && isFuture(d)
    })
    return candidates.sort((a, b) => {
      const aDate = a.type === 'event' ? (a as CalendarEvent).startDate : (a as Reminder).reminderDate
      const bDate = b.type === 'event' ? (b as CalendarEvent).startDate : (b as Reminder).reminderDate
      return new Date(aDate).getTime() - new Date(bDate).getTime()
    })[0] ?? null
  }, [items, now])

  const hh   = format(now, 'hh')
  const mm   = format(now, 'mm')
  const ampm = format(now, 'a')
  const date = format(now, 'EEEE, MMMM d')

  const nextDateStr = nextItem
    ? nextItem.type === 'event'
      ? (nextItem as CalendarEvent).startDate
      : (nextItem as Reminder).reminderDate
    : null

  const countdown = nextDateStr ? formatCountdown(msUntil(nextDateStr)) : null

  return (
    <div className="flex flex-col justify-between h-full">
      <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
        Local time
      </p>

      <div>
        <div className="flex items-end gap-1 leading-none">
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: 'clamp(44px, 4.5vw, 68px)', color: 'var(--text-1)', letterSpacing: '-2px' }}
          >
            {hh}
            <span style={{ color: 'var(--text-3)', animation: 'blink 1s step-end infinite' }}>:</span>
            {mm}
          </span>
          <span className="pb-2 text-xl font-semibold" style={{ color: 'var(--accent-light)' }}>{ampm}</span>
        </div>
        <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-2)' }}>{date}</p>
      </div>

      {/* Countdown chip — point 8 */}
      {nextItem && countdown ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg self-start"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)30' }}>
          <Clock size={11} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <span className="text-xs font-medium truncate max-w-[140px]" style={{ color: 'var(--accent-light)' }}>
            {countdown} · {nextItem.title}
          </span>
        </div>
      ) : (
        <div />
      )}

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }`}</style>
    </div>
  )
}
