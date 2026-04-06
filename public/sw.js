// Minimal service worker — enables PWA install prompt
// No caching strategy; all requests pass through to the network.
const CACHE = 'laif-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', e => {
  // Pass-through — let the browser handle all requests normally
  e.respondWith(fetch(e.request))
})
