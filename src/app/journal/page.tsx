'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import FloatingChat from '@/components/chat/FloatingChat'
import AddItemModal from '@/components/modals/AddItemModal'
import { useItems } from '@/hooks/useItems'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isToday, isSameMonth, parseISO,
  startOfWeek, endOfWeek, subDays,
} from 'date-fns'
import {
  BookOpen, ChevronLeft, ChevronRight, CalendarDays, PenLine,
  Loader2, Sparkles, Plus, RefreshCw,
} from 'lucide-react'

const JournalEditor = dynamic(
  () => import('@/components/journal/JournalEditor'),
  { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading editor…</div> }
)

const AUTOSAVE_MS = 1500
const EMPTY_DOC   = '{"type":"doc","content":[{"type":"paragraph"}]}'

export default function JournalPage() {
  const { silentRefresh, addItem } = useItems()

  // ── Selected date ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [calMonth,     setCalMonth]     = useState(new Date())
  const today = format(new Date(), 'yyyy-MM-dd')

  // ── Entry dates (for calendar dots) ───────────────────────────────────────
  const [entryDates, setEntryDates] = useState<Set<string>>(new Set())

  // ── Editor state ───────────────────────────────────────────────────────────
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [dirty,    setDirty]    = useState(false)
  const [hasEntry, setHasEntry] = useState(false)
  const [started,  setStarted]  = useState(false)
  const saveTimer         = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks dates where a summary fetch has already been initiated this session
  // so navigating away and back doesn't re-trigger the AI call before the DB write lands
  const summaryFetchedRef = useRef<Set<string>>(new Set())

  // ── AI summary state ───────────────────────────────────────────────────────
  const [summary,        setSummary]        = useState('')
  const [summaryTodos,   setSummaryTodos]   = useState<string[]>([])
  const [todayItems,     setTodayItems]     = useState<string[]>([])
  const [summaryLoading, setSummaryLoading] = useState(false)

  // ── Task modal ─────────────────────────────────────────────────────────────
  const [taskModalOpen,  setTaskModalOpen]  = useState(false)
  const [taskModalTitle, setTaskModalTitle] = useState('')

  // ── Load all entry dates on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch('/api/journal')
      .then(r => r.json())
      .then(({ dates }: { dates: string[] }) => setEntryDates(new Set(dates)))
      .catch(() => {})
  }, [])

  // ── Fetch AI summary for yesterday → save to today ────────────────────────
  const fetchSummary = useCallback(async (todayDate: string) => {
    setSummaryLoading(true)
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/journal/summarize?date=${yesterday}&today=${todayDate}`)
      if (!res.ok) return
      const { summary: s, todos: t, today: ti } = await res.json()
      setSummary(s ?? '')
      setSummaryTodos(Array.isArray(t)  ? t  : [])
      setTodayItems(Array.isArray(ti) ? ti : [])
    } catch { /* ignore */ } finally {
      setSummaryLoading(false)
    }
  }, [])

  // ── Load entry when date changes ──────────────────────────────────────────
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setContent('')
    setDirty(false)
    setHasEntry(false)
    setStarted(false)
    setLoading(true)
    setSummary('')
    setSummaryTodos([])
    setTodayItems([])

    fetch(`/api/journal?date=${selectedDate}`)
      .then(r => r.json())
      .then(({ content: c, last_summary: ls, summary_todos: st, today_items: ti, summary_fetched: sf }: {
        content: string; last_summary: string; summary_todos: string[]
        today_items: string[]; summary_fetched: boolean
      }) => {
        const filled = !!c && c !== EMPTY_DOC
        setContent(c ?? '')
        setHasEntry(filled)
        setSummary(ls ?? '')
        setSummaryTodos(Array.isArray(st) ? st : [])
        setTodayItems(Array.isArray(ti) ? ti : [])

        // Only call AI if DB says it hasn't run AND this session hasn't already initiated it
        if (!sf && selectedDate === today && !summaryFetchedRef.current.has(selectedDate)) {
          summaryFetchedRef.current.add(selectedDate)
          fetchSummary(selectedDate)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedDate, today, fetchSummary])

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

  const showEditor    = hasEntry || started
  const formattedDate = isToday(parseISO(selectedDate))
    ? `Today — ${format(parseISO(selectedDate), 'MMMM d, yyyy')}`
    : format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')

  const hasSummary = summary || summaryTodos.length > 0 || todayItems.length > 0

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <main className="flex-1 flex overflow-hidden gap-2 h-full p-3">

        {/* ── Left panel: calendar + AI summary ──────────────────────────── */}
        <div
          className="flex-shrink-0 flex flex-col overflow-hidden rounded-2xl"
          style={{
            width: '28%',
            minWidth: 220,
            maxWidth: 380,
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
            {selectedDate !== today && (
              <button
                onClick={() => { setSelectedDate(today); setCalMonth(new Date()) }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors hover:opacity-80"
                style={{ background: 'var(--accent)', color: 'white' }}
                title="Jump to today"
              >
                <CalendarDays size={10} />
                Today
              </button>
            )}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Calendar ─────────────────────────────────────────────── */}
            <div className="px-3 py-3">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCalMonth(m => subMonths(m, 1))} className="btn-ghost p-1">
                  <ChevronLeft size={13} />
                </button>
                <span className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                  {format(calMonth, 'MMMM yyyy')}
                </span>
                <button onClick={() => setCalMonth(m => addMonths(m, 1))} className="btn-ghost p-1">
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map(day => {
                  const ds       = format(day, 'yyyy-MM-dd')
                  const inMonth  = isSameMonth(day, calMonth)
                  const todayDay = isToday(day)
                  const isActive = ds === selectedDate
                  const hasEnt   = entryDates.has(ds)

                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDate(ds)}
                      className="relative flex flex-col items-center justify-center rounded-lg py-1 transition-colors"
                      style={{
                        fontSize:   11,
                        color:      !inMonth ? 'var(--text-3)' : isActive ? 'white' : 'var(--text-2)',
                        background: isActive
                          ? 'var(--accent)'
                          : todayDay && !isActive
                            ? 'var(--accent-muted)'
                            : 'transparent',
                        fontWeight: todayDay ? 700 : 400,
                      }}
                    >
                      {format(day, 'd')}
                      {hasEnt && !isActive && (
                        <span
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ background: 'var(--accent)' }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Entry count */}
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

            {/* ── AI Summary ───────────────────────────────────────────── */}
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {/* Section header */}
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <Sparkles size={12} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                <span className="text-xs font-semibold flex-1 tracking-wider" style={{ color: 'var(--text-3)' }}>
                  YESTERDAY'S RECAP
                </span>
                {selectedDate === today && !summaryLoading && (
                  <button
                    onClick={() => {
                    summaryFetchedRef.current.add(selectedDate)
                    fetchSummary(selectedDate)
                  }}
                    title="Refresh summary"
                    className="p-1 rounded hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-3)' }}
                  >
                    <RefreshCw size={10} />
                  </button>
                )}
              </div>

              <div className="px-3 pb-4">
                {summaryLoading ? (
                  <div className="flex items-center gap-2 py-3" style={{ color: 'var(--text-3)' }}>
                    <Loader2 size={12} className="animate-spin flex-shrink-0" />
                    <span className="text-xs">Summarising yesterday…</span>
                  </div>
                ) : !hasSummary ? (
                  <p className="text-xs py-2" style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
                    {selectedDate === today
                      ? 'No entry for yesterday to summarise.'
                      : 'No summary available.'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Summary text */}
                    {summary && (
                      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                        {summary}
                      </p>
                    )}

                    {/* Today's focus — highlighted */}
                    {todayItems.length > 0 && (
                      <div
                        className="flex flex-col gap-1.5 rounded-xl p-2.5"
                        style={{
                          background: 'rgba(var(--accent-rgb, 99,102,241), 0.1)',
                          border: '1px solid rgba(var(--accent-rgb, 99,102,241), 0.25)',
                        }}
                      >
                        <span className="text-xs font-semibold tracking-wider" style={{ color: 'var(--accent-light)' }}>
                          TODAY'S FOCUS
                        </span>
                        {todayItems.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span
                              className="flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--accent)', marginTop: 4 }}
                            />
                            <div className="flex items-start gap-1.5 flex-1 min-w-0">
                              <span className="text-xs leading-snug flex-1" style={{ color: 'var(--text-1)', fontWeight: 500 }}>
                                {item}
                              </span>
                              <button
                                onClick={() => { setTaskModalTitle(item); setTaskModalOpen(true) }}
                                title="Add as task"
                                className="flex-shrink-0 flex items-center justify-center rounded-md transition-all hover:opacity-80"
                                style={{ width: 18, height: 18, background: 'var(--accent)', color: 'white', marginTop: 1 }}
                              >
                                <Plus size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Carry-forward todos */}
                    {summaryTodos.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-3)' }}>
                          CARRY FORWARD
                        </span>
                        {summaryTodos.map((todo, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5"
                            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
                          >
                            <span className="text-xs flex-1 leading-snug" style={{ color: 'var(--text-2)' }}>
                              {todo}
                            </span>
                            <button
                              onClick={() => { setTaskModalTitle(todo); setTaskModalOpen(true) }}
                              title="Add as task"
                              className="flex-shrink-0 flex items-center justify-center rounded-md transition-all hover:opacity-80"
                              style={{ width: 20, height: 20, background: 'var(--accent)', color: 'white' }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
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
              <div
                className="flex-1 flex flex-col overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--surface)',
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
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

      {/* Task creation modal — pre-filled from AI suggestion */}
      <AddItemModal
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setTaskModalTitle('') }}
        onAdd={async (type, data) => { await addItem(type as any, data as any); silentRefresh() }}
        defaultType="task"
        defaultTitle={taskModalTitle}
      />
    </>
  )
}
