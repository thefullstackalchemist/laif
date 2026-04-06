'use client'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { Calendar, CheckSquare, Bell } from 'lucide-react'
import { ITEM_COLORS } from '@/lib/utils'
import type { AnyItem, CalendarEvent } from '@/types'
import {
  HOUR_HEIGHT, PX_PER_MIN, SNAP_MIN,
  minutesToPx, pxToSnappedMin, minToTimeStr,
  getItemStartMin, getItemEndMin, getItemsForDay, layoutItems,
  type DragState,
} from './timeGridUtils'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const ICONS = { event: Calendar, task: CheckSquare, reminder: Bell }

interface ItemDrag {
  mode: 'move' | 'resize'
  item: AnyItem
  colIndex: number
  startMinOrig: number
  endMinOrig: number
  anchorPageY: number
  curStartMin: number
  curEndMin: number
}

interface WeekViewProps {
  date: Date
  items: AnyItem[]
  onItemClick?: (item: AnyItem) => void
  onNewItem?: (start: Date, end: Date) => void
  onUpdateItem?: (type: AnyItem['type'], id: string, data: Partial<AnyItem>) => void
}

export default function WeekView({ date, items, onItemClick, onNewItem, onUpdateItem }: WeekViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 })
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [date])

  const scrollRef    = useRef<HTMLDivElement>(null)
  const gridRef      = useRef<HTMLDivElement>(null)
  const dragRef      = useRef<DragState | null>(null)       // new-event drag
  const itemDragRef  = useRef<ItemDrag | null>(null)        // item move/resize drag
  const didItemDrag  = useRef(false)

  const [dragDisplay,     setDragDisplay]     = useState<DragState | null>(null)
  const [itemDragDisplay, setItemDragDisplay] = useState<ItemDrag | null>(null)
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
    // ── New-event drag ──────────────────────────────────────
    if (dragRef.current && gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect()
      const y = Math.max(0, Math.min(e.clientY - rect.top, HOURS.length * HOUR_HEIGHT))
      const snapped = Math.max(dragRef.current.startMin + SNAP_MIN, pxToSnappedMin(y))
      dragRef.current = { ...dragRef.current, endMin: snapped }
      setDragDisplay({ ...dragRef.current })
      return
    }
    // ── Item move / resize ──────────────────────────────────
    if (!itemDragRef.current) return
    const d = itemDragRef.current
    const rawDeltaMin = (e.clientY - d.anchorPageY) / PX_PER_MIN
    const deltaMin = Math.round(rawDeltaMin / SNAP_MIN) * SNAP_MIN
    if (Math.abs(deltaMin) >= SNAP_MIN) didItemDrag.current = true

    let updated: ItemDrag
    if (d.mode === 'move') {
      const dur = d.endMinOrig - d.startMinOrig
      let newStart = Math.round((d.startMinOrig + rawDeltaMin) / SNAP_MIN) * SNAP_MIN
      newStart = Math.max(0, Math.min(newStart, 24 * 60 - dur))
      updated = { ...d, curStartMin: newStart, curEndMin: newStart + dur }
    } else {
      let newEnd = Math.round((d.endMinOrig + rawDeltaMin) / SNAP_MIN) * SNAP_MIN
      newEnd = Math.max(d.startMinOrig + SNAP_MIN, Math.min(newEnd, 24 * 60))
      updated = { ...d, curEndMin: newEnd }
    }
    itemDragRef.current = updated
    setItemDragDisplay(updated)
  }, [])

  const onMouseUp = useCallback(() => {
    // ── New-event drag ──────────────────────────────────────
    const d = dragRef.current
    if (d && d.endMin > d.startMin + SNAP_MIN && onNewItem) {
      const day = days[d.colIndex]
      const start = new Date(day); start.setHours(Math.floor(d.startMin / 60), d.startMin % 60, 0, 0)
      const end   = new Date(day); end.setHours(Math.floor(d.endMin / 60), d.endMin % 60, 0, 0)
      onNewItem(start, end)
    }
    dragRef.current = null
    setDragDisplay(null)

    // ── Item move / resize ──────────────────────────────────
    const id = itemDragRef.current
    if (id && didItemDrag.current && onUpdateItem && id.item._id) {
      const day = days[id.colIndex]
      const toISO = (min: number) => {
        const d = new Date(day); d.setHours(Math.floor(min / 60), min % 60, 0, 0); return d.toISOString()
      }
      if (id.mode === 'move') {
        if (id.item.type === 'event') {
          onUpdateItem('event', id.item._id, { startDate: toISO(id.curStartMin), endDate: toISO(id.curEndMin) } as Partial<AnyItem>)
        } else if (id.item.type === 'task') {
          onUpdateItem('task', id.item._id, { dueDate: toISO(id.curStartMin) } as Partial<AnyItem>)
        } else {
          onUpdateItem('reminder', id.item._id, { reminderDate: toISO(id.curStartMin) } as Partial<AnyItem>)
        }
      } else if (id.mode === 'resize' && id.item.type === 'event') {
        onUpdateItem('event', id.item._id, { endDate: toISO(id.curEndMin) } as Partial<AnyItem>)
      }
    }
    itemDragRef.current = null
    setItemDragDisplay(null)
    // reset after a tick so click handler can read it
    setTimeout(() => { didItemDrag.current = false }, 0)
  }, [days, onNewItem, onUpdateItem])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function startNewEventDrag(e: React.MouseEvent, colIndex: number) {
    if ((e.target as HTMLElement).closest('[data-cal-item]')) return
    if (!gridRef.current) return
    e.preventDefault()
    const rect = gridRef.current.getBoundingClientRect()
    const y = Math.max(0, e.clientY - rect.top)
    const snapped = pxToSnappedMin(y)
    dragRef.current = { colIndex, startMin: snapped, endMin: snapped + SNAP_MIN }
    setDragDisplay({ ...dragRef.current })
  }

  function startItemMove(e: React.MouseEvent, item: AnyItem, colIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    const startMin = getItemStartMin(item)
    const endMin   = getItemEndMin(item)
    if (startMin < 0) return
    didItemDrag.current = false
    const drag: ItemDrag = { mode: 'move', item, colIndex, startMinOrig: startMin, endMinOrig: endMin, anchorPageY: e.clientY, curStartMin: startMin, curEndMin: endMin }
    itemDragRef.current = drag
    setItemDragDisplay(drag)
  }

  function startItemResize(e: React.MouseEvent, item: AnyItem, colIndex: number) {
    e.preventDefault()
    e.stopPropagation()
    const startMin = getItemStartMin(item)
    const endMin   = getItemEndMin(item)
    if (startMin < 0) return
    didItemDrag.current = false
    const drag: ItemDrag = { mode: 'resize', item, colIndex, startMinOrig: startMin, endMinOrig: endMin, anchorPageY: e.clientY, curStartMin: startMin, curEndMin: endMin }
    itemDragRef.current = drag
    setItemDragDisplay(drag)
  }

  const draggingId = itemDragDisplay?.item._id

  return (
    <div className="flex flex-col h-full select-none">
      {/* Sticky day headers */}
      <div
        className="flex flex-shrink-0 z-10"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--cal-header-bg)' }}
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
                style={isToday(day) ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-1)' }}
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
          <div className="w-14 flex-shrink-0 relative border-r" style={{ borderColor: 'var(--cal-col-border)' }}>
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-right pointer-events-none"
                style={{ top: h * HOUR_HEIGHT - 8, lineHeight: 1 }}
              >
                <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 500 }}>
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
                onMouseDown={e => startNewEventDrag(e, colIndex)}
              >
                {/* Hour rows */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full pointer-events-none"
                    style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
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
                  const origStart = getItemStartMin(item)
                  const origEnd   = getItemEndMin(item)
                  if (origStart < 0) return null

                  const isThisDragging = draggingId === item._id
                  const startMin = isThisDragging ? itemDragDisplay!.curStartMin : origStart
                  const endMin   = isThisDragging ? itemDragDisplay!.curEndMin   : origEnd

                  const dur    = endMin - startMin
                  const height = Math.max(dur * PX_PER_MIN - 2, 22)
                  const left   = `calc(${(col / totalCols) * 100}% + 2px)`
                  const width  = `calc(${(1 / totalCols) * 100}% - 4px)`
                  const color  = ITEM_COLORS[item.type]
                  const Icon   = ICONS[item.type]
                  const short  = height < 38
                  const isEvent = item.type === 'event'

                  return (
                    <div
                      key={item._id}
                      data-cal-item
                      className="absolute text-left overflow-hidden rounded-lg"
                      style={{
                        top: minutesToPx(startMin) + 1,
                        height,
                        left,
                        width,
                        background: `${color}22`,
                        borderLeft: `3px solid ${color}`,
                        padding: short ? '2px 5px' : '4px 6px',
                        zIndex: isThisDragging ? 50 : 10,
                        cursor: isThisDragging ? 'grabbing' : 'grab',
                        boxShadow: isThisDragging ? `0 4px 16px rgba(0,0,0,0.25)` : `0 1px 4px rgba(0,0,0,0.12)`,
                        transition: isThisDragging ? 'none' : 'box-shadow 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseDown={e => startItemMove(e, item, colIndex)}
                      onClick={() => { if (!didItemDrag.current) onItemClick?.(item) }}
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
                          {isEvent ? ` – ${minToTimeStr(endMin)}` : ''}
                        </p>
                      )}
                      {/* Resize handle — events only */}
                      {isEvent && height > 28 && (
                        <div
                          title="Drag to resize"
                          style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 8,
                            cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseDown={e => startItemResize(e, item, colIndex)}
                        >
                          <div style={{ width: 24, height: 2, borderRadius: 1, background: color, opacity: 0.5 }} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* New-event drag selection */}
                {dragDisplay?.colIndex === colIndex && (
                  <div
                    className="absolute left-0.5 right-0.5 rounded-xl pointer-events-none z-30"
                    style={{
                      top: minutesToPx(Math.min(dragDisplay.startMin, dragDisplay.endMin)),
                      height: Math.max(Math.abs(dragDisplay.endMin - dragDisplay.startMin) * PX_PER_MIN, SNAP_MIN * PX_PER_MIN),
                      background: 'var(--accent-dim)',
                      border: '2px solid var(--accent)',
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

      {/* Drag time tooltip */}
      {itemDragDisplay && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold pointer-events-none z-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {itemDragDisplay.mode === 'move'
            ? `${minToTimeStr(itemDragDisplay.curStartMin)} – ${minToTimeStr(itemDragDisplay.curEndMin)}`
            : `Ends ${minToTimeStr(itemDragDisplay.curEndMin)}`}
        </div>
      )}
    </div>
  )
}
