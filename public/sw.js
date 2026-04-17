// public/sw.js
// MarketDebriefs Service Worker
// Handles PWA install caching + Web Push notifications

const CACHE_NAME = "marketdebriefs-v2";
const STATIC_ASSETS = ["/", "/app", "/landing.html", "/index.html"];

// ── Install: cache static assets ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .catch(() => {}) // Non-fatal if assets not available
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: network first, cache fallback ────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Only handle GET requests for same-origin or CDN assets
  if (event.request.method !== "GET") return;

  // Don't intercept API calls
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Push: receive push notification from server ──────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "MarketDebriefs", body: event.data ? event.data.text() : "New alert" };
  }

  const title   = data.title   || "MarketDebriefs - Breaking Alert";
  const options = {
    body:    data.body    || "A new breaking narrative has been detected.",
    icon:    data.icon    || "/icon-192.png",
    badge:   data.badge   || "/icon-192.png",
    tag:     data.tag     || "breaking-narrative",
    renotify: true,
    requireInteraction: data.urgency === "CRITICAL",
    data: {
      url: data.url || "https://marketdebriefs.com/app",
    },
    actions: [
      { action: "open", title: "View Brief" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click: open app to Breaking tab ────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "https://marketdebriefs.com/app";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If app already open, focus it
        for (const client of clientList) {
          if (client.url.includes("marketdebriefs.com") && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
