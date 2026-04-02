'use client'
import { AnimatePresence } from 'framer-motion'
import PostItNote from './PostItNote'
import type { Note } from '@/types'
import { NOTE_COLORS } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface PostItBoardProps {
  notes: Note[]
  maxReached: boolean
  onAdd: (color?: string) => void
  onUpdate: (id: string, data: Partial<Note>) => void
  onDelete: (id: string) => void
}

export default function PostItBoard({ notes, maxReached, onAdd, onUpdate, onDelete }: PostItBoardProps) {
  return (
    <>
      {/* Notes layer */}
      <AnimatePresence>
        {notes.map(note => (
          <PostItNote key={note._id} note={note} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </AnimatePresence>

      {/* Add button - bottom left floating */}
      <div className="fixed bottom-6 left-20 z-[301] flex items-center gap-2">
        <div className="flex gap-1.5">
          {NOTE_COLORS.slice(0, 5).map(c => (
            <button
              key={c.bg}
              onClick={() => !maxReached && onAdd(c.bg)}
              disabled={maxReached}
              title={maxReached ? 'Max 30 notes' : `Add ${c.label} note`}
              className="w-6 h-6 rounded-full transition-all hover:scale-125 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: c.bg, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
            />
          ))}
        </div>
        {maxReached && (
          <span className="text-xs text-slate-500 ml-1">Max 30 notes</span>
        )}
      </div>
    </>
  )
}
