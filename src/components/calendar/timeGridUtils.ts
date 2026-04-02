import { parseISO, isSameDay } from 'date-fns'
import type { AnyItem } from '@/types'

export const HOUR_HEIGHT = 64          // px per hour
export const PX_PER_MIN = HOUR_HEIGHT / 60
export const SNAP_MIN = 15             // drag snaps to 15-min increments

export interface DragState {
  colIndex: number
  startMin: number
  endMin: number
}

export function minutesToPx(min: number): number {
  return min * PX_PER_MIN
}

export function pxToSnappedMin(px: number): number {
  const raw = px / PX_PER_MIN
  return Math.round(raw / SNAP_MIN) * SNAP_MIN
}

export function minToTimeStr(min: number): string {
  const h = Math.floor(min / 60) % 24
  const m = min % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Returns start minute-of-day (0–1439) or -1 if no valid time */
export function getItemStartMin(item: AnyItem): number {
  const dt = 'startTime' in item ? item.startTime
           : 'dueDate'   in item ? item.dueDate
           : 'remindAt'  in item ? item.remindAt
           : undefined
  if (!dt) return -1
  try {
    const d = typeof dt === 'string' ? parseISO(dt) : new Date(dt as string)
    if (isNaN(d.getTime())) return -1
    return d.getHours() * 60 + d.getMinutes()
  } catch { return -1 }
}

/** Returns end minute-of-day. Falls back to startMin + 60 for events, +30 otherwise */
export function getItemEndMin(item: AnyItem): number {
  if (item.type === 'event' && 'endTime' in item && item.endTime) {
    try {
      const d = typeof item.endTime === 'string' ? parseISO(item.endTime) : new Date(item.endTime as string)
      if (!isNaN(d.getTime())) return d.getHours() * 60 + d.getMinutes()
    } catch { /* fall through */ }
  }
  const start = getItemStartMin(item)
  return start < 0 ? -1 : start + (item.type === 'event' ? 60 : 30)
}

export function getItemsForDay(items: AnyItem[], day: Date): AnyItem[] {
  return items.filter(item => {
    const dt = 'startTime' in item ? item.startTime
             : 'dueDate'   in item ? item.dueDate
             : 'remindAt'  in item ? item.remindAt
             : undefined
    if (!dt) return false
    try {
      const d = typeof dt === 'string' ? parseISO(dt) : new Date(dt as string)
      return isSameDay(d, day)
    } catch { return false }
  })
}

/**
 * Greedy column-assignment for overlapping items.
 * Returns each item with its assigned column index and total columns in that overlap group.
 */
export function layoutItems(items: AnyItem[]): Array<{ item: AnyItem; col: number; totalCols: number }> {
  // Sort by start time
  const sorted = [...items]
    .filter(i => getItemStartMin(i) >= 0)
    .sort((a, b) => getItemStartMin(a) - getItemStartMin(b))

  type Entry = { item: AnyItem; col: number; endMin: number }
  const placed: Entry[] = []
  const cols: number[] = [] // tracks endMin per column

  for (const item of sorted) {
    const start = getItemStartMin(item)
    const end   = getItemEndMin(item)

    // Find the first free column
    let c = cols.findIndex(endMin => endMin <= start)
    if (c === -1) { c = cols.length; cols.push(end) }
    else cols[c] = end

    placed.push({ item, col: c, endMin: end })
  }

  const totalCols = cols.length || 1

  // For each item, compute totalCols as the max cols of overlapping items
  return placed.map(({ item, col }) => {
    const s = getItemStartMin(item)
    const e = getItemEndMin(item)
    // How many other items overlap this one?
    const overlapping = placed.filter(p => {
      const ps = getItemStartMin(p.item)
      const pe = getItemEndMin(p.item)
      return ps < e && pe > s
    })
    const maxCol = overlapping.reduce((m, p) => Math.max(m, p.col), 0)
    return { item, col, totalCols: maxCol + 1 }
  })
}
