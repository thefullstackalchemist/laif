'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WebNotification } from '@/app/api/notifications/route'

export type { WebNotification }

const POLL_INTERVAL = 20_000  // 20 seconds

export function useWebNotifications() {
  const [toasts, setToasts]   = useState<WebNotification[]>([])
  const [unread, setUnread]   = useState(0)
  const intervalRef            = useRef<ReturnType<typeof setInterval> | null>(null)

  const dismiss = useCallback((key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key))
  }, [])

  const poll = useCallback(async () => {
    try {
      const res  = await fetch('/api/notifications')
      const data = await res.json()
      const incoming: WebNotification[] = data.notifications ?? []
      if (!incoming.length) return

      setToasts(prev => [...prev, ...incoming])
      setUnread(n => n + incoming.length)

      // Browser notifications when tab is in background
      if (document.visibilityState === 'hidden' && Notification.permission === 'granted') {
        incoming.forEach(n => {
          new Notification(n.title, { body: n.body, icon: '/logo_new.png' })
        })
      }
    } catch {
      // silent — non-critical
    }
  }, [])

  // Request browser notification permission once
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  // Poll on mount and every 20 s
  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [poll])

  // Also poll immediately when tab becomes visible again
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [poll])

  return { toasts, unread, dismiss, clearUnread: () => setUnread(0) }
}
