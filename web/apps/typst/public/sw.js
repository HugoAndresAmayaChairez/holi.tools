// Holi Typst Service Worker
// Version is based on build timestamp for auto-invalidation
const CACHE_VERSION = 'holi-typst-v' + Date.now().toString(36);
const CACHE_NAME = CACHE_VERSION;

// Minimal precache: shell + offline
const PRE_CACHE = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE).catch(() => cache.addAll(['/offline.html']));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (!url.protocol.startsWith('http')) return;
  if (url.origin !== self.location.origin) return;

  const isHTML = event.request.headers.get('Accept')?.includes('text/html');
  const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|json|wasm)$/i);

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        // Cache-first for assets (including .wasm)
        if (isAsset && cachedResponse) {
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                cache.put(event.request, networkResponse);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Network-first for HTML
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            if (cachedResponse) return cachedResponse;
            if (isHTML) return cache.match('/offline.html');
          });
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
