'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, StickyNote } from 'lucide-react'
import PostItNote from '@/components/postits/PostItNote'
import { useNotes } from '@/hooks/useNotes'
import { NOTE_COLORS } from '@/lib/utils'

export default function FloatingNotesView() {
  const { notes, addNote, updateNote, deleteNote, maxReached } = useNotes()

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <StickyNote size={14} style={{ color: 'var(--accent)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
          Floating Notes
        </span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>
          {notes.length}/30
        </span>

        {maxReached && (
          <span className="text-xs px-2 py-0.5 rounded-lg ml-1"
            style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
            Max 30
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {NOTE_COLORS.map(c => (
            <motion.button
              key={c.bg}
              whileHover={{ scale: 1.25 }}
              whileTap={{ scale: 0.88 }}
              onClick={() => !maxReached && addNote(c.bg)}
              disabled={maxReached}
              title={`Add ${c.label} note`}
              className="w-5 h-5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: c.bg,
                boxShadow: `0 0 0 2px var(--border-hover), 0 2px 6px rgba(0,0,0,0.2)`,
              }}
            />
          ))}
          <button
            onClick={() => !maxReached && addNote()}
            disabled={maxReached}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} />
            New note
          </button>
        </div>
      </div>

      {/* Canvas — free-form draggable notes */}
      <div className="flex-1 overflow-auto relative" style={{ minHeight: 0 }}>
        <div style={{ minHeight: '100%', position: 'relative' }}>
          <AnimatePresence>
            {notes.map(note => (
              <PostItNote
                key={note._id}
                note={note}
                onUpdate={updateNote}
                onDelete={deleteNote}
              />
            ))}
          </AnimatePresence>

          {notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'rgba(251,191,36,0.1)',
                  border: '1px solid rgba(251,191,36,0.2)',
                }}
              >
                <StickyNote size={28} className="text-amber-400" />
              </div>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>No notes yet</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Pick a colour above or click New note to begin.
              </p>
              <button onClick={() => addNote()} className="btn-primary flex items-center gap-2 mt-1">
                <Plus size={14} />
                New note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
