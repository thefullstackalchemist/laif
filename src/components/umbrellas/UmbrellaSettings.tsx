'use client'
import { useState } from 'react'
import { Pencil, Trash2, Check, X, Plus, Umbrella as UmbrellaIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUmbrellas } from '@/hooks/useUmbrellas'
import type { Umbrella } from '@/types'

// ── Palette: 9 shades per family, arranged light → dark ──────────────────────
const PALETTE: { label: string; colors: string[] }[] = [
  {
    label: 'Reds',
    colors: ['#FFCDD2','#EF9A9A','#E57373','#EF5350','#F44336','#E53935','#C62828','#B71C1C','#7F0000'],
  },
  {
    label: 'Oranges',
    colors: ['#FFE0B2','#FFCC80','#FFB74D','#FFA726','#FF9800','#FB8C00','#E65100','#D35400','#BF360C'],
  },
  {
    label: 'Yellows',
    colors: ['#FFF9C4','#FFF176','#FFF176','#FFEE58','#FFCA28','#FFB300','#F9A825','#F57F17','#E65100'],
  },
  {
    label: 'Blues',
    colors: ['#BBDEFB','#90CAF9','#64B5F6','#42A5F5','#2196F3','#1E88E5','#1565C0','#0D47A1','#01579B'],
  },
]

// Flatten for easy lookup
export const UMBRELLA_COLORS = PALETTE.flatMap(f => f.colors)

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {PALETTE.map(family => (
        <div key={family.label}>
          <p className="text-xs mb-1.5" style={{ color: 'var(--text-3)' }}>{family.label}</p>
          <div className="flex gap-1.5 flex-wrap">
            {family.colors.map(c => (
              <button
                key={c}
                onClick={() => onChange(c)}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: c,
                  flexShrink: 0,
                  outline: value === c ? `2px solid ${c}` : '2px solid transparent',
                  outlineOffset: 2,
                  transform: value === c ? 'scale(1.2)' : 'scale(1)',
                  transition: 'transform 0.12s, outline 0.12s',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function UmbrellaSettings() {
  const { umbrellas, create, update, remove } = useUmbrellas()

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editColor, setEditColor]   = useState('')
  const [confirmId, setConfirmId]   = useState<string | null>(null)

  const [newName, setNewName]       = useState('')
  const [newColor, setNewColor]     = useState(PALETTE[0].colors[4])
  const [creating, setCreating]     = useState(false)
  const [showNewForm, setShowNewForm] = useState(false)

  function startEdit(u: Umbrella) {
    setEditingId(u._id)
    setEditName(u.name)
    setEditColor(u.color)
    setConfirmId(null)
    setShowNewForm(false)
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
    setNewColor(PALETTE[0].colors[4])
    setShowNewForm(false)
    setCreating(false)
  }

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Umbrellas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Color-coded groups you can attach to events, tasks and reminders.
          </p>
        </div>
        <button
          onClick={() => { setShowNewForm(f => !f); setEditingId(null) }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={12} /> New umbrella
        </button>
      </div>

      {/* New umbrella form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <UmbrellaIcon size={16} style={{ color: newColor, flexShrink: 0 }} />
                <input
                  autoFocus
                  placeholder="Umbrella name…"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNewForm(false) }}
                  className="flex-1 text-sm bg-transparent outline-none font-medium"
                  style={{ color: 'var(--text-1)' }}
                />
              </div>
              <ColorPicker value={newColor} onChange={setNewColor} />
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40 transition-opacity"
                  style={{ background: newColor, color: '#fff' }}
                >
                  <Check size={13} /> Create
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
                  style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Umbrella list */}
      {umbrellas.length === 0 && !showNewForm ? (
        <div
          className="rounded-2xl p-10 text-center"
          style={{ background: 'var(--card)', border: '1px dashed var(--border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>No umbrellas yet.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Hit "New umbrella" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {umbrellas.map(u => (
              <motion.div
                key={u._id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, x: 40 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                {editingId === u._id ? (
                  /* Edit mode */
                  <div className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <UmbrellaIcon size={16} style={{ color: editColor, flexShrink: 0 }} />
                      <input
                        autoFocus
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                        className="flex-1 text-sm bg-transparent outline-none font-medium"
                        style={{ color: 'var(--text-1)' }}
                      />
                    </div>
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ background: editColor, color: '#fff' }}
                      >
                        <Check size={13} /> Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 rounded-xl text-sm transition-opacity hover:opacity-70"
                        style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Umbrella icon */}
                    <UmbrellaIcon size={16} style={{ color: u.color, flexShrink: 0 }} />

                    {/* Name */}
                    <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>{u.name}</span>

                    {/* Hex label */}
                    <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{u.color}</span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(u)}
                        className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                        style={{ color: 'var(--text-3)' }}
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>

                      {confirmId === u._id ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <button
                            onClick={() => { remove(u._id); setConfirmId(null) }}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                            style={{ background: '#ef444420', color: '#ef4444' }}
                          >Delete</button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                            style={{ color: 'var(--text-3)' }}
                          ><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(u._id)}
                          className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                          style={{ color: 'var(--text-3)' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
