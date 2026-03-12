const CACHE = 'market-debriefs-v2';

const PRECACHE = [
  '/',
  '/app',
  '/manifest.json',
];

// Install — precache shell but DON'T skip waiting automatically
// This allows the update banner to show before activating the new SW
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  // Intentionally NOT calling self.skipWaiting() here
  // The update banner in the app will trigger it via postMessage
});

// Activate — clear old caches, claim clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Message — handle skip waiting request from the update banner
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch — network first for API calls, cache first for assets
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network-first for API routes
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline — no cached data available' }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Cache-first for static assets, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
