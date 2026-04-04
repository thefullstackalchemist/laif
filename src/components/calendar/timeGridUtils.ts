import { isSameDay } from 'date-fns'
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

/** Get the relevant date string from any item type */
function getDateStr(item: AnyItem): string {
  if (item.type === 'event')    return item.startDate
  if (item.type === 'task')     return item.dueDate ?? ''
  if (item.type === 'reminder') return item.reminderDate
  return ''
}

/**
 * Convert an ISO date string to local minute-of-day (0–1439).
 * Uses new Date() so it respects the browser's local timezone (IST, etc.)
 */
function isoToLocalMin(isoStr: string): number {
  const d = new Date(isoStr)
  if (isNaN(d.getTime())) return -1
  return d.getHours() * 60 + d.getMinutes()
}

/** Returns start minute-of-day in local time, or -1 if no valid date */
export function getItemStartMin(item: AnyItem): number {
  const dt = getDateStr(item)
  if (!dt) return -1
  try { return isoToLocalMin(dt) } catch { return -1 }
}

/** Returns end minute-of-day in local time. Falls back to start + 60 (event) or +30 */
export function getItemEndMin(item: AnyItem): number {
  if (item.type === 'event' && item.endDate) {
    try {
      const m = isoToLocalMin(item.endDate)
      if (m >= 0) return m
    } catch { /* fall through */ }
  }
  const start = getItemStartMin(item)
  return start < 0 ? -1 : start + (item.type === 'event' ? 60 : 30)
}

/** Filter items that fall on a given calendar day (local timezone) */
export function getItemsForDay(items: AnyItem[], day: Date): AnyItem[] {
  return items.filter(item => {
    const dt = getDateStr(item)
    if (!dt) return false
    try {
      return isSameDay(new Date(dt), day)
    } catch { return false }
  })
}

/**
 * Greedy column-assignment for overlapping items.
 * Returns each item with its assigned column index and total columns in that overlap group.
 */
export function layoutItems(items: AnyItem[]): Array<{ item: AnyItem; col: number; totalCols: number }> {
  const sorted = [...items]
    .filter(i => getItemStartMin(i) >= 0)
    .sort((a, b) => getItemStartMin(a) - getItemStartMin(b))

  type Entry = { item: AnyItem; col: number; endMin: number }
  const placed: Entry[] = []
  const cols: number[] = []

  for (const item of sorted) {
    const start = getItemStartMin(item)
    const end   = getItemEndMin(item)

    let c = cols.findIndex(endMin => endMin <= start)
    if (c === -1) { c = cols.length; cols.push(end) }
    else cols[c] = end

    placed.push({ item, col: c, endMin: end })
  }

  return placed.map(({ item, col }) => {
    const s = getItemStartMin(item)
    const e = getItemEndMin(item)
    const overlapping = placed.filter(p => {
      const ps = getItemStartMin(p.item)
      const pe = getItemEndMin(p.item)
      return ps < e && pe > s
    })
    const maxCol = overlapping.reduce((m, p) => Math.max(m, p.col), 0)
    return { item, col, totalCols: maxCol + 1 }
  })
}
