'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import type { WebNotification } from '@/app/api/notifications/route'

export type { WebNotification }

const POLL_INTERVAL  = 20_000       // 20 seconds
const LS_KEY         = 'notif-last-checked'

function getLastChecked(): number {
  if (typeof localStorage === 'undefined') return 0
  return Number(localStorage.getItem(LS_KEY) ?? 0)
}
function setLastChecked(ts: number) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LS_KEY, String(ts))
}

export function useWebNotifications() {
  const [toasts, setToasts] = useState<WebNotification[]>([])
  const [unread, setUnread] = useState(0)
  const intervalRef          = useRef<ReturnType<typeof setInterval> | null>(null)

  const dismiss = useCallback((key: string) => {
    setToasts(prev => prev.filter(t => t.key !== key))
  }, [])

  const poll = useCallback(async () => {
    try {
      const since = getLastChecked()
      const res   = await fetch(`/api/notifications?since=${since}`)
      const data  = await res.json()
      const incoming: WebNotification[] = data.notifications ?? []
      if (!incoming.length) return

      // Advance the watermark to the newest entry we received
      const newest = Math.max(...incoming.map(n => n.createdAt))
      setLastChecked(newest)

      setToasts(prev => [...prev, ...incoming])
      setUnread(n => n + incoming.length)

      // OS-level notification (fires even when tab is visible — Mac popup)
      if (Notification.permission === 'granted') {
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

  // Poll on mount and on interval
  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [poll])

  // Poll immediately when tab regains focus
  useEffect(() => {
    const handler = () => { if (document.visibilityState === 'visible') poll() }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [poll])

  return { toasts, unread, dismiss, clearUnread: () => setUnread(0) }
}
