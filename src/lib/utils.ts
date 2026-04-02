import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns'
import type { AnyItem } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'MMM d, yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'h:mm a')
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
      return isSameDay(parseISO(dateStr), day)
    } catch {
      return false
    }
  })
}

export const ITEM_COLORS: Record<AnyItem['type'], string> = {
  event: '#5b8ded',
  task: '#34d399',
  reminder: '#fbbf24',
}

export const ITEM_BG: Record<AnyItem['type'], string> = {
  event: 'rgba(91, 141, 237, 0.15)',
  task: 'rgba(52, 211, 153, 0.15)',
  reminder: 'rgba(251, 191, 36, 0.15)',
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
