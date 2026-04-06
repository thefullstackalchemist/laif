import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import type { AnyItem } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Parse an ISO string to a local Date — use new Date() not parseISO to preserve local timezone */
function toDate(date: string | Date): Date {
  return typeof date === 'string' ? new Date(date) : date
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  return format(toDate(date), fmt)
}

export function formatTime(date: string | Date) {
  return format(toDate(date), 'h:mm a')
}

/** Returns 6-week grid of dates for the given month */
export function getCalendarDays(year: number, month: number): Date[] {
  const first = startOfMonth(new Date(year, month))
  const last = endOfMonth(new Date(year, month))
  const start = startOfWeek(first, { weekStartsOn: 0 })
  const end = endOfWeek(last, { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
}

/** Get the date string used to key items on a given day */
export function getItemDate(item: AnyItem): string {
  if (item.type === 'event') return item.startDate
  if (item.type === 'task') return item.dueDate ?? ''
  return item.reminderDate
}

/** Filter items that fall on a given calendar day */
export function getItemsForDay(items: AnyItem[], day: Date): AnyItem[] {
  return items.filter((item) => {
    const dateStr = getItemDate(item)
    if (!dateStr) return false
    try {
      return isSameDay(new Date(dateStr), day)
    } catch {
      return false
    }
  })
}

export const ITEM_COLORS: Record<AnyItem['type'], string> = {
  event:    'var(--color-event)',
  task:     'var(--color-task)',
  reminder: 'var(--color-reminder)',
}

export const ITEM_BG: Record<AnyItem['type'], string> = {
  event:    'var(--bg-event)',
  task:     'var(--bg-task)',
  reminder: 'var(--bg-reminder)',
}

export const NOTE_COLORS = [
  { bg: '#fef9c3', text: '#713f12', label: 'Lemon' },
  { bg: '#ffedd5', text: '#7c2d12', label: 'Peach' },
  { bg: '#d1fae5', text: '#064e3b', label: 'Mint' },
  { bg: '#ede9fe', text: '#4c1d95', label: 'Lavender' },
  { bg: '#e0f2fe', text: '#0c4a6e', label: 'Sky' },
  { bg: '#ffe4e6', text: '#881337', label: 'Rose' },
  { bg: '#f3e8ff', text: '#581c87', label: 'Lilac' },
]
