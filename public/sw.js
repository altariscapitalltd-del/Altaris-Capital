// Pusher Beams: handle push notifications (must be at top when using existing service worker)
importScripts('https://js.pusher.com/beams/service-worker.js')

// Only cache long-lived static assets; HTML/JS are network-first
const STATIC_ASSETS = ['/icons/icon-192x192.png', '/icons/icon-512x512.png', '/manifest.json']

function getBuildId() {
  return fetch('/build-id.txt?t=' + Date.now(), { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : Promise.resolve('')))
    .then((t) => (t && t.trim()) || 'v' + Date.now().toString(36))
    .catch(() => 'v' + Date.now().toString(36))
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    getBuildId().then((id) => {
      const name = 'altaris-' + id + '-static'
      return caches.open(name).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    getBuildId().then((currentId) => {
      const keep = 'altaris-' + currentId + '-static'
      return caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('altaris-') && k !== keep).map((k) => caches.delete(k)))
      )
    }).then(() => self.clients.claim())
  )
})

// Network-first for everything except static assets: always get fresh UI after deploy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/')) return

  const isStatic = /\.(png|jpg|jpeg|gif|ico|svg|woff2?|manifest\.json)$/i.test(url.pathname) ||
    url.pathname === '/icons/icon-192x192.png' || url.pathname === '/icons/icon-512x512.png'

  if (isStatic) {
    event.respondWith(
      getBuildId().then((id) => {
        const cacheName = 'altaris-' + id + '-static'
        return caches.match(event.request).then((cached) =>
          cached || fetch(event.request).then((res) => {
            if (res.ok) {
              const clone = res.clone()
              caches.open(cacheName).then((c) => c.put(event.request, clone))
            }
            return res
          })
        )
      })
    )
    return
  }

  // HTML, JS, CSS: network-first so new deployments load immediately
  event.respondWith(
    fetch(event.request)
      .then((res) => res)
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'Altaris Capital', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url || '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const url = event.notification.data?.url || '/dashboard'
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
