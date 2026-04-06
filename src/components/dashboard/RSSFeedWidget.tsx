'use client'
import { useState, useEffect } from 'react'
import { ExternalLink, RefreshCw, Rss } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

const FEEDS = [
  { name: 'Hacker News',  url: 'https://news.ycombinator.com/rss' },
  { name: 'BBC News',     url: 'https://feeds.bbci.co.uk/news/rss.xml' },
  { name: 'Reuters',      url: 'https://feeds.reuters.com/reuters/topNews' },
  { name: 'TechCrunch',   url: 'https://techcrunch.com/feed/' },
]

export default function RSSFeedWidget() {
  const [feedIdx, setFeedIdx] = useState(0)
  const [items, setItems]     = useState<RSSItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  async function load(idx: number) {
    setLoading(true)
    setError(null)
    try {
      const feed = FEEDS[idx]
      const res = await fetch(`/api/rss?url=${encodeURIComponent(feed.url)}&name=${encodeURIComponent(feed.name)}`)
      const json = await res.json()
      if (json.error && !json.items?.length) throw new Error(json.error)
      setItems(json.items ?? [])
    } catch (e) {
      setError('Could not load feed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(feedIdx) }, [feedIdx])

  function formatAge(dateStr: string) {
    if (!dateStr) return ''
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Rss size={12} style={{ color: 'var(--accent-light)' }} />
        <p className="text-xs font-semibold tracking-widest uppercase flex-1" style={{ color: 'var(--text-3)' }}>
          News
        </p>
        <button
          onClick={() => load(feedIdx)}
          className="btn-ghost p-1"
          title="Refresh"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Feed selector */}
      <div className="flex gap-1 mb-3 flex-wrap flex-shrink-0">
        {FEEDS.map((f, i) => (
          <button
            key={f.name}
            onClick={() => setFeedIdx(i)}
            className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
            style={feedIdx === i
              ? { background: 'var(--accent)', color: '#fff' }
              : { background: 'var(--input-bg)', color: 'var(--text-3)' }
            }
          >
            {f.name}
          </button>
        ))}
      </div>

      {/* Articles */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && error && (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-3)' }}>{error}</p>
        )}

        {!loading && !error && items.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
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
              <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)', opacity: 0.7 }}>
                {formatAge(item.pubDate)}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
