import {
  BookOpen, Film, Music, User, ShoppingCart, CheckSquare,
  MapPin, MessageSquare, Link2, Brain,
} from 'lucide-react'
import type { MemoryType } from '@/types'

export interface TypeConfig {
  label: string
  icon: React.ElementType
  color: string
  bg: string
  border: string
  statuses: string[]
  attrLabels: Record<string, string>
  defaultStatus?: string
}

export const TYPE_CONFIG: Record<MemoryType, TypeConfig> = {
  book: {
    label: 'Books',
    icon: BookOpen,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.3)',
    statuses: ['want-to-read', 'reading', 'read'],
    attrLabels: { author: 'Author', year: 'Year', genre: 'Genre', pages: 'Pages' },
    defaultStatus: 'want-to-read',
  },
  movie: {
    label: 'Movies & Shows',
    icon: Film,
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.3)',
    statuses: ['want-to-watch', 'watching', 'watched'],
    attrLabels: { director: 'Director', year: 'Year', genre: 'Genre', platform: 'Platform' },
    defaultStatus: 'want-to-watch',
  },
  song: {
    label: 'Songs',
    icon: Music,
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.08)',
    border: 'rgba(244,114,182,0.3)',
    statuses: ['want-to-listen', 'listening', 'loved'],
    attrLabels: { artist: 'Artist', album: 'Album', genre: 'Genre', year: 'Year' },
    defaultStatus: 'want-to-listen',
  },
  contact: {
    label: 'Contacts',
    icon: User,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    statuses: [],
    attrLabels: { phone: 'Phone', email: 'Email', company: 'Company', relation: 'Relation' },
  },
  shopping: {
    label: 'Shopping',
    icon: ShoppingCart,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    statuses: ['need', 'bought'],
    attrLabels: { brand: 'Brand', quantity: 'Qty', store: 'Store', price: 'Price' },
    defaultStatus: 'need',
  },
  task: {
    label: 'Tasks',
    icon: CheckSquare,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.3)',
    statuses: ['pending', 'done'],
    attrLabels: { due: 'Due date', priority: 'Priority' },
    defaultStatus: 'pending',
  },
  place: {
    label: 'Places',
    icon: MapPin,
    color: '#f43f5e',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.3)',
    statuses: ['want-to-visit', 'visited'],
    attrLabels: { location: 'Location', type: 'Type', address: 'Address', rating: 'Rating' },
    defaultStatus: 'want-to-visit',
  },
  quote: {
    label: 'Quotes',
    icon: MessageSquare,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.3)',
    statuses: [],
    attrLabels: { author: 'Author', source: 'From' },
  },
  link: {
    label: 'Links & Resources',
    icon: Link2,
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.3)',
    statuses: ['saved', 'read'],
    attrLabels: { url: 'URL', category: 'Category', platform: 'Platform' },
    defaultStatus: 'saved',
  },
  general: {
    label: 'General',
    icon: Brain,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.3)',
    statuses: [],
    attrLabels: { source: 'Source', date: 'Date', note: 'Note' },
  },
}
