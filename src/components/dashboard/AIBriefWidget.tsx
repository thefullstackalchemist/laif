'use client'
import { useState, useEffect, useRef } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { AnyItem } from '@/types'

interface Props { items: AnyItem[] }

export default function AIBriefWidget({ items }: Props) {
  const [brief, setBrief]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchedRef             = useRef(false)
  const cacheKey               = `ai-brief-${new Date().toDateString()}`

  async function fetchBrief(force = false) {
    if (loading) return
    if (!force) {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) { setBrief(cached); return }
    }
    setLoading(true)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (data.brief) {
        setBrief(data.brief)
        sessionStorage.setItem(cacheKey, data.brief)
      } else {
        setBrief("Have a great day!")
      }
    } catch {
      setBrief("Couldn't reach the AI — have a great day!")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (fetchedRef.current || items.length === 0) return
    fetchedRef.current = true
    fetchBrief()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} style={{ color: 'var(--accent-light)' }} />
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
            AI Brief
          </p>
        </div>
        <button
          onClick={() => fetchBrief(true)}
          className="btn-ghost p-1"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 flex items-start">
        {loading ? (
          <div className="flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin flex-shrink-0"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
            <span className="text-xs">Generating your brief…</span>
          </div>
        ) : brief ? (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{brief}</p>
        ) : (
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {items.length === 0 ? 'Loading your schedule…' : 'Click ↻ to generate'}
          </p>
        )}
      </div>
    </div>
  )
}
