const CACHE_VERSION = "musikpro-pwa-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

function isSafeStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  return /\.(?:css|js|woff2?|ttf|otf|png|jpg|jpeg|webp|avif|svg|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache API, auth, admin, payment or other private application data. The dashboard also
  // lives under a language prefix (/en/dashboard/…, /fr/demo/…): check the path as-is AND without
  // that prefix, so a prefixed private page can never be cached.
  const PRIVATE_PREFIXES = [
    "/api/",
    "/admin",
    "/dashboard",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/two-factor",
    "/demo",
    "/setup",
  ];
  const withoutLocale = url.pathname.replace(/^\/[a-z]{2,3}(?=\/|$)/, "") || "/";
  if (
    url.origin === self.location.origin &&
    [url.pathname, withoutLocale].some((path) => PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix)))
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (!isSafeStaticAsset(url)) return;

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone)));
          }
          return response;
        }),
    ),
  );
});
