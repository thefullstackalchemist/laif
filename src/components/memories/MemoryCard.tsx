'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, CheckSquare, Square, ExternalLink, Edit2, Check } from 'lucide-react'
import { TYPE_CONFIG } from './typeConfig'
import { cn } from '@/lib/utils'
import type { Memory } from '@/types'

interface MemoryCardProps {
  memory: Memory
  onDelete: (id: string) => void
  onUpdate: (id: string, patch: Partial<Memory>) => void
}

export default function MemoryCard({ memory, onDelete, onUpdate }: MemoryCardProps) {
  const [hovering, setHovering] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(memory.title)

  const cfg = TYPE_CONFIG[memory.type]
  const Icon = cfg.icon
  const attrs = memory.attributes ?? {}
  const visibleAttrs = Object.entries(attrs).filter(([, v]) => v).slice(0, 4)

  function cycleStatus() {
    if (!cfg.statuses.length) return
    const idx = cfg.statuses.indexOf(memory.status ?? '')
    const next = cfg.statuses[(idx + 1) % cfg.statuses.length]
    onUpdate(memory._id!, { status: next })
  }

  function saveTitle() {
    if (editTitle.trim() && editTitle !== memory.title) {
      onUpdate(memory._id!, { title: editTitle.trim() })
    }
    setEditing(false)
  }

  const isDone = memory.status === 'done' || memory.status === 'read' || memory.status === 'watched' || memory.status === 'bought' || memory.status === 'visited'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -4 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setHovering(true)}
      onHoverEnd={() => setHovering(false)}
      className="relative rounded-2xl p-4 flex flex-col gap-2 group cursor-default"
      style={{
        background: `color-mix(in srgb, ${cfg.color} 8%, var(--card))`,
        border: `1px solid ${cfg.border}`,
        boxShadow: hovering ? `0 8px 24px rgba(0,0,0,0.15), 0 0 0 1px ${cfg.border}` : '0 2px 8px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.2s',
        opacity: isDone ? 0.65 : 1,
      }}
    >
      {/* Type icon + actions */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${cfg.color}20`, color: cfg.color }}
        >
          <Icon size={15} />
        </div>

        <div className={cn('flex items-center gap-1 transition-opacity duration-150', hovering ? 'opacity-100' : 'opacity-0')}>
          {cfg.statuses.length > 0 && (
            <button
              onClick={cycleStatus}
              title="Toggle status"
              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              style={{ color: cfg.color }}
            >
              {isDone ? <CheckSquare size={13} /> : <Square size={13} />}
            </button>
          )}
          <button
            onClick={() => { setEditing(true); setEditTitle(memory.title) }}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            <Edit2 size={11} />
          </button>
          <button
            onClick={() => onDelete(memory._id!)}
            className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/20 transition-colors hover:text-red-400"
            style={{ color: 'var(--text-3)' }}
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Title */}
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false) }}
            onBlur={saveTitle}
            className="flex-1 rounded-lg px-2 py-1 text-sm outline-none"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-1)' }}
          />
          <button onClick={saveTitle} className="text-emerald-400"><Check size={13} /></button>
        </div>
      ) : (
        <p
          className={cn('text-sm font-semibold leading-snug')}
          style={{ color: isDone ? 'var(--text-3)' : 'var(--text-1)', textDecoration: isDone ? 'line-through' : 'none' }}
          onDoubleClick={() => { setEditing(true); setEditTitle(memory.title) }}
        >
          {memory.title}
        </p>
      )}

      {/* Description */}
      {memory.description && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-2)' }}>{memory.description}</p>
      )}

      {/* Attributes */}
      {visibleAttrs.length > 0 && (
        <div className="space-y-1">
          {visibleAttrs.map(([key, val]) => (
            <div key={key} className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs flex-shrink-0 capitalize" style={{ color: 'var(--text-3)' }}>{cfg.attrLabels[key] ?? key}:</span>
              {key === 'url' ? (
                <a
                  href={val.startsWith('http') ? val : `https://${val}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs truncate flex items-center gap-0.5 hover:underline"
                  style={{ color: cfg.color }}
                  onClick={e => e.stopPropagation()}
                >
                  {val.replace(/^https?:\/\/(www\.)?/, '').slice(0, 30)}
                  <ExternalLink size={9} />
                </a>
              ) : (
                <span className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{val}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer: status + linked task badge */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {memory.status && (
          <button
            onClick={cycleStatus}
            className="text-xs px-2 py-0.5 rounded-full font-medium transition-all hover:opacity-80"
            style={{ background: `${cfg.color}20`, color: cfg.color }}
          >
            {memory.status.replace(/-/g, ' ')}
          </button>
        )}
        {memory.linkedTaskId && (
          <span className="text-xs flex items-center gap-1 ml-auto" style={{ color: '#34d399' }}>
            <CheckSquare size={10} />
            <span>in calendar</span>
          </span>
        )}
      </div>
    </motion.div>
  )
}
