'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { Calendar, CheckSquare, Bell } from 'lucide-react'
import { ITEM_COLORS } from '@/lib/utils'
import type { AnyItem } from '@/types'
import {
  HOUR_HEIGHT, PX_PER_MIN, SNAP_MIN,
  minutesToPx, pxToSnappedMin, minToTimeStr,
  getItemStartMin, getItemEndMin, getItemsForDay, layoutItems,
  type DragState,
} from './timeGridUtils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const ICONS = { event: Calendar, task: CheckSquare, reminder: Bell }

interface WeekViewProps {
  date: Date
  items: AnyItem[]
  onItemClick?: (item: AnyItem) => void
  onNewItem?: (start: Date, end: Date) => void
}

export default function WeekView({ date, items, onItemClick, onNewItem }: WeekViewProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const scrollRef = useRef<HTMLDivElement>(null)
  const gridRef  = useRef<HTMLDivElement>(null)
  const dragRef  = useRef<DragState | null>(null)
  const [dragDisplay, setDragDisplay] = useState<DragState | null>(null)
  const [currentMin, setCurrentMin] = useState(() => {
    const n = new Date(); return n.getHours() * 60 + n.getMinutes()
  })

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = Math.max(0, minutesToPx(currentMin) - 220)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date(); setCurrentMin(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !gridRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * HOUR_HEIGHT))
    const snapped = Math.max(dragRef.current.startMin + SNAP_MIN, pxToSnappedMin(y))
    dragRef.current = { ...dragRef.current, endMin: snapped }
    setDragDisplay({ ...dragRef.current })
  }, [])

  const onMouseUp = useCallback(() => {
    const d = dragRef.current
    if (d && d.endMin > d.startMin + SNAP_MIN && onNewItem) {
      const day = days[d.colIndex]
      const start = new Date(day)
      start.setHours(Math.floor(d.startMin / 60), d.startMin % 60, 0, 0)
      const end = new Date(day)
      end.setHours(Math.floor(d.endMin / 60), d.endMin % 60, 0, 0)
      onNewItem(start, end)
    }
    dragRef.current = null
    setDragDisplay(null)
  }, [days, onNewItem])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function startDrag(e: React.MouseEvent, colIndex: number) {
    if ((e.target as HTMLElement).closest('[data-cal-item]')) return
    if (!gridRef.current) return
    e.preventDefault()
    const rect = gridRef.current.getBoundingClientRect()
    const y = Math.max(0, e.clientY - rect.top)
    const snapped = pxToSnappedMin(y)
    dragRef.current = { colIndex, startMin: snapped, endMin: snapped + SNAP_MIN }
    setDragDisplay({ ...dragRef.current })
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* Sticky day headers */}
      <div
        className="flex flex-shrink-0 z-10"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--cal-header-bg)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="w-14 flex-shrink-0 border-r" style={{ borderColor: 'var(--cal-col-border)' }} />
        {days.map(day => (
          <div
            key={day.toISOString()}
            className="flex-1 py-3 text-center border-r last:border-0"
            style={{ borderColor: 'var(--cal-col-border)' }}
          >
            <p className="text-xs font-semibold tracking-widest" style={{ color: 'var(--text-3)' }}>
              {format(day, 'EEE').toUpperCase()}
            </p>
            <div className="flex items-center justify-center mt-1.5">
              <span
                className="w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full"
                style={isToday(day)
                  ? { background: 'linear-gradient(135deg,var(--accent),#06b6d4)', color: '#fff', boxShadow: '0 0 16px var(--accent-glow)' }
                  : { color: 'var(--text-1)' }}
              >
                {format(day, 'd')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div ref={gridRef} className="flex" style={{ height: HOURS.length * HOUR_HEIGHT, position: 'relative' }}>

          {/* Time gutter */}
          <div
            className="w-14 flex-shrink-0 relative border-r"
            style={{ borderColor: 'var(--cal-col-border)' }}
          >
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-right pointer-events-none"
                style={{ top: h * HOUR_HEIGHT - 8, lineHeight: 1 }}
              >
                <span className="text-xs font-medium" style={{ color: 'var(--text-3)', fontSize: 11 }}>
                  {h === 0 ? '' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, colIndex) => {
            const dayItems = getItemsForDay(items, day)
            const laid = layoutItems(dayItems)

            return (
              <div
                key={day.toISOString()}
                data-col
                className="flex-1 relative border-r last:border-0"
                style={{
                  borderColor: 'var(--cal-col-border)',
                  background: isToday(day) ? 'var(--cal-today-bg)' : undefined,
                  cursor: 'crosshair',
                }}
                onMouseDown={e => startDrag(e, colIndex)}
              >
                {/* Hour rows */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, pointerEvents: 'none' }}
                  >
                    <div style={{ borderTop: '1px solid var(--cal-row-border)', height: HOUR_HEIGHT / 2 }} />
                    <div style={{ borderTop: '1px dashed var(--cal-row-border-half)', height: HOUR_HEIGHT / 2 }} />
                  </div>
                ))}

                {/* Current time line */}
                {isToday(day) && (
                  <div
                    className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
                    style={{ top: minutesToPx(currentMin) - 1 }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full -ml-[5px] flex-shrink-0" style={{ background: '#f43f5e' }} />
                    <div className="flex-1 h-[1.5px]" style={{ background: 'rgba(244,63,94,0.7)' }} />
                  </div>
                )}

                {/* Calendar items */}
                {laid.map(({ item, col, totalCols }) => {
                  const startMin = getItemStartMin(item)
                  const endMin   = getItemEndMin(item)
                  if (startMin < 0) return null
                  const dur = endMin - startMin
                  const height = Math.max(dur * PX_PER_MIN - 2, 22)
                  const left = `calc(${(col / totalCols) * 100}% + 2px)`
                  const width = `calc(${(1 / totalCols) * 100}% - 4px)`
                  const color = ITEM_COLORS[item.type]
                  const Icon = ICONS[item.type]
                  const short = height < 38

                  return (
                    <motion.button
                      key={item._id}
                      data-cal-item
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.015, zIndex: 50 }}
                      onClick={() => onItemClick?.(item)}
                      className="absolute text-left overflow-hidden rounded-lg"
                      style={{
                        top: minutesToPx(startMin) + 1,
                        height,
                        left,
                        width,
                        background: `${color}1a`,
                        borderLeft: `3px solid ${color}`,
                        padding: short ? '2px 5px' : '4px 6px',
                        zIndex: 10,
                        boxShadow: `0 1px 4px rgba(0,0,0,0.15)`,
                        cursor: 'pointer',
                      }}
                    >
                      <div className="flex items-center gap-1 truncate">
                        <Icon size={9} style={{ color, flexShrink: 0 }} />
                        <span className="text-xs font-semibold truncate leading-tight" style={{ color }}>
                          {item.title}
                        </span>
                      </div>
                      {!short && (
                        <p className="text-xs mt-0.5 leading-tight" style={{ color, opacity: 0.7 }}>
                          {minToTimeStr(startMin)}
                          {item.type === 'event' ? ` – ${minToTimeStr(endMin)}` : ''}
                        </p>
                      )}
                    </motion.button>
                  )
                })}

                {/* Drag selection */}
                {dragDisplay?.colIndex === colIndex && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-xl pointer-events-none z-30"
                    style={{
                      top: minutesToPx(Math.min(dragDisplay.startMin, dragDisplay.endMin)),
                      height: Math.max(
                        Math.abs(dragDisplay.endMin - dragDisplay.startMin) * PX_PER_MIN,
                        SNAP_MIN * PX_PER_MIN
                      ),
                      background: 'var(--accent-dim)',
                      border: '2px solid var(--accent)',
                      backdropFilter: 'blur(6px)',
                      opacity: 0.85,
                    }}
                  >
                    <div className="px-2 pt-1">
                      <p className="text-xs font-bold leading-tight" style={{ color: 'var(--accent-light)' }}>
                        {minToTimeStr(Math.min(dragDisplay.startMin, dragDisplay.endMin))}
                      </p>
                      <p className="text-xs leading-tight" style={{ color: 'var(--accent)' }}>
                        → {minToTimeStr(Math.max(dragDisplay.startMin, dragDisplay.endMin))}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
