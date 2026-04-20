'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, isSameMonth, parseISO,
  startOfWeek, endOfWeek,
} from 'date-fns'
import {
  BookOpen, ChevronLeft, ChevronRight, CalendarDays, PenLine, Loader2,
} from 'lucide-react'

const JournalEditor = dynamic(
  () => import('@/components/journal/JournalEditor'),
  { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading editor…</div> }
)

const AUTOSAVE_MS = 1500

export default function JournalPage() {
  const { silentRefresh } = useItems()

  // ── Selected date ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [calMonth, setCalMonth]         = useState(new Date())

  // ── Entry dates (for dots) ─────────────────────────────────────────────────
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set())

  // ── Editor state ───────────────────────────────────────────────────────────
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [hasEntry, setHasEntry] = useState(false)   // does the DB have an entry for this date?
  const [started,  setStarted]  = useState(false)   // user clicked "Start writing" for empty date
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load all entry dates on mount (for calendar dots) ────────────────────
  useEffect(() => {
    fetch('/api/journal')
      .then(r => r.json())
      .then(({ dates }: { dates: string[] }) => setEntryDates(new Set(dates)))
      .catch(() => {})
  }, [])

  // ── Load entry when date changes ──────────────────────────────────────────
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setContent('')
    setDirty(false)
    setHasEntry(false)
    setStarted(false)
    setLoading(true)

    fetch(`/api/journal?date=${selectedDate}`)
      .then(r => r.json())
      .then(({ content: c }: { content: string }) => {
        const filled = !!c && c !== '{"type":"doc","content":[{"type":"paragraph"}]}'
        setContent(c ?? '')
        setHasEntry(filled)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDate])

  // ── Save ───────────────────────────────────────────────────────────────────
  const save = useCallback(async (json: string) => {
    setSaving(true)
    try {
      await fetch('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, content: json }),
      })
      setDirty(false)
      setHasEntry(true)
      setEntryDates(prev => { const n = new Set(prev); n.add(selectedDate); return n })
    } finally {
      setSaving(false)
    }
  }, [selectedDate])

  function handleChange(json: string) {
    setContent(json)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(json), AUTOSAVE_MS)
  }

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calMonth)),
    end:   endOfWeek(endOfMonth(calMonth)),
  })

  const showEditor = hasEntry || started

  const formattedDate = isToday(parseISO(selectedDate))
    ? `Today — ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`
    : format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <main className="flex-1 flex overflow-hidden gap-2 h-full p-3">

        {/* ── Left panel: calendar ────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
          style={{
            width: 240,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <BookOpen size={13} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
            <span className="text-xs font-semibold flex-1 tracking-wider" style={{ color: 'var(--text-3)' }}>
              JOURNAL
            </span>
            {/* Jump to today */}
            {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
              <button
                onClick={() => {
                  const today = format(new Date(), 'yyyy-MM-dd')
                  setSelectedDate(today)
                  setCalMonth(new Date())
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
                style={{ background: 'var(--accent)', color: 'white' }}
                title="Jump to today"
              >
                <CalendarDays size={10} />
                Today
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCalMonth(m => subMonths(m, 1))}
                className="btn-ghost p-1"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                {format(calMonth, 'MMMM yyyy')}
              </span>
              <button
                onClick={() => setCalMonth(m => addMonths(m, 1))}
                className="btn-ghost p-1"
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div
                  key={i}
                  className="text-center"
                  style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-y-1">
              {calDays.map(day => {
                const ds        = format(day, 'yyyy-MM-dd')
                const inMonth   = isSameMonth(day, calMonth)
                const todayDay  = isToday(day)
                const isActive  = ds === selectedDate
                const hasEntry  = entryDates.has(ds)

                return (
                  <button
                    key={ds}
                    onClick={() => setSelectedDate(ds)}
                    className="relative flex flex-col items-center justify-center rounded-lg py-1 transition-colors"
                    style={{
                      fontSize:   11,
                      color:      !inMonth
                        ? 'var(--text-3)'
                        : isActive
                          ? 'white'
                          : 'var(--text-2)',
                      background: isActive
                        ? 'var(--accent)'
                        : todayDay && !isActive
                          ? 'var(--accent-muted)'
                          : 'transparent',
                      fontWeight: todayDay ? 700 : 400,
                    }}
                  >
                    {format(day, 'd')}
                    {hasEntry && !isActive && (
                      <span
                        className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                        style={{ background: 'var(--accent)' }}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Entry count for the month */}
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
                {(() => {
                  const monthStr = format(calMonth, 'yyyy-MM')
                  const count    = Array.from(entryDates).filter(d => d.startsWith(monthStr)).length
                  return count === 0
                    ? 'No entries this month'
                    : `${count} entr${count === 1 ? 'y' : 'ies'} this month`
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right panel: editor ──────────────────────────────────────────── */}
        <div
          className="flex-1 flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {/* Editor header */}
          <div
            className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-1)' }}>
              {formattedDate}
            </span>
            {saving && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={10} className="animate-spin" /> Saving…
              </span>
            )}
            {!saving && !dirty && showEditor && (
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saved</span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={22} className="animate-spin" style={{ color: 'var(--text-3)' }} />
              </div>
            ) : !showEditor ? (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <BookOpen size={36} style={{ color: 'var(--text-3)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  No entry for {isToday(parseISO(selectedDate))
                    ? 'today'
                    : format(parseISO(selectedDate), 'MMMM d, yyyy')}
                </p>
                <button
                  onClick={() => setStarted(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent)', color: 'white' }}
                >
                  <PenLine size={14} />
                  Start writing
                </button>
              </div>
            ) : (
              /* Editor */
              <div
                className="flex-1 flex flex-col overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--surface)',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.06)',
                }}
              >
                <div className="flex-1 overflow-y-auto px-10 py-10">
                  <JournalEditor
                    key={selectedDate}
                    content={content}
                    onChange={handleChange}
                    date={selectedDate}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <FloatingChat onRefreshItems={silentRefresh} />
    </>
  )
}
