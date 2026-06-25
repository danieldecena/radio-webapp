// ==============================================
// 96.6 ROM — SERVICE WORKER
// ==============================================
//
// Offline target: the pre-rendered show player (player.html). Once installed,
// the player works identically online and offline.
//
// Caching strategy:
//   • Navigation (HTML)      → network-first  (fresh app shell online,
//                              fall back to cached player.html when offline)
//   • App shell (CSS/JS/etc) → stale-while-revalidate (fast from cache,
//                              refresh in the background for the next load)
//   • Show / music / audio   → cache-on-play  (the first network play stores the
//                              FULL file in the media cache; later plays — including
//                              offline + seek/scrub — are served from it)
//   • API / TTS functions    → network-only   (never cache dynamic responses)
//
// Two caches, versioned independently:
//   SHELL_CACHE  — small app shell; purged on every version bump.
//   MEDIA_CACHE  — downloaded shows/music; NOT purged on bump, so audio the user
//                  has already played survives app updates.
//
// IMPORTANT: bump SHELL_VERSION on every deploy that changes shell assets.

const SHELL_VERSION = "v3";
const SHELL_CACHE = `rom-radio-shell-${SHELL_VERSION}`;
const MEDIA_CACHE = "rom-radio-media";

// Player-first app shell. shows/data.js + shows/manifest.json may not exist
// until build_shows.py runs, so install tolerates per-item misses.
const SHELL_ASSETS = [
  "/",
  "/player.html",
  "/shows/data.js",
  "/shows/manifest.json",
  "/manifest.json",
  "/icon.png",
  "/favicon.ico",
];

const isMedia = (pathname) =>
  /^\/(shows|music|audio)\//.test(pathname) &&
  !pathname.endsWith("/data.js") &&
  !pathname.endsWith("/manifest.json");

// Install: pre-cache the shell, tolerating individual misses
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))),
    ),
  );
  self.skipWaiting();
});

// Activate: drop old shell versions; keep SHELL_CACHE + MEDIA_CACHE
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== SHELL_CACHE && key !== MEDIA_CACHE) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
  self.clients.claim();
});

// Serve a (possibly ranged) request from an already-cached full media response.
async function serveFromCached(request, fullResponse) {
  const range = request.headers.get("range");
  if (!range) return fullResponse;

  // "bytes=START-END" — slice the cached body into a 206 Partial Content.
  const buf = await fullResponse.arrayBuffer();
  const total = buf.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  const start = match ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : total - 1;
  const slice = buf.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type":
        fullResponse.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": String(slice.byteLength),
      "Accept-Ranges": "bytes",
    },
  });
}

// Cache-on-play: serve media from MEDIA_CACHE, fetching+storing the full file on miss.
async function handleMedia(request) {
  const url = new URL(request.url);
  const cache = await caches.open(MEDIA_CACHE);

  // Look up the FULL resource (ignore the Range header).
  const cached = await cache.match(url.pathname);
  if (cached) return serveFromCached(request, cached.clone());

  // Miss → fetch the WHOLE file (no Range) so the entire show ends up cached.
  try {
    const fullResponse = await fetch(url.pathname);
    if (fullResponse && fullResponse.status === 200) {
      await cache.put(url.pathname, fullResponse.clone());
    }
    return serveFromCached(request, fullResponse);
  } catch {
    return new Response(null, { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GETs; skip cross-origin (e.g. ElevenLabs, CDNs)
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // API / serverless functions → always network, never cache
  if (
    url.pathname.includes("/api/") ||
    url.pathname.includes("/.netlify/functions/")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Show / music / audio → cache-on-play (range-aware)
  if (isMedia(url.pathname)) {
    event.respondWith(handleMedia(request));
    return;
  }

  // Navigation requests (HTML) → network-first, cache fallback for offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/player.html")),
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
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => cached);

      // Serve cache immediately if present; otherwise wait on the network
      return cached || networkFetch;
    }),
  );
});
