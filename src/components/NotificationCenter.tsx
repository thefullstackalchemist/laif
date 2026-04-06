'use client'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, X, Calendar, CheckSquare, BellRing } from 'lucide-react'
import { useWebNotifications } from '@/hooks/useWebNotifications'
import { formatDistanceToNow } from 'date-fns'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToArrayBuffer(b64: string): ArrayBuffer {
  const pad  = '='.repeat((4 - b64.length % 4) % 4)
  const raw  = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const buf  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

async function ensurePushSubscription() {
  try {
    if (!VAPID_PUBLIC_KEY || !('serviceWorker' in navigator) || !('PushManager' in window)) return

    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return

    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
    })

    await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
    })
  } catch {
    // non-critical
  }
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  event:    <Calendar  size={13} />,
  task:     <CheckSquare size={13} />,
  reminder: <BellRing  size={13} />,
}

const TYPE_COLOR: Record<string, string> = {
  event:    'var(--color-event)',
  task:     'var(--color-task)',
  reminder: 'var(--color-reminder)',
}

export default function NotificationCenter() {
  const { toasts, unread, dismiss, clearUnread } = useWebNotifications()

  // Register SW + subscribe to Web Push on every page load
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => ensurePushSubscription())
        .catch(err => console.error('[sw] registration failed:', err))
    }
  }, [])

  // Clear badge when user sees toasts
  useEffect(() => {
    if (toasts.length > 0) clearUnread()
  }, [toasts.length])

  return (
    <>
      {/* Toast stack — bottom-right */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 340 }}>
        <AnimatePresence>
          {toasts.map(toast => {
            const color = TYPE_COLOR[toast.type] ?? 'var(--accent-light)'
            const Icon  = TYPE_ICON[toast.type]  ?? <Bell size={13} />
            return (
              <motion.div
                key={toast.key}
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0,  scale: 1    }}
                exit={{    opacity: 0, y: 8,  scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl shadow-2xl"
                style={{
                  background: 'var(--card)',
                  border: `1px solid ${color}40`,
                  boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px ${color}20`,
                }}
              >
                {/* Left color bar */}
                <div className="w-0.5 self-stretch rounded-full flex-shrink-0" style={{ background: color }} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span style={{ color }}>{Icon}</span>
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-1)' }}>
                      {toast.title}
                    </p>
                  </div>
                  <p className="text-xs leading-snug" style={{ color: 'var(--text-2)' }}>
                    {toast.body}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>
                    {formatDistanceToNow(toast.createdAt, { addSuffix: true })}
                  </p>
                </div>

                {/* Dismiss */}
                <button
                  onClick={() => dismiss(toast.key)}
                  className="flex-shrink-0 p-0.5 rounded-md transition-colors hover:opacity-70"
                  style={{ color: 'var(--text-3)' }}
                >
                  <X size={12} />
                </button>

                {/* Auto-dismiss after 7 s */}
                <AutoDismiss ms={7000} onDismiss={() => dismiss(toast.key)} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </>
  )
}

function AutoDismiss({ ms, onDismiss }: { ms: number; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, ms)
    return () => clearTimeout(id)
  }, [ms, onDismiss])
  return null
}
