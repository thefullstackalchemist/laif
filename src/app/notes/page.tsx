'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, StickyNote, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import PostItNote from '@/components/postits/PostItNote'
import FloatingChat from '@/components/chat/FloatingChat'
import { useNotes } from '@/hooks/useNotes'
import { NOTE_COLORS } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, maxReached } = useNotes()
  const { theme } = useTheme()

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden"
      style={{ background: 'var(--bg)' }}
    >
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--cal-header-bg)', backdropFilter: 'blur(20px)' }}
      >
        {/* Left */}
        <div className="flex items-center gap-3 flex-1">
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-colors text-sm"
            style={{ color: 'var(--text-2)' }}
          >
            <ArrowLeft size={15} />
            <span>Calendar</span>
          </Link>
          <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
          <div className="flex items-center gap-2">
            <StickyNote size={16} style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Post-its</span>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{notes.length}/30</span>
        </div>

        {/* Center — logo */}
        <div className="flex items-center justify-center flex-1">
          <Image
            src="/logo-white.png"
            alt="laif"
            width={36}
            height={36}
            className="object-contain"
            style={theme === 'light' ? { filter: 'invert(1)' } : undefined}
          />
        </div>

        {/* Right — color add buttons */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {maxReached && (
            <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg">Max 30 notes</span>
          )}
          <div className="flex items-center gap-1.5">
            {NOTE_COLORS.map(c => (
              <motion.button
                key={c.bg}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => !maxReached && addNote(c.bg)}
                disabled={maxReached}
                title={`Add ${c.label} note`}
                className="w-6 h-6 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: c.bg,
                  boxShadow: `0 0 0 2px var(--border-hover), 0 2px 6px rgba(0,0,0,0.25)`,
                  outline: `2px solid ${c.text}22`,
                }}
              />
            ))}
          </div>
          <button
            onClick={() => !maxReached && addNote()}
            disabled={maxReached}
            className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={13} />
            New note
          </button>
        </div>
      </header>

      {/* Notes canvas */}
      <div className="pt-24" style={{ minHeight: '100vh', position: 'relative' }}>
        {/* Privacy notice */}
        <div
          className="fixed top-[57px] left-0 right-0 z-[199] flex items-center justify-center gap-2 px-4 py-1.5 text-xs"
          style={{ background: 'rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.15)', color: 'var(--text-3)' }}
        >
          <span style={{ color: '#fbbf24' }}>⚠</span>
          Avoid storing passwords, financial details, or other sensitive private information in notes.
        </div>
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

        <FloatingChat onRefreshItems={() => {}} />

        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <StickyNote size={28} className="text-amber-400" />
              </div>
              <p className="font-medium" style={{ color: 'var(--text-1)' }}>No notes yet</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>Click a color above or "New note" to get started.</p>
              <button
                onClick={() => addNote()}
                className="btn-primary flex items-center gap-2 mt-2"
              >
                <Plus size={14} />
                Add your first note
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
