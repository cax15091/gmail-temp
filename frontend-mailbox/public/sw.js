// Service Worker - TempMail Pro
const CACHE_NAME = 'tempmail-pro-v3';
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

// Network-First caching strategy to always get the latest updates
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('railway.app') || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Network succeeded, cache the latest version
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => {
        // Network failed (offline), try cache
        return caches.match(event.request);
      })
  );
});

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'TempMail Pro', {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'new-message',
      renotify: true,
      vibrate: [200, 100, 200],
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});
