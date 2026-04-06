// Service worker — PWA install + Web Push notifications
const CACHE = 'laif-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => {
  // Pass-through — let the browser handle all requests normally
  e.respondWith(fetch(e.request))
})

// ── Web Push ──────────────────────────────────────────────────────────────────
self.addEventListener('push', e => {
  let data = {}
  try { data = e.data?.json() ?? {} } catch { data = { title: 'laif', body: e.data?.text() ?? '' } }

  const title   = data.title ?? 'laif'
  const options = {
    body:  data.body  ?? '',
    icon:  '/logo_new.png',
    badge: '/logo_new.png',
    tag:   data.tag   ?? 'laif-notification',
    data:  { url: data.url ?? '/' },
    vibrate: [200, 100, 200],
  }

  e.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url ?? '/'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url === url && 'focus' in c)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
