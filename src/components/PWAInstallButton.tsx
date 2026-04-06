'use client'
import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

type Platform = 'chrome' | 'ios' | null

export default function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform]             = useState<Platform>(null)
  const [showIOSTip, setShowIOSTip]         = useState(false)
  const [installed, setInstalled]           = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Detect iOS (no beforeinstallprompt support)
    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    const isInStandaloneMode = (window.navigator as any).standalone === true
      || window.matchMedia('(display-mode: standalone)').matches

    if (isInStandaloneMode) { setInstalled(true); return }

    if (isIOS) { setPlatform('ios'); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('chrome')
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function installChrome() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferredPrompt(null)
    setPlatform(null)
  }

  if (installed || !platform) return null

  if (platform === 'ios') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowIOSTip(t => !t)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
        >
          <Share size={12} />
          Install
        </button>

        {showIOSTip && (
          <div
            className="absolute bottom-10 right-0 w-64 rounded-2xl p-4 z-50 shadow-2xl"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-1)' }}>Add to Home Screen</p>
              <button onClick={() => setShowIOSTip(false)} className="btn-ghost p-0.5 -mt-0.5">
                <X size={12} />
              </button>
            </div>
            <ol className="space-y-1.5">
              {[
                <>Tap the <Share size={11} className="inline mx-0.5" style={{ color: 'var(--accent-light)' }} /> <b>Share</b> button in Safari</>,
                <>Scroll down and tap <b>Add to Home Screen</b></>,
                <>Tap <b>Add</b> to confirm</>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-2)' }}>
                  <span className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)' }}>
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={installChrome}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
      style={{ background: 'var(--accent-dim)', color: 'var(--accent-light)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
    >
      <Download size={12} />
      Install app
    </button>
  )
}
