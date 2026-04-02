'use client'
import { useState, useRef, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Note } from '@/types'
import { NOTE_COLORS } from '@/lib/utils'

const MAX_CHARS = 1000
const DRAG_THRESHOLD = 5   // px — suppress position save for micro-drags (clicks)
const MIN_W = 180
const MIN_H = 120
const MAX_W = 420
const MAX_H = 420

interface PostItNoteProps {
  note: Note
  onUpdate: (id: string, data: Partial<Note>) => void
  onDelete: (id: string) => void
}

const PostItNote = memo(function PostItNote({ note, onUpdate, onDelete }: PostItNoteProps) {
  const [content, setContent]       = useState(note.content)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [localPos,  setLocalPos]    = useState({ x: note.position.x, y: note.position.y })
  const [localSize, setLocalSize]   = useState({ w: note.size?.w ?? 200, h: note.size?.h ?? 200 })

  // Sync position from parent only when not dragging (e.g. initial load)
  const prevPosRef = useRef(note.position)
  if (!isDragging &&
      (note.position.x !== prevPosRef.current.x || note.position.y !== prevPosRef.current.y)) {
    prevPosRef.current = note.position
    setLocalPos(note.position)
  }

  const dragStart   = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null)
  const resizeStart = useRef<{ mx: number; my: number; w: number; h: number } | null>(null)

  const noteColor = NOTE_COLORS.find(c => c.bg === note.color) ?? NOTE_COLORS[0]

  // ── Drag to move ────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('textarea, button, [data-resize]')) return
    e.preventDefault()
    dragStart.current = { mx: e.clientX, my: e.clientY, nx: note.position.x, ny: note.position.y }
    setIsDragging(true)

    const onMove = (me: MouseEvent) => {
      if (!dragStart.current) return
      const dx = me.clientX - dragStart.current.mx
      const dy = me.clientY - dragStart.current.my
      const maxX = (document.documentElement.scrollWidth  || window.innerWidth)  - 220
      const maxY = (document.documentElement.scrollHeight || window.innerHeight) - 220
      const x = Math.max(0, Math.min(maxX, dragStart.current.nx + dx))
      const y = Math.max(64, Math.min(maxY, dragStart.current.ny + dy))
      // Update local state only — no parent re-render every frame
      setLocalPos({ x, y })
    }

    const onUp = (me: MouseEvent) => {
      if (dragStart.current) {
        const dx = me.clientX - dragStart.current.mx
        const dy = me.clientY - dragStart.current.my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist >= DRAG_THRESHOLD) {
          const maxX = (document.documentElement.scrollWidth  || window.innerWidth)  - 220
          const maxY = (document.documentElement.scrollHeight || window.innerHeight) - 220
          const x = Math.max(0, Math.min(maxX, dragStart.current.nx + dx))
          const y = Math.max(64, Math.min(maxY, dragStart.current.ny + dy))
          // Flush to parent (and server) only once on drop
          onUpdate(note._id!, { position: { x, y } })
        } else {
          // Reset local pos back — it was a click, not a drag
          setLocalPos({ x: dragStart.current.nx, y: dragStart.current.ny })
        }
      }
      dragStart.current = null
      setIsDragging(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [note, onUpdate])

  // ── Resize from bottom-right corner ────────────────────────────────────
  const handleResizeDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStart.current = {
      mx: e.clientX,
      my: e.clientY,
      w: localSize.w,
      h: localSize.h,
    }
    setIsResizing(true)

    const onMove = (me: MouseEvent) => {
      if (!resizeStart.current) return
      const dx = me.clientX - resizeStart.current.mx
      const dy = me.clientY - resizeStart.current.my
      const w = Math.max(MIN_W, Math.min(MAX_W, resizeStart.current.w + dx))
      const h = Math.max(MIN_H, Math.min(MAX_H, resizeStart.current.h + dy))
      setLocalSize({ w, h })
    }

    const onUp = (me: MouseEvent) => {
      if (resizeStart.current) {
        const dx = me.clientX - resizeStart.current.mx
        const dy = me.clientY - resizeStart.current.my
        const w = Math.max(MIN_W, Math.min(MAX_W, resizeStart.current.w + dx))
        const h = Math.max(MIN_H, Math.min(MAX_H, resizeStart.current.h + dy))
        const size = { w, h }
        setLocalSize(size)
        onUpdate(note._id!, { size })   // coalesced in useNotes
      }
      resizeStart.current = null
      setIsResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [localSize, note._id, onUpdate])

  // ── Content change ──────────────────────────────────────────────────────
  const handleContentChange = (val: string) => {
    if (val.length > MAX_CHARS) return
    setContent(val)
    onUpdate(note._id!, { content: val })   // coalesced + debounced in useNotes
  }

  const handleColorChange = (color: string) => {
    setShowColors(false)
    onUpdate(note._id!, { color })
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotate: -2 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.7, rotate: 4 }}
      style={{
        position: 'absolute',
        left: localPos.x,
        top: localPos.y,
        zIndex: isDragging || isResizing ? 100 : 10,
        width: localSize.w,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: isDragging || isResizing ? 'none' : 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded-xl overflow-visible flex flex-col"
        style={{
          background: note.color,
          height: localSize.h,
          boxShadow: isDragging
            ? '0 20px 50px rgba(0,0,0,0.35), 0 0 0 2px rgba(0,0,0,0.08)'
            : '0 4px 20px rgba(0,0,0,0.18)',
          transform: isDragging ? 'scale(1.03) rotate(1deg)' : undefined,
          transition: isDragging ? 'box-shadow 0.15s' : 'box-shadow 0.15s, transform 0.15s',
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0">
          <button
            onClick={() => setShowColors(s => !s)}
            className="w-4 h-4 rounded-full transition-transform hover:scale-110"
            style={{ background: note.color, boxShadow: `0 0 0 1.5px ${noteColor.text}55` }}
            title="Change color"
          />
          <button
            onClick={() => onDelete(note._id!)}
            className="opacity-40 hover:opacity-100 transition-opacity p-0.5"
            style={{ color: noteColor.text }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Color picker */}
        {showColors && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-2 flex-shrink-0">
            {NOTE_COLORS.map(c => (
              <button
                key={c.bg}
                onClick={() => handleColorChange(c.bg)}
                className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c.bg,
                  boxShadow: note.color === c.bg
                    ? `0 0 0 2px ${c.text}, 0 0 0 4px ${c.text}44`
                    : `0 0 0 1.5px ${c.text}55`,
                }}
              />
            ))}
          </div>
        )}

        {/* Text area — flex-1 so it fills remaining height */}
        <textarea
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          placeholder="Write something..."
          className="flex-1 w-full px-3 pb-1 pt-1 text-sm resize-none outline-none bg-transparent"
          style={{ color: noteColor.text, cursor: 'text', minHeight: 0 }}
        />

        {/* Footer: char count */}
        <div className="px-3 pb-1 flex-shrink-0 text-right">
          <span style={{ color: noteColor.text + '70', fontSize: 10 }}>
            {content.length}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Resize handle — sits outside the overflow:hidden container */}
      <div
        data-resize
        onMouseDown={handleResizeDown}
        className="absolute bottom-0 right-0 w-5 h-5 flex items-end justify-end cursor-se-resize"
        style={{ transform: 'translate(2px, 2px)' }}
        title="Resize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.35, color: noteColor.text }}>
          <line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="10" y1="6" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </motion.div>
  )
})

export default PostItNote
