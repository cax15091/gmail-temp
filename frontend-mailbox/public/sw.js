// Service Worker — TempMail Pro
const CACHE_NAME = 'tempmail-pro-v2';
const STATIC_ASSETS = ['/', '/index.html', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('railway.app') || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});

// ─── Show notification from SW (called by reg.showNotification in the app) ────
// This handler fires when the system delivers a push event from a server (future use)
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || '📬 TempMail Pro', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'new-message',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

// ─── Open / focus the app when user taps a notification ───────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // If app window is already open, focus it
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      // Otherwise open a new window
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
