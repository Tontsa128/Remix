const CACHE_NAME = "elovio-shell-v3";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png",
];

const STATIC_ASSET_RE = /\.(?:png|svg|ico|webp|woff2?|webmanifest)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never intercept API, AI Studio auth/cookie-check, Vite dev, or HMR requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/__") ||
    url.pathname.startsWith("/_") ||
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.searchParams.has("t")
  ) {
    return;
  }

  // Navigations and code bundles: network-first, only cache valid 200 basic responses
  if (request.mode === "navigate" || !STATIC_ASSET_RE.test(url.pathname)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (
            response &&
            response.ok &&
            !response.redirected &&
            response.type === "basic"
          ) {
            const clone = response.clone();
            void caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("/")),
        ),
    );
    return;
  }

  // Static images/icons/manifest: cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (
          response &&
          response.ok &&
          !response.redirected &&
          response.type === "basic"
        ) {
          const clone = response.clone();
          void caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone));
        }
        return response;
      });
    }),
  );
});
