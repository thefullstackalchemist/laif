'use client'
import { useState, useRef, useEffect } from 'react'
import { Plus, X, Umbrella } from 'lucide-react'
import { useUmbrellas } from '@/hooks/useUmbrellas'

interface Props {
  selected: string[]            // array of umbrella _ids
  onChange: (ids: string[]) => void
}

export default function UmbrellaPicker({ selected, onChange }: Props) {
  const { umbrellas } = useUmbrellas()
  const [open, setOpen]       = useState(false)
  const ref                   = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  const selectedItems = umbrellas.filter(u => selected.includes(u._id))
  const remaining     = umbrellas.filter(u => !selected.includes(u._id))

  return (
    <div ref={ref} className="relative">
      {/* Chips row */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {selectedItems.map(u => (
          <span
            key={u._id}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ background: u.color + '22', color: u.color, border: `1px solid ${u.color}55` }}
          >
            <Umbrella size={9} className="flex-shrink-0" />
            {u.name}
            <button
              onClick={() => toggle(u._id)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X size={9} />
            </button>
          </span>
        ))}

        {/* Add button */}
        {remaining.length > 0 && (
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-opacity hover:opacity-70"
            style={{ background: 'var(--border)', color: 'var(--text-3)', border: '1px solid var(--border)' }}
          >
            <Plus size={10} />
            {selectedItems.length === 0 ? 'Add umbrella' : ''}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 rounded-xl shadow-2xl z-50 p-2 space-y-0.5 min-w-40"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {remaining.map(u => (
            <button
              key={u._id}
              onClick={() => { toggle(u._id); setOpen(false) }}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors hover:opacity-80"
              style={{ color: 'var(--text-1)' }}
            >
              <Umbrella size={11} style={{ color: u.color, flexShrink: 0 }} />
              {u.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
