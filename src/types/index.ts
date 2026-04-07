export type ItemType = 'event' | 'task' | 'reminder'

export interface Umbrella {
  _id: string
  name: string
  color: string
  createdAt?: string
}

export interface Comment {
  _id?: string
  text: string
  createdAt?: string
}
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export interface CalendarEvent {
  _id?: string
  type: 'event'
  title: string
  description?: string
  startDate: string
  endDate: string
  allDay?: boolean
  location?: string
  color: string
  umbrellas?: string[]
  comments?: Comment[]
  createdAt?: string
}

export interface Task {
  _id?: string
  type: 'task'
  title: string
  description?: string
  dueDate?: string
  priority: TaskPriority
  status: TaskStatus
  color: string
  umbrellas?: string[]
  comments?: Comment[]
  createdAt?: string
}

export interface Reminder {
  _id?: string
  type: 'reminder'
  title: string
  description?: string
  reminderDate: string
  notified?: boolean
  color: string
  umbrellas?: string[]
  comments?: Comment[]
  createdAt?: string
}

export interface Note {
  _id?: string
  content: string
  color: string
  position: { x: number; y: number }
  size?: { w: number; h: number }
  createdAt?: string
}

export type AnyItem = CalendarEvent | Task | Reminder

// ─── Memory ──────────────────────────────────────────────────────────────────
export const MEMORY_TYPES = ['book', 'movie', 'song', 'contact', 'shopping', 'task', 'place', 'quote', 'link', 'general'] as const
export type MemoryType = typeof MEMORY_TYPES[number]

export interface Memory {
  _id?: string
  type: MemoryType
  title: string
  description?: string
  /** Flexible per-type key-value: author, phone, brand, url, etc. */
  attributes: Record<string, string>
  status?: string
  priority?: 'low' | 'medium' | 'high'
  tags?: string[]
  /** Set only when type === 'task' and a calendar task was also created */
  linkedTaskId?: string
  createdAt?: string
}

// ─── Contact ──────────────────────────────────────────────────────────────────
export interface Contact {
  _id?: string
  name: string
  role?: string       // "Electrician", "ISP Helper", "Neighbour", etc.
  phone?: string
  email?: string
  company?: string
  address?: string
  notes?: string
  tags?: string[]
  createdAt?: string
}

export type StepIcon = 'search' | 'found' | 'warn' | 'clash' | 'add' | 'done' | 'err'

export interface StepItem {
  id: string
  icon: StepIcon
  text: string
}

export interface ContactRef {
  id: string
  name: string
  role?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  steps?: StepItem[]
  contactRefs?: ContactRef[]
  timestamp: Date
}

export type StreamChunk =
  | { t: 's'; icon: StepIcon; text: string }
  | { t: 'd'; text: string }
  | { t: 'refresh' }
  | { t: 'err'; text: string }
  | { t: 'contact_ref'; id: string; name: string; role?: string }
