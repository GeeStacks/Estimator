const CACHE_NAME = "panel-board-builder-v12";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./po.js",
  "./admin.js",
  "./db.js",
  "./data.js",
  "./busbars.js",
  "./assemblies.js",
  "./seed_extra.js",
  "./box_seed.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/jn-controls-logo.png",
  "./icons/app-logo.png",
  "./icons/jn-pwa-icon-192.png",
  "./icons/jn-pwa-icon-512.png"
];

// 1. INSTALL: Cache app shell & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// 2. ACTIVATE: Purge old cache versions instantly
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 3. FETCH: Stale-While-Revalidate Strategy
self.addEventListener("fetch", (event) => {
  // Only intercept standard GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip caching cross-origin requests or browser extensions
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Background revalidation fetch
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // Silent fail if offline

      // Return instant cached asset if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});