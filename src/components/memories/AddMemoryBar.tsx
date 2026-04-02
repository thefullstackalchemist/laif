'use client'
import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Send, Loader2 } from 'lucide-react'

interface AddMemoryBarProps {
  onAdd: (text: string) => Promise<void>
}

const PLACEHOLDERS = [
  'Remember The Alchemist by Paulo Coelho…',
  'Remember John with number +1-555-0123…',
  'Remember to buy Nescafé coffee powder…',
  'Remember Inception, great Christopher Nolan film…',
  'Remember to call the dentist on Friday…',
]

export default function AddMemoryBar({ onAdd }: AddMemoryBarProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)])
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setLoading(true)
    try {
      await onAdd(trimmed)
      setText('')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
      style={{
        background: 'var(--glass-card-bg)',
        border: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
      >
        <Brain size={16} />
      </div>

      <input
        ref={inputRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit() }}
        placeholder={placeholder}
        disabled={loading}
        className="flex-1 bg-transparent outline-none text-sm disabled:opacity-50"
        style={{ color: 'var(--text-1)' }}
      />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </motion.div>
        ) : text.trim() ? (
          <motion.button
            key="send"
            type="submit"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-white active:scale-95 transition-transform"
            style={{ background: 'var(--accent)' }}
          >
            <Send size={12} />
          </motion.button>
        ) : null}
      </AnimatePresence>
    </form>
  )
}
