'use client'
import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { AnyItem } from '@/types'
import { getItemDate } from '@/lib/utils'

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface Props { items: AnyItem[] }

export default function MiniCalendarWidget({ items }: Props) {
  const [month, setMonth] = useState(new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(month),   { weekStartsOn: 0 }),
  })

  function hasDot(day: Date) {
    return items.some(item => {
      const d = getItemDate(item)
      return d ? isSameDay(new Date(d), day) : false
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          {format(month, 'MMMM yyyy')}
        </p>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setMonth(m => subMonths(m, 1))} className="btn-ghost p-1">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => setMonth(new Date())} className="btn-ghost px-2 py-1 text-xs">
            Today
          </button>
          <button onClick={() => setMonth(m => addMonths(m, 1))} className="btn-ghost p-1">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center" style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)' }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5 flex-1">
        {days.map(day => {
          const inMonth = isSameMonth(day, month)
          const today   = isToday(day)
          const dot     = hasDot(day)
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-0.5">
              <div
                className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium"
                style={today
                  ? { background: 'var(--accent)', color: '#fff', fontWeight: 700 }
                  : { color: inMonth ? 'var(--text-2)' : 'var(--text-3)' }
                }
              >
                {format(day, 'd')}
              </div>
              {dot && (
                <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: today ? '#fff' : 'var(--accent-light)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
