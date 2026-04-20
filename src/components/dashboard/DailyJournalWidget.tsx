'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks, isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

const JournalEditor = dynamic(
  () => import('@/components/journal/JournalEditor'),
  { ssr: false, loading: () => <div style={{ padding: 16, color: 'var(--text-3)', fontSize: 13 }}>Loading…</div> }
)

const AUTOSAVE_MS = 1500

export default function DailyJournalWidget() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selected,    setSelected]    = useState(format(new Date(), 'yyyy-MM-dd'))
  const [entryDates,  setEntryDates]  = useState<Set<string>>(new Set())
  const [content,     setContent]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)

  const selectedRef = useRef(selected)
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // ── Load all entry dates once (for dots) ──────────────────────────────────
  useEffect(() => {
    fetch('/api/journal')
      .then(r => r.json())
      .then(({ dates }: { dates: string[] }) => setEntryDates(new Set(dates)))
      .catch(() => {})
  }, [])

  // ── Load content for selected date ────────────────────────────────────────
  useEffect(() => {
    selectedRef.current = selected
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setLoading(true)
    fetch(`/api/journal?date=${selected}`)
      .then(r => r.json())
      .then(({ content: c }: { content: string }) => setContent(c ?? ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [selected])

  // ── Auto-save (upsert) ────────────────────────────────────────────────────
  const save = useCallback(async (json: string, date: string) => {
    setSaving(true)
    try {
      await fetch('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content: json }),
      })
      setEntryDates(prev => { const n = new Set(prev); n.add(date); return n })
    } finally {
      setSaving(false)
    }
  }, [])

  function handleChange(json: string) {
    setContent(json)
    const date = selectedRef.current
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(json, date), AUTOSAVE_MS)
  }

  // ── Cleanup timer on unmount ───────────────────────────────────────────────
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  const loaded = !loading

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={13} style={{ color: 'var(--accent-light)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-3)' }}>
            JOURNAL
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {saving ? 'Saving…' : loaded && !loading ? 'Saved' : ''}
        </span>
      </div>

      {/* ── Week slider ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 10, flexShrink: 0 }}>
        <button
          onClick={() => setWeekStart(w => subWeeks(w, 1))}
          style={{ padding: '2px 3px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
        >
          <ChevronLeft size={13} />
        </button>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {days.map(day => {
            const ds         = format(day, 'yyyy-MM-dd')
            const isSelected = ds === selected
            const today      = isToday(day)
            const hasEntry   = entryDates.has(ds)
            return (
              <button
                key={ds}
                onClick={() => setSelected(ds)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px 2px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  background: isSelected
                    ? 'var(--accent)'
                    : today
                      ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                      : 'transparent',
                  transition: 'background 0.12s',
                }}
              >
                <span style={{
                  fontSize: 9, fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1,
                  color: isSelected ? 'rgba(255,255,255,0.75)' : 'var(--text-3)',
                }}>
                  {format(day, 'EEE').toUpperCase().slice(0, 2)}
                </span>
                <span style={{
                  fontSize: 12, lineHeight: 1.5,
                  fontWeight: today || isSelected ? 700 : 400,
                  color: isSelected ? 'white' : today ? 'var(--text-1)' : 'var(--text-2)',
                }}>
                  {format(day, 'd')}
                </span>
                <span style={{
                  width: 4, height: 4, borderRadius: '50%', marginTop: 1,
                  background: hasEntry
                    ? isSelected ? 'rgba(255,255,255,0.6)' : 'var(--accent)'
                    : 'transparent',
                }} />
              </button>
            )
          })}
        </div>

        <button
          onClick={() => setWeekStart(w => addWeeks(w, 1))}
          style={{ padding: '2px 3px', borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
        >
          <ChevronRight size={13} />
        </button>
      </div>

      {/* ── Date label ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 6, flexShrink: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
          {isToday(new Date(selected + 'T12:00:00'))
            ? 'Today'
            : format(new Date(selected + 'T12:00:00'), 'EEE, MMM d')}
        </span>
      </div>

      {/* ── Editor ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <div style={{ height: '100%', overflowY: 'auto' }}>
            <JournalEditor
              key={selected}
              content={content}
              onChange={handleChange}
              date={selected}
            />
          </div>
        )}
      </div>
    </div>
  )
}
