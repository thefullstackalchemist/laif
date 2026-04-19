'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import FloatingChat from '@/components/chat/FloatingChat'
import { useItems } from '@/hooks/useItems'
import type { CalView } from '@/components/calendar/CalendarView'
import { format, addDays, subDays, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, BookOpen, CalendarDays } from 'lucide-react'

// Tiptap uses browser APIs — load client-side only
const JournalEditor = dynamic(
  () => import('@/components/journal/JournalEditor'),
  { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading editor…</div> }
)

function toDateStr(d: Date) {
  return format(d, 'yyyy-MM-dd')
}

const AUTOSAVE_MS = 1500

export default function JournalPage() {
  const { silentRefresh } = useItems()
  const [date, setDate]       = useState<Date>(new Date())
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [dirty, setDirty]     = useState(false)
  const saveTimer             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dateStr               = toDateStr(date)

  // Load entry when date changes
  useEffect(() => {
    setLoading(true)
    setContent('')
    setDirty(false)
    fetch(`/api/journal?date=${dateStr}`)
      .then(r => r.json())
      .then(data => setContent(data.content ?? ''))
      .catch(() => setContent(''))
      .finally(() => setLoading(false))
  }, [dateStr])

  // Auto-save with debounce
  const save = useCallback(async (json: string) => {
    setSaving(true)
    try {
      await fetch('/api/journal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, content: json }),
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [dateStr])

  function handleChange(json: string) {
    setContent(json)
    setDirty(true)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(json), AUTOSAVE_MS)
  }

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const formattedDate = isToday(date)
    ? `Today, ${format(date, 'MMMM d')}`
    : format(date, 'EEEE, MMMM d, yyyy')

  return (
    <>
    <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center gap-3 px-6 py-3"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <BookOpen size={14} style={{ color: 'var(--accent-light)' }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Journal</span>

          {/* Date nav */}
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={() => setDate(d => subDays(d, 1))}
              className="btn-ghost p-1.5"
              title="Previous day"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-medium px-1 min-w-[200px] text-center" style={{ color: 'var(--text-1)' }}>
              {formattedDate}
            </span>
            <button
              onClick={() => setDate(d => addDays(d, 1))}
              className="btn-ghost p-1.5"
              disabled={isToday(date)}
              title="Next day"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Today shortcut */}
          {!isToday(date) && (
            <button
              onClick={() => setDate(new Date())}
              className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs"
            >
              <CalendarDays size={12} />
              Today
            </button>
          )}

          {/* Save indicator */}
          <div className="ml-auto flex items-center gap-2">
            {saving && (
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saving…</span>
            )}
            {!saving && !dirty && content && (
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Saved</span>
            )}
          </div>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10">
            {loading ? (
              <div className="flex items-center gap-2" style={{ color: 'var(--text-3)', fontSize: 14 }}>
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                Loading…
              </div>
            ) : (
              <JournalEditor
                key={dateStr}
                content={content}
                onChange={handleChange}
                date={dateStr}
              />
            )}
          </div>
        </div>
      </main>
    <FloatingChat onRefreshItems={silentRefresh} />
    </>
  )
}
