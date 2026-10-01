const CACHE_VERSION = "musikpro-pwa-v3";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icon.svg", "/icon-192.png", "/icon-512.png", "/icon-512-maskable.png"];

// Premier écran hors-ligne : on garde en cache la page d'accueil PUBLIQUE (jamais le tableau de bord). Elle est
// récupérée sans cookie (credentials: "omit"), donc c'est toujours la version visiteur, même si l'utilisateur
// est connecté ; une réponse redirigée ou non-HTML n'est jamais mise en cache.
// « / » n'est qu'une redirection vers la langue : on garde les vraies pages d'accueil par langue.
const LANDING_PATHS = ["/fr", "/en", "/es", "/pt"];
const DEFAULT_LANDING = "/fr";

async function cacheLanding() {
  const cache = await caches.open(CACHE_VERSION);
  const assets = new Set();
  for (const path of LANDING_PATHS) {
    try {
      const response = await fetch(path, { credentials: "omit", cache: "no-store" });
      const type = response.headers.get("content-type") || "";
      if (!response.ok || response.redirected || !type.includes("text/html")) continue;
      const html = await response.clone().text();
      await cache.put(path, response);
      // Ressources statiques de l'accueil (JS/CSS Next, images locales) pour qu'il s'affiche entièrement hors-ligne.
      for (const match of html.matchAll(
        /["'(](\/(?:_next\/static\/[^"'()\s]+|[^"'()\s]+\.(?:png|jpe?g|webp|avif|svg|ico|woff2?)))["')]/g,
      )) {
        assets.add(match[1].replace(/&amp;/g, "&"));
      }
    } catch {
      // Hors-ligne ou site indisponible : on garde la version déjà en cache.
    }
  }
  await Promise.all([...assets].slice(0, 120).map((asset) => cache.add(asset).catch(() => {})));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(cacheLanding),
  );
  self.skipWaiting();
});

self.addEventListener("message", (event) => {
  if (event.data === "refresh-landing") event.waitUntil(cacheLanding());
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
    // Hors-ligne : la racine (« / » ou « /fr », « /en »…) affiche l'accueil public mis en cache ; le reste
    // (pages privées incluses) retombe sur la page hors-ligne.
    const isRoot = url.origin === self.location.origin && /^\/(?:[a-z]{2,3})?\/?$/.test(url.pathname);
    event.respondWith(
      fetch(request).catch(async () => {
        if (isRoot) {
          const asked = url.pathname.replace(/\//g, "");
          const preferred = asked || (request.headers.get("accept-language") || "").slice(0, 2).toLowerCase();
          for (const code of [preferred, DEFAULT_LANDING.slice(1)]) {
            const landing = await caches.match(`/${code}`);
            if (landing) return landing;
          }
        }
        return caches.match(OFFLINE_URL);
      }),
    );
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
