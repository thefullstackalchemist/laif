'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, StickyNote } from 'lucide-react'
import PostItNote from '@/components/postits/PostItNote'
import FloatingChat from '@/components/chat/FloatingChat'
import { useNotes } from '@/hooks/useNotes'
import { NOTE_COLORS } from '@/lib/utils'

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, maxReached } = useNotes()

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header */}
      <header
        className="flex-shrink-0 flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--cal-header-bg)' }}
      >
        <StickyNote size={15} style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Post-its</span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{notes.length}/30</span>
        {maxReached && (
          <span className="text-xs px-2 py-0.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
            Max 30
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {NOTE_COLORS.map(c => (
            <motion.button
              key={c.bg}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => !maxReached && addNote(c.bg)}
              disabled={maxReached}
              title={`Add ${c.label} note`}
              className="w-5 h-5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: c.bg, boxShadow: `0 0 0 2px var(--border-hover)` }}
            />
          ))}
          <button
            onClick={() => !maxReached && addNote()}
            disabled={maxReached}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed ml-1"
          >
            <Plus size={13} />
            New note
          </button>
        </div>
      </header>

      {/* Privacy notice */}
      <div
        className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-1.5 text-xs"
        style={{ background: 'rgba(251,191,36,0.06)', borderBottom: '1px solid rgba(251,191,36,0.12)', color: 'var(--text-3)' }}
      >
        <span style={{ color: '#fbbf24' }}>⚠</span>
        Avoid storing passwords, financial details, or other sensitive private information in notes.
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto relative" style={{ minHeight: 0 }}>
        <div style={{ minHeight: '100%', position: 'relative' }}>
          <AnimatePresence>
            {notes.map(note => (
              <PostItNote key={note._id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
            ))}
          </AnimatePresence>

          <FloatingChat onRefreshItems={() => {}} />

          {notes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.15)' }}>
                  <StickyNote size={28} className="text-amber-400" />
                </div>
                <p className="font-medium" style={{ color: 'var(--text-1)' }}>No notes yet</p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Click a colour above or "New note" to get started.</p>
                <button onClick={() => addNote()} className="btn-primary flex items-center gap-2 mt-2">
                  <Plus size={14} /> Add your first note
                </button>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
