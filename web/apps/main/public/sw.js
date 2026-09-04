// Holi.tools Service Worker
// Version is based on build timestamp for auto-invalidation
const CACHE_VERSION = 'holi-v' + Date.now().toString(36);
const CACHE_NAME = CACHE_VERSION;

// Assets to pre-cache on install
const PRE_CACHE = [
    '/',
    '/favicon.svg',
    '/offline.html',
    // Main language pages
    '/es/',
    '/fr/',
    '/de/',
    '/pt/',
    '/it/',
    '/zh/',
    '/ja/',
    '/ko/',
    '/ru/'
];

// Install: Pre-cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching assets for version:', CACHE_VERSION);
            return cache.addAll(PRE_CACHE).catch((err) => {
                // Don't fail install if some pages aren't built yet
                console.warn('[SW] Some assets failed to cache:', err);
                return cache.addAll(['/', '/favicon.svg', '/offline.html']);
            });
        })
    );
    // Activate immediately without waiting
    self.skipWaiting();
});

// Activate: Clean up ALL old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    // Delete any cache that isn't the current version
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch: Stale-while-revalidate for HTML, Cache-first for assets
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Ignore non-http requests
    if (!url.protocol.startsWith('http')) return;

    // Ignore external requests
    if (url.origin !== self.location.origin) return;

    // Determine if this is a static asset
    const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2|json)$/i);
    const isHTML = event.request.headers.get('Accept')?.includes('text/html');

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {

                // ASSETS: Cache-first (fast)
                if (isAsset && cachedResponse) {
                    // Return cached, but revalidate in background
                    fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            cache.put(event.request, networkResponse);
                        }
                    }).catch(() => { });
                    return cachedResponse;
                }

                // HTML: Network-first with cache fallback
                return fetch(event.request).then((networkResponse) => {
                    // Cache valid responses
                    if (networkResponse && networkResponse.ok) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Offline fallback
                    if (cachedResponse) return cachedResponse;

                    // Return offline page for HTML requests
                    if (isHTML) {
                        return cache.match('/offline.html');
                    }
                });
            });
        })
    );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
