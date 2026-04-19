'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { AnyItem } from '@/types'

interface Props { items: AnyItem[] }

// Brief is considered stale after 30 min of being hidden/minimized
const STALE_MS = 30 * 60 * 1000

export default function AIBriefWidget({ items }: Props) {
  const [brief, setBrief]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const loadingRef             = useRef(false)
  const initialFetchDone       = useRef(false)
  const itemsRef               = useRef<AnyItem[]>(items)

  // Keep itemsRef in sync without triggering effects
  useEffect(() => { itemsRef.current = items }, [items])

  const getCacheKey = () =>
    `ai-brief-${new Date().toDateString()}-${Math.floor(new Date().getHours() / 3)}`

  const fetchBrief = useCallback(async (force = false) => {
    if (loadingRef.current) return
    const key = getCacheKey()
    if (!force) {
      const cached = sessionStorage.getItem(key)
      if (cached) { setBrief(cached); return }
    }
    if (itemsRef.current.length === 0) return
    loadingRef.current = true
    setLoading(true)
    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items:    itemsRef.current,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = await res.json()
      if (data.brief) {
        setBrief(data.brief)
        sessionStorage.setItem(key, data.brief)
        localStorage.setItem('ai-brief-fetched-at', Date.now().toString())
      } else {
        setBrief("Have a great day!")
      }
    } catch {
      setBrief("Couldn't reach the AI — have a great day!")
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  // Initial fetch — once items are available
  useEffect(() => {
    if (initialFetchDone.current || items.length === 0) return
    initialFetchDone.current = true
    fetchBrief()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, fetchBrief])

  // Smart refresh: fire when app becomes visible (opened from toolbar, tab switch, etc.)
  // Only regenerates if the brief is stale (>30 min) or the time-block has changed.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const ts = localStorage.getItem('ai-brief-fetched-at')
      const isStale = !ts || Date.now() - Number(ts) > STALE_MS
      // force=true when stale so we bypass the sessionStorage cache;
      // force=false when fresh — will use cached value if same time-block, else refetch
      fetchBrief(isStale)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchBrief])

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
