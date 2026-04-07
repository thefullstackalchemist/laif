'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, Rss, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Feed { name: string; url: string }

const MAX_ACTIVE = 3

// Preset feeds — user can add more
const PRESET_FEEDS: Feed[] = [
  { name: 'Finshots Daily',       url: 'https://finshots.in/rss/' },
  { name: 'Stratechery',          url: 'https://stratechery.com/feed/' },
  { name: 'Moneycontrol',         url: 'https://www.moneycontrol.com/rss/latestnews.xml' },
  { name: 'Node Weekly',          url: 'https://nodeweekly.com/rss' },
  { name: 'JavaScript Weekly',    url: 'https://javascriptweekly.com/rss' },
  { name: 'V8 Engine Blog',       url: 'https://v8.dev/blog.atom' },
  { name: 'Hacker News Best',     url: 'https://news.ycombinator.com/bestrss' },
  { name: 'Engineering at Meta',  url: 'https://engineering.fb.com/feed/' },
  { name: 'Node.js Releases',     url: 'https://github.com/nodejs/node/releases.atom' },
]

export default function RSSSettings() {
  const [allFeeds, setAllFeeds]       = useState<Feed[]>(PRESET_FEEDS)
  const [activeUrls, setActiveUrls]   = useState<Set<string>>(new Set())
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // Custom feed form
  const [newName, setNewName]         = useState('')
  const [newUrl, setNewUrl]           = useState('')
  const [addError, setAddError]       = useState('')

  // Load saved preferences
  useEffect(() => {
    fetch('/api/preferences?key=rss')
      .then(r => r.json())
      .then(({ value }) => {
        const active: Feed[] = value?.activeFeeds ?? []
        // Merge any custom feeds (not in presets) back into allFeeds
        const presetUrls = new Set(PRESET_FEEDS.map(f => f.url))
        const customs = active.filter(f => !presetUrls.has(f.url))
        if (customs.length) setAllFeeds(prev => [...prev, ...customs])
        setActiveUrls(new Set(active.map(f => f.url)))
      })
      .catch(() => {})
  }, [])

  function toggleActive(feed: Feed) {
    setActiveUrls(prev => {
      const next = new Set(prev)
      if (next.has(feed.url)) {
        next.delete(feed.url)
      } else {
        if (next.size >= MAX_ACTIVE) return prev   // cap at 3
        next.add(feed.url)
      }
      return next
    })
    setSaved(false)
  }

  function addCustomFeed() {
    const name = newName.trim()
    const url  = newUrl.trim()
    if (!name)  { setAddError('Enter a feed name.'); return }
    if (!url)   { setAddError('Enter a URL.'); return }
    if (!url.startsWith('http')) { setAddError('URL must start with http(s).'); return }
    if (allFeeds.find(f => f.url === url)) { setAddError('Feed already exists.'); return }
    setAllFeeds(prev => [...prev, { name, url }])
    setNewName('')
    setNewUrl('')
    setAddError('')
    setSaved(false)
  }

  function removeFeed(url: string) {
    setAllFeeds(prev => prev.filter(f => f.url !== url))
    setActiveUrls(prev => { const n = new Set(prev); n.delete(url); return n })
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    const activeFeeds = allFeeds.filter(f => activeUrls.has(f.url))
    await fetch('/api/preferences', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ key: 'rss', value: { activeFeeds } }),
    })
    setSaving(false)
    setSaved(true)
  }

  const activeCount = activeUrls.size

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>RSS Feeds</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Select up to {MAX_ACTIVE} feeds to show on the dashboard. Latest articles appear first.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium transition-opacity disabled:opacity-50"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {saved ? <><Check size={12} /> Saved</> : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Active count indicator */}
      <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Star size={12} style={{ color: 'var(--accent-light)' }} />
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>
          <span className="font-semibold" style={{ color: 'var(--text-1)' }}>{activeCount}</span> of {MAX_ACTIVE} active feeds selected
        </span>
        {activeCount === MAX_ACTIVE && (
          <span className="text-xs ml-auto" style={{ color: 'var(--text-3)' }}>Deselect one to swap</span>
        )}
      </div>

      {/* Feed list */}
      <div className="space-y-2 mb-6">
        <AnimatePresence initial={false}>
          {allFeeds.map(feed => {
            const isActive   = activeUrls.has(feed.url)
            const isPreset   = PRESET_FEEDS.some(p => p.url === feed.url)
            const isDisabled = !isActive && activeCount >= MAX_ACTIVE

            return (
              <motion.div
                key={feed.url}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{    opacity: 0, x: 40 }}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{
                  background: isActive ? 'var(--accent-dim)' : 'var(--card)',
                  border: `1px solid ${isActive ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--border)'}`,
                  opacity: isDisabled ? 0.45 : 1,
                  transition: 'background 0.15s, border 0.15s, opacity 0.15s',
                }}
              >
                <Rss size={13} style={{ color: isActive ? 'var(--accent-light)' : 'var(--text-3)', flexShrink: 0 }} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}>
                    {feed.name}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-3)' }}>{feed.url}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleActive(feed)}
                    disabled={isDisabled}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed"
                    style={isActive
                      ? { background: 'var(--accent)', color: '#fff' }
                      : { background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--border)' }
                    }
                  >
                    {isActive ? <><Check size={10} /> Active</> : 'Select'}
                  </button>

                  {/* Remove (custom only) */}
                  {!isPreset && (
                    <button
                      onClick={() => removeFeed(feed.url)}
                      className="p-1.5 rounded-lg transition-opacity hover:opacity-60"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Add custom feed */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-3)' }}>ADD CUSTOM FEED</p>
        <div className="flex gap-2">
          <input
            placeholder="Feed name"
            value={newName}
            onChange={e => { setNewName(e.target.value); setAddError('') }}
            className="input-field text-sm flex-1"
            style={{ minWidth: 0 }}
          />
          <input
            placeholder="https://example.com/rss"
            value={newUrl}
            onChange={e => { setNewUrl(e.target.value); setAddError('') }}
            onKeyDown={e => { if (e.key === 'Enter') addCustomFeed() }}
            className="input-field text-sm flex-[2]"
            style={{ minWidth: 0 }}
          />
          <button
            onClick={addCustomFeed}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium flex-shrink-0"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {addError && <p className="text-xs" style={{ color: '#ef4444' }}>{addError}</p>}
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Supports RSS 2.0 and Atom feeds.</p>
      </div>
    </section>
  )
}
