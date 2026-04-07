'use client'
import { useState } from 'react'
import { X, Pencil, Trash2, Check, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUmbrellas } from '@/hooks/useUmbrellas'
import type { Umbrella } from '@/types'

// ── 36-color palette: 9 reds · 9 oranges · 9 yellows · 9 blues ──────────────
export const UMBRELLA_COLORS = [
  // Reds
  '#FF6B6B','#FF4757','#E74C3C','#C0392B','#B71C1C','#FF5252','#EF5350','#E53935','#D50000',
  // Oranges
  '#FF7F50','#FF6348','#E67E22','#F39C12','#FF8C00','#D35400','#E65100','#FF9800','#FB8C00',
  // Yellows
  '#FFD700','#FFC107','#F1C40F','#FFB300','#FFEE58','#F9CA24','#EAB308','#FBBF24','#FDD835',
  // Blues
  '#60A5FA','#3B82F6','#2563EB','#1D4ED8','#1E40AF','#0EA5E9','#06B6D4','#0891B2','#2196F3',
]

const FAMILY_LABELS = ['Reds','Oranges','Yellows','Blues']

interface Props {
  onClose: () => void
}

export default function UmbrellaManager({ onClose }: Props) {
  const { umbrellas, create, update, remove } = useUmbrellas()

  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editName, setEditName]       = useState('')
  const [editColor, setEditColor]     = useState('')
  const [confirmId, setConfirmId]     = useState<string | null>(null)

  // New umbrella form
  const [newName, setNewName]         = useState('')
  const [newColor, setNewColor]       = useState(UMBRELLA_COLORS[0])
  const [creating, setCreating]       = useState(false)

  function startEdit(u: Umbrella) {
    setEditingId(u._id)
    setEditName(u.name)
    setEditColor(u.color)
    setConfirmId(null)
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return
    await update(editingId, editName.trim(), editColor)
    setEditingId(null)
  }

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    await create(newName.trim(), newColor)
    setNewName('')
    setNewColor(UMBRELLA_COLORS[0])
    setCreating(false)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1,    y: 0  }}
        exit={{    opacity: 0, scale: 0.95, y: 12 }}
        className="relative flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          width: 420,
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Umbrellas</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Group items with a shared theme</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:opacity-60 transition-opacity" style={{ color: 'var(--text-3)' }}>
            <X size={15} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          <AnimatePresence initial={false}>
            {umbrellas.map(u => (
              <motion.div
                key={u._id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, x: 20 }}
                className="rounded-xl px-3 py-2.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {editingId === u._id ? (
                  <div className="space-y-2.5">
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      className="w-full text-sm bg-transparent outline-none"
                      style={{ color: 'var(--text-1)' }}
                    />
                    <ColorGrid value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--accent)', color: '#fff' }}
                      >
                        <Check size={11} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs"
                        style={{ background: 'var(--border)', color: 'var(--text-2)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: u.color }} />
                    <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{u.name}</span>
                    <button onClick={() => startEdit(u)} className="p-1 rounded hover:opacity-60 transition-opacity" style={{ color: 'var(--text-3)' }}>
                      <Pencil size={12} />
                    </button>
                    {confirmId === u._id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { remove(u._id); setConfirmId(null) }}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ background: '#ef444420', color: '#ef4444' }}
                        >Delete</button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ color: 'var(--text-3)' }}
                        >Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(u._id)} className="p-1 rounded hover:opacity-60 transition-opacity" style={{ color: 'var(--text-3)' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {umbrellas.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: 'var(--text-3)' }}>No umbrellas yet — create one below</p>
          )}
        </div>

        {/* Create new */}
        <div className="px-4 py-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-3)' }}>NEW UMBRELLA</p>
          <input
            placeholder="Name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            className="w-full text-sm px-3 py-2 rounded-lg outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
          />
          <ColorGrid value={newColor} onChange={setNewColor} />
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium w-full justify-center transition-opacity disabled:opacity-40"
            style={{ background: newColor, color: '#fff' }}
          >
            <Plus size={13} /> Create umbrella
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Color grid ────────────────────────────────────────────────────────────────
function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      {[0,1,2,3].map(row => (
        <div key={row} className="flex gap-1.5">
          {UMBRELLA_COLORS.slice(row * 9, row * 9 + 9).map(c => (
            <button
              key={c}
              onClick={() => onChange(c)}
              className="w-6 h-6 rounded-full flex-shrink-0 transition-transform hover:scale-110"
              style={{
                background: c,
                outline: value === c ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
                transform: value === c ? 'scale(1.2)' : undefined,
              }}
            />
          ))}
        </div>
      ))}
      <div className="flex gap-2 pt-0.5">
        {FAMILY_LABELS.map(l => (
          <span key={l} className="text-xs flex-1 text-center" style={{ color: 'var(--text-3)' }}>{l}</span>
        ))}
      </div>
    </div>
  )
}
