'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Maximize2, Minimize2, Send, ChevronDown,
  Search, CheckCircle2, AlertTriangle, Plus, Zap, XCircle, Trash2, User,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import type { ChatMessage, StepItem, StepIcon, StreamChunk, ContactRef } from '@/types'
import MarkdownMessage from './MarkdownMessage'

type ChatSize = 'bubble' | 'mini' | 'expanded'

interface FloatingChatProps {
  onRefreshItems: () => void
}

// dark-mode color → light-mode color (higher contrast on white)
const STEP_PALETTE: Record<StepIcon, { dark: string; light: string }> = {
  search: { dark: '#38bdf8', light: '#0369a1' },
  found:  { dark: '#34d399', light: '#047857' },
  warn:   { dark: '#fbbf24', light: '#b45309' },
  clash:  { dark: '#f87171', light: '#b91c1c' },
  add:    { dark: '#c084fc', light: '#7e22ce' },
  done:   { dark: '#34d399', light: '#047857' },
  err:    { dark: '#f87171', light: '#b91c1c' },
}

const WELCOME: ChatMessage = {
  id: '__welcome__',
  role: 'assistant',
  content: "Hi! I'm Laif. Ask me about your schedule, notes, or memories — or tell me what to add.",
  timestamp: new Date(),
}

// ─── NDJSON stream reader ───────────────────────────────────────────────────
async function readNDJSONStream(body: ReadableStream<Uint8Array>, onChunk: (c: StreamChunk) => void) {
  const reader = body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.trim()) continue
        try { onChunk(JSON.parse(line) as StreamChunk) } catch { /* skip */ }
      }
    }
    if (buf.trim()) { try { onChunk(JSON.parse(buf) as StreamChunk) } catch { /* skip */ } }
  } finally {
    reader.releaseLock()
  }
}

// ─── Step list ──────────────────────────────────────────────────────────────
function StepList({ steps, theme }: { steps: StepItem[]; theme: string }) {
  if (!steps.length) return null
  return (
    <div className="mb-2 space-y-1">
      {steps.map(step => {
        const color = (STEP_PALETTE[step.icon] ?? STEP_PALETTE.search)[theme === 'light' ? 'light' : 'dark']
        return (
          <motion.div key={step.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5">
            <span className="flex-shrink-0" style={{ color }}>{
              { search: <Search size={11} />, found: <CheckCircle2 size={11} />, warn: <AlertTriangle size={11} />,
                clash: <AlertTriangle size={11} />, add: <Plus size={11} />, done: <CheckCircle2 size={11} />, err: <XCircle size={11} /> }[step.icon]
            }</span>
            <span className="text-xs" style={{ color, opacity: 0.9 }}>{step.text}</span>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function FloatingChat({ onRefreshItems }: FloatingChatProps) {
  const router = useRouter()
  const { theme } = useTheme()
  const [hovered, setHovered]     = useState(false)
  const [size, setSize]           = useState<ChatSize>('bubble')
  const [messages, setMessages]   = useState<ChatMessage[]>([WELCOME])
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)
  const abortRef   = useRef<AbortController | null>(null)
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load conversation from MongoDB on mount ────────────────────────────
  useEffect(() => {
    fetch('/api/conversation')
      .then(r => r.json())
      .then((data: { messages?: ChatMessage[] }) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          // Re-hydrate dates
          setMessages(data.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })))
        }
      })
      .catch(() => { /* keep welcome */ })
      .finally(() => setLoaded(true))
  }, [])

  // ── Debounced save to MongoDB ─────────────────────────────────────────
  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      }).catch(() => { /* silent */ })
    }, 800)
  }, [loaded])

  // ── Clear conversation ─────────────────────────────────────────────────
  const clearConversation = useCallback(async () => {
    await fetch('/api/conversation', { method: 'DELETE' })
    setMessages([WELCOME])
  }, [])

  // ── Scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Focus input + scroll to bottom when opening ───────────────────────
  useEffect(() => {
    if (size !== 'bubble') {
      setTimeout(() => inputRef.current?.focus(), 120)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 80)
    }
  }, [size])

  const open   = () => setSize('mini')
  const close  = () => setSize('bubble')
  const toggle = () => setSize(s => s === 'expanded' ? 'mini' : 'expanded')

  // ── Send ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    const assistantId = (Date.now() + 1).toString()
    const assistantPlaceholder: ChatMessage = { id: assistantId, role: 'assistant', content: '', steps: [], timestamp: new Date() }

    setMessages(prev => {
      const next = [...prev, userMsg, assistantPlaceholder]
      persistMessages(next)
      return next
    })
    setStreaming(true)
    abortRef.current = new AbortController()

    try {
      const now = new Date()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          timezone:  Intl.DateTimeFormat().resolvedOptions().timeZone,
          localDate: now.toLocaleString('sv-SE', { timeZoneName: 'short' }), // "2026-04-02 14:30:00 GMT+5:30"
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      await readNDJSONStream(res.body, (chunk) => {
        if (chunk.t === 's') {
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantId) return m
            const step: StepItem = { id: `${assistantId}-${Date.now()}-${Math.random()}`, icon: chunk.icon, text: chunk.text }
            return { ...m, steps: [...(m.steps ?? []), step] }
          }))
        } else if (chunk.t === 'd') {
          setMessages(prev => {
            const next = prev.map(m => m.id === assistantId ? { ...m, content: chunk.text } : m)
            persistMessages(next)
            return next
          })
        } else if (chunk.t === 'contact_ref') {
          const ref: ContactRef = { id: chunk.id, name: chunk.name, role: chunk.role }
          setMessages(prev => prev.map(m => {
            if (m.id !== assistantId) return m
            return { ...m, contactRefs: [...(m.contactRefs ?? []), ref] }
          }))
        } else if (chunk.t === 'refresh') {
          onRefreshItems()
        } else if (chunk.t === 'err') {
          setMessages(prev => {
            const next = prev.map(m => m.id === assistantId ? { ...m, content: chunk.text } : m)
            persistMessages(next)
            return next
          })
        }
      })
    } catch (e) {
      const content = e instanceof Error && e.name === 'AbortError' ? 'Cancelled.' : 'Something went wrong. Please try again.'
      setMessages(prev => {
        const next = prev.map(m => m.id === assistantId ? { ...m, content } : m)
        persistMessages(next)
        return next
      })
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [input, streaming, messages, onRefreshItems, persistMessages])

  // ── Dimensions ─────────────────────────────────────────────────────────
  // mini: 360×420, expanded: ~38vw wide with generous top/bottom breathing room
  const expandedW = 'max(420px, 38vw)'
  const expandedH = 'calc(100vh - 160px)'
  const miniW = 360
  const miniH = 420

  const currentW = size === 'expanded' ? expandedW : miniW
  const currentH = size === 'expanded' ? expandedH : miniH

  return (
    <div className="fixed bottom-6 right-6 z-[400] flex flex-col items-end gap-3">
      <AnimatePresence mode="popLayout">
        {size !== 'bubble' && (
          <motion.div
            key="chatwindow"
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              width: currentW,
              height: currentH,
              background: 'var(--glass-card-bg)',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(35,61,255,0.1)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-dim)' }}
            >
              <div className="flex items-center gap-2.5">
                <Image src="/logo_new.png" alt="laif" unoptimized width={38} height={38} className="object-contain" />
                <p className="text-xs" style={{ color: streaming ? (theme === 'light' ? '#047857' : '#34d399') : 'var(--text-3)' }}>
                  {streaming ? 'Working...' : 'a real assistant'}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                {streaming && (
                  <button onClick={() => abortRef.current?.abort()} className="btn-ghost px-2 py-1 text-xs" style={{ color: theme === 'light' ? '#b91c1c' : '#f87171' }}>
                    Stop
                  </button>
                )}
                <button onClick={clearConversation} className="btn-ghost p-1.5" title="Clear conversation" style={{ color: 'var(--text-3)' }}>
                  <Trash2 size={12} />
                </button>
                <button onClick={toggle} className="btn-ghost p-1.5" title={size === 'expanded' ? 'Shrink' : 'Expand'}>
                  {size === 'expanded' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                </button>
                <button onClick={close} className="btn-ghost p-1.5">
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex items-start', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <Image src="/logo_new.png" alt="laif" unoptimized width={24} height={24} className="object-contain mr-2 flex-shrink-0" />
                  )}
                  <div style={{ maxWidth: size === 'expanded' ? '75%' : '82%' }}>
                    <div
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm',
                      )}
                      style={{
                        background: msg.role === 'user'
                          ? 'linear-gradient(135deg,rgba(35,61,255,0.75),rgba(6,182,212,0.5))'
                          : 'var(--input-bg)',
                        color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                        border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {msg.role === 'assistant' && <StepList steps={msg.steps ?? []} theme={theme} />}
                      {msg.content ? (
                        msg.role === 'assistant'
                          ? <MarkdownMessage content={msg.content} />
                          : <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : msg.role === 'assistant' && streaming ? (
                        <div className="flex gap-1 py-0.5">
                          {[0, 1, 2].map(i => (
                            <motion.span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-3)' }}
                              animate={{ y: [0, -4, 0] }}
                              transition={{ repeat: Infinity, delay: i * 0.15, duration: 0.6 }}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>

                    {/* Contact reference buttons */}
                    {msg.contactRefs && msg.contactRefs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {msg.contactRefs.map(ref => (
                          <button
                            key={ref.id}
                            onClick={() => {
                              close()
                              router.push(`/contacts?id=${ref.id}`)
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all active:scale-95"
                            style={{
                              background: 'rgba(35,61,255,0.12)',
                              border: '1px solid rgba(35,61,255,0.25)',
                              color: 'var(--accent)',
                            }}
                          >
                            <User size={11} />
                            {ref.name}
                            {ref.role && <span style={{ color: 'var(--text-3)' }}>· {ref.role}</span>}
                            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>→</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Ask about your schedule, notes, memories..."
                  className="flex-1 input-field resize-none text-sm py-2"
                  rows={1}
                  style={{ maxHeight: 100, minHeight: 38 }}
                  disabled={streaming}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-90 disabled:opacity-30"
                  style={{ background: 'linear-gradient(135deg,var(--accent),#06b6d4)' }}
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
              <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-3)' }}>
                I'll check your data before answering.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bubble button + hover text */}
      <div
        className="flex items-center gap-3"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* "chat with laif" label slides in from right */}
        <AnimatePresence>
          {hovered && size === 'bubble' && (
            <motion.span
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 14 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="text-sm font-medium whitespace-nowrap select-none pointer-events-none px-3 py-1.5 rounded-xl"
              style={{
                color: 'var(--text-1)',
                background: 'var(--glass-card-bg)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(12px)',
              }}
            >
              chat with laif
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          animate={{ scale: hovered ? 1.08 : 1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          onClick={() => size === 'bubble' ? open() : close()}
          className="w-14 h-14 flex items-center justify-center text-white relative"
          style={{ background: 'none', border: 'none', outline: 'none' }}
        >
          <AnimatePresence mode="wait">
            {size !== 'bubble' ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--accent), #06b6d4)', boxShadow: '0 8px 32px var(--accent-glow)' }}
              >
                <X size={22} />
              </motion.div>
            ) : (
              <motion.div
                key="logo"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  filter: [
                    'drop-shadow(0 0 4px rgba(35,61,255,0.3))',
                    'drop-shadow(0 0 14px rgba(35,61,255,0.65))',
                    'drop-shadow(0 0 4px rgba(35,61,255,0.3))',
                  ],
                }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{
                  scale: { type: 'spring', stiffness: 300, damping: 24 },
                  opacity: { duration: 0.2 },
                  filter: { repeat: Infinity, duration: 3, ease: 'easeInOut' },
                }}
              >
                <img src="/logo_new.png" alt="laif" width={56} height={56} className="object-contain rounded-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Streaming indicator */}
          {streaming && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 animate-pulse z-10"
              style={{ borderColor: 'var(--bg)' }} />
          )}
        </motion.button>
      </div>
    </div>
  )
}
