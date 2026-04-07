'use client'
import { useState, useEffect, useCallback } from 'react'
import { ExternalLink, RefreshCw, Rss } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

interface Feed { name: string; url: string }

function parseDate(s: string): number {
  if (!s) return 0
  try { return new Date(s).getTime() } catch { return 0 }
}

export default function RSSFeedWidget() {
  const [activeFeeds, setActiveFeeds] = useState<Feed[]>([])
  const [activeFeed, setActiveFeed]   = useState<Feed | null>(null)
  const [items, setItems]             = useState<RSSItem[]>([])
  const [loading, setLoading]         = useState(true)

  // Load active feeds from preferences
  useEffect(() => {
    fetch('/api/preferences?key=rss')
      .then(r => r.json())
      .then(({ value }) => {
        const feeds: Feed[] = value?.activeFeeds ?? []
        setActiveFeeds(feeds)
        if (feeds.length) setActiveFeed(feeds[0])
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const load = useCallback(async (feed: Feed) => {
    setLoading(true)
    setItems([])
    try {
      const res  = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}&name=${encodeURIComponent(feed.name)}`)
      const json = await res.json()
      // Sort newest first
      const sorted = (json.items ?? []).sort(
        (a: RSSItem, b: RSSItem) => parseDate(b.pubDate) - parseDate(a.pubDate)
      )
      setItems(sorted)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (activeFeed) load(activeFeed) }, [activeFeed, load])

  function formatAge(dateStr: string) {
    if (!dateStr) return ''
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }) } catch { return '' }
  }

  if (!activeFeeds.length && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <Rss size={20} style={{ color: 'var(--text-3)' }} />
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>No RSS feeds selected.</p>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Add feeds in Settings → RSS.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Rss size={12} style={{ color: 'var(--accent-light)' }} />
        <p className="text-xs font-semibold tracking-widest uppercase flex-1" style={{ color: 'var(--text-3)' }}>RSS</p>
        <button onClick={() => activeFeed && load(activeFeed)} className="btn-ghost p-1" title="Refresh">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Feed tabs */}
      {activeFeeds.length > 1 && (
        <div className="flex gap-1 mb-3 flex-wrap flex-shrink-0">
          {activeFeeds.map(f => (
            <button
              key={f.url}
              onClick={() => setActiveFeed(f)}
              className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
              style={activeFeed?.url === f.url
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--input-bg)', color: 'var(--text-3)' }
              }
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      {/* Articles */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-3)' }}>No articles found.</p>
        )}
        {!loading && items.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
            className="block rounded-xl p-3 transition-colors group"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-snug flex-1" style={{ color: 'var(--text-1)' }}>
                {item.title}
              </p>
              <ExternalLink size={10} className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--text-3)' }} />
            </div>
            {item.description && (
              <p className="text-xs mt-1 leading-snug line-clamp-2" style={{ color: 'var(--text-3)' }}>
                {item.description}
              </p>
            )}
            {item.pubDate && (
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)', opacity: 0.7 }}>{formatAge(item.pubDate)}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
