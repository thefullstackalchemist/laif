'use client'
import { motion } from 'framer-motion'
import { format, isSameMonth, isToday, isWeekend } from 'date-fns'
import { cn, getCalendarDays, getItemsForDay, ITEM_COLORS, ITEM_BG } from '@/lib/utils'
import type { AnyItem } from '@/types'
import { Calendar, CheckSquare, Bell } from 'lucide-react'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const ICONS = { event: Calendar, task: CheckSquare, reminder: Bell }

interface MonthGridProps {
  year: number
  month: number
  items: AnyItem[]
  onDayClick?: (date: Date) => void
  onItemClick?: (item: AnyItem) => void
}

export default function MonthGrid({ year, month, items, onDayClick, onItemClick }: MonthGridProps) {
  const days = getCalendarDays(year, month)

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border)' }}>
        {DAY_HEADERS.map((d, i) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold tracking-wider"
            style={{ color: i === 0 || i === 6 ? 'var(--text-3)' : 'var(--text-3)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div
        className="flex-1 grid grid-cols-7"
        style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))` }}
      >
        {days.map((day, idx) => {
          const dayItems = getItemsForDay(items, day)
          const inMonth  = isSameMonth(day, new Date(year, month))
          const today    = isToday(day)
          const weekend  = isWeekend(day)
          const visible  = dayItems.slice(0, 3)
          const overflow = dayItems.length - 3

          return (
            <div
              key={idx}
              onClick={() => onDayClick?.(day)}
              className={cn(
                'relative p-1.5 cursor-pointer overflow-hidden cal-day-cell',
                today && 'cal-day-today',
                !today && weekend && inMonth && 'cal-day-weekend',
                !today && !inMonth && 'cal-day-out',
              )}
              style={{
                borderRight:  idx % 7 !== 6 ? '1px solid var(--cal-col-border)' : undefined,
                borderBottom: idx < days.length - 7 ? '1px solid var(--cal-col-border)' : undefined,
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              {/* Date number */}
              <div className="flex items-start justify-end mb-1">
                <span
                  className={cn(
                    'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  )}
                  style={
                    today
                      ? { background: 'linear-gradient(135deg, var(--accent), #06b6d4)', color: '#fff', boxShadow: '0 0 10px var(--accent-glow)' }
                      : { color: inMonth ? 'var(--text-1)' : 'var(--text-3)' }
                  }
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const Icon = ICONS[item.type]
                  return (
                    <motion.button
                      key={item._id}
                      whileHover={{ scale: 1.02 }}
                      onClick={(e) => { e.stopPropagation(); onItemClick?.(item) }}
                      className="item-pill w-full text-left"
                      style={{ background: ITEM_BG[item.type], color: ITEM_COLORS[item.type] }}
                    >
                      <Icon size={10} className="flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </motion.button>
                  )
                })}
                {overflow > 0 && (
                  <p className="text-xs pl-1" style={{ color: 'var(--text-3)' }}>+{overflow} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
