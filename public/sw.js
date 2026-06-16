// ==============================================
// 96.6 ROM — SERVICE WORKER
// ==============================================
//
// Caching strategy:
//   • Navigation (HTML)      → network-first  (always get fresh app shell online,
//                              fall back to cache when offline)
//   • Static app assets      → stale-while-revalidate (serve fast from cache,
//                              refresh the cache in the background so the *next*
//                              load is up to date — no more waiting on a version bump)
//   • API / TTS functions    → network-only   (never cache dynamic responses)
//
// IMPORTANT: bump CACHE_VERSION on every deploy that changes cached assets so
// old caches are purged on activate.

const CACHE_VERSION = "v2";
const CACHE_NAME = `rom-radio-${CACHE_VERSION}`;

const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/breaks.js",
  "/manifest.json",
  "/icon.png",
  "/favicon.ico",
];

// Install: pre-cache the core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  self.skipWaiting();
});

// Activate: remove caches from older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GETs; skip cross-origin (e.g. ElevenLabs, CDNs)
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  // API / serverless functions → always network, never cache
  if (
    request.url.includes("/api/") ||
    request.url.includes("/.netlify/functions/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation requests (HTML) → network-first, cache fallback for offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/index.html")),
        ),
    );
    return;
  }

  // Everything else (CSS/JS/icons) → stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);

      // Serve cache immediately if present; otherwise wait on the network
      return cached || networkFetch;
    }),
  );
});
