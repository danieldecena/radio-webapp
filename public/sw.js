// ==============================================
// 96.6 ROM — SERVICE WORKER
// ==============================================

const CACHE_NAME = "rom-radio-v1";
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

// Install Event: Cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching all: app shell and content");
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        }),
      );
    }),
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch Event: Cache First, Network Fallback
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests (like Spotify)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle API calls - Network First (don't cache dynamic API responses)
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("/.netlify/functions/")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Handle static assets - Cache First
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      // Otherwise fetch from network
      return fetch(event.request).then((networkResponse) => {
        // Don't cache if response is not valid
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== "basic"
        ) {
          return networkResponse;
        }

        // Clone response to put in cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }),
  );
});
