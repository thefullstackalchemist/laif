'use client'
import { useState } from 'react'
import { X, Pencil, Trash2, Check, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUmbrellas } from '@/hooks/useUmbrellas'
import type { Umbrella } from '@/types'

import { UMBRELLA_COLORS } from './UmbrellaSettings'

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

const PALETTE = [
  { label: 'Reds',    colors: ['#FFCDD2','#EF9A9A','#E57373','#EF5350','#F44336','#E53935','#C62828','#B71C1C','#7F0000'] },
  { label: 'Oranges', colors: ['#FFE0B2','#FFCC80','#FFB74D','#FFA726','#FF9800','#FB8C00','#E65100','#D35400','#BF360C'] },
  { label: 'Yellows', colors: ['#FFF9C4','#FFF176','#FFEE58','#FFCA28','#FFB300','#F9A825','#F57F17','#E65100','#FF6F00'] },
  { label: 'Blues',   colors: ['#BBDEFB','#90CAF9','#64B5F6','#42A5F5','#2196F3','#1E88E5','#1565C0','#0D47A1','#01579B'] },
]

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      {PALETTE.map(family => (
        <div key={family.label}>
          <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{family.label}</p>
          <div className="flex gap-1.5">
            {family.colors.map(c => (
              <button
                key={c}
                onClick={() => onChange(c)}
                title={c}
                style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: c, flexShrink: 0,
                  outline: value === c ? `2px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2,
                  transform: value === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.12s',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
