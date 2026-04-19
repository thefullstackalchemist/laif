'use client'
import { useState, useEffect, useCallback } from 'react'
import type { WebNotification } from '@/app/api/notifications/route'

export type { WebNotification }

const LS_KEY = 'notif-last-checked'

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

  // TODO: Replace polling with Firebase push notifications
  // Polling disabled — was exhausting Vercel function calls (every 20s per tab)

  return { toasts, unread, dismiss, clearUnread: () => setUnread(0) }
}
