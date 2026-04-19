'use client'
import { useState } from 'react'
import { Trash2, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { TYPE_CONFIG } from './typeConfig'
import type { Memory } from '@/types'

interface Props {
  memory: Memory
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Memory>) => void
  isFocused?: boolean
  onFocus?: () => void
}

const DONE_STATUSES = new Set(['read', 'watched', 'loved', 'bought', 'done', 'visited'])

export function isDone(m: Memory) {
  return !!m.status && DONE_STATUSES.has(m.status)
}

export function getNextStatus(m: Memory): string | undefined {
  const statuses = TYPE_CONFIG[m.type].statuses
  if (!statuses.length) return undefined
  const idx = statuses.indexOf(m.status ?? '')
  return statuses[(idx + 1) % statuses.length]
}

function getKeyAttr(m: Memory): { text: string; href?: string } | null {
  const a = m.attributes ?? {}
  if (m.type === 'book')     return a.author     ? { text: a.author }                                : null
  if (m.type === 'movie')    return a.director   ? { text: a.director } : a.year ? { text: a.year } : null
  if (m.type === 'song')     return a.artist     ? { text: a.artist }                                : null
  if (m.type === 'contact')  return a.phone      ? { text: a.phone }  : a.email ? { text: a.email } : null
  if (m.type === 'shopping') return a.brand      ? { text: a.brand }  : a.store ? { text: a.store } : null
  if (m.type === 'place')    return a.location   ? { text: a.location }                              : null
  if (m.type === 'quote')    return a.author     ? { text: `— ${a.author}` }                         : null
  if (m.type === 'link') {
    try {
      const host = new URL(a.url).hostname.replace('www.', '')
      return { text: host, href: a.url }
    } catch { return a.url ? { text: a.url, href: a.url } : null }
  }
  return null
}

export default function MemoryRow({ memory: m, onDelete, onUpdate, isFocused, onFocus }: Props) {
  const [hovered, setHovered] = useState(false)
  const cfg  = TYPE_CONFIG[m.type]
  const done = isDone(m)
  const attr = getKeyAttr(m)
  const ago  = m.createdAt
    ? formatDistanceToNow(new Date(m.createdAt), { addSuffix: false })
        .replace('about ', '').replace(' hours', 'h').replace(' hour', 'h')
        .replace(' minutes', 'm').replace(' minute', 'm')
        .replace(' days', 'd').replace(' day', 'd')
        .replace(' months', 'mo').replace(' month', 'mo')
    : ''

  const active = isFocused || hovered

  return (
    <div
      onMouseEnter={() => { setHovered(true); onFocus?.() }}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isFocused
          ? 'var(--accent-dim)'
          : hovered ? 'var(--sidebar-item-hover)' : 'transparent',
        borderLeft: isFocused ? '2px solid var(--accent)' : '2px solid transparent',
        opacity: done ? 0.5 : 1,
      }}
    >
      {/* Type dot */}
      <div
        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${cfg.color}18`, color: cfg.color }}
      >
        <cfg.icon size={12} />
      </div>

      {/* Title */}
      <span
        className="text-sm font-medium flex-shrink-0"
        style={{
          color: 'var(--text-1)',
          textDecoration: done ? 'line-through' : 'none',
          maxWidth: 260,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {m.title}
      </span>

      {/* Key attribute */}
      {attr && (
        <>
          <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
          {attr.href ? (
            <a
              href={attr.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-xs flex-shrink-0 hover:underline"
              style={{ color: 'var(--text-3)' }}
              onClick={e => e.stopPropagation()}
            >
              {attr.text}
              <ExternalLink size={10} className="opacity-60" />
            </a>
          ) : (
            <span className="text-xs flex-shrink-0 truncate" style={{ color: 'var(--text-3)', maxWidth: 180 }}>
              {attr.text}
            </span>
          )}
        </>
      )}

      {/* Description snippet if no key attr */}
      {!attr && m.description && (
        <>
          <span style={{ color: 'var(--border)', fontSize: 10 }}>·</span>
          <span className="text-xs truncate" style={{ color: 'var(--text-3)', maxWidth: 240 }}>
            {m.description}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Status badge — clickable */}
      {m.status && cfg.statuses.length > 0 && (
        <button
          onClick={() => { const next = getNextStatus(m); if (next && m._id) onUpdate(m._id, { status: next }) }}
          className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 transition-opacity hover:opacity-80"
          style={{ background: `${cfg.color}15`, color: cfg.color }}
        >
          {m.status.replace(/-/g, ' ')}
        </button>
      )}

      {/* Time ago */}
      <span className="text-xs flex-shrink-0 w-8 text-right" style={{ color: 'var(--text-3)' }}>
        {ago}
      </span>

      {/* Delete — visible on hover or focus */}
      <button
        onClick={() => m._id && onDelete(m._id)}
        className="flex-shrink-0 p-1 rounded-lg transition-all"
        style={{
          opacity: active ? 1 : 0,
          color: 'var(--text-3)',
          pointerEvents: active ? 'auto' : 'none',
        }}
        title="Delete  ⌫"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
