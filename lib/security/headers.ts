const production = process.env.NODE_ENV === "production";

/**
 * Domaines tiers autorisés à charger un script dans le navigateur (CSP `script-src`, voir lib/security/headers.ts).
 * Une balise de suivi qui charge un script hors de cette liste serait bloquée par la CSP : on la refuse donc dès
 * l'enregistrement (lib/tracking-tags/parse.ts) plutôt que de la laisser silencieusement inopérante.
 */
export const TRACKING_SCRIPT_HOSTS = [
  "https://connect.facebook.net",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://analytics.tiktok.com",
  "https://sc-static.net",
  "https://snap.licdn.com",
  "https://static.ads-twitter.com",
  "https://static.hotjar.com",
  "https://script.hotjar.com",
  "https://www.clarity.ms",
] as const;

/**
 * script-src uses a per-request nonce instead of 'unsafe-inline' — see proxy.ts, which
 * generates the nonce and is the only place this policy is emitted from. Next.js needs a
 * fresh nonce on every request to authorize its own hydration/RSC inline scripts, so this
 * can't be a static string computed once at build/import time like the rest of the headers
 * below; every page under the proxy's matcher must render dynamically for the nonce to exist.
 *
 * style-src intentionally keeps 'unsafe-inline': a CSP nonce only ever covers <script>/<style>
 * elements, never the `style="..."` HTML attribute — and this app uses React's `style={{}}`
 * extensively across the UI. Migrating that to Tailwind classes is a separate, much larger
 * refactor and not part of this hardening pass.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}'${production ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com ${TRACKING_SCRIPT_HOSTS.join(" ")}`,
    "frame-src https://challenges.cloudflare.com",
    "connect-src 'self' https:",
    ...(production ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Static, request-independent headers only — Content-Security-Policy is deliberately absent
 * here (see buildContentSecurityPolicy above) since it now needs a per-request nonce that
 * next.config.ts's build-time-computed headers() cannot provide; proxy.ts is the single place
 * that emits it, for every request its matcher covers.
 */
export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
];

/**
 * The service worker script is served with its own strict policy and is never cached by the
 * browser/CDN, so a new release of /sw.js is picked up immediately.
 */
export const serviceWorkerSecurityHeaders = [
  { key: "Content-Type", value: "application/javascript; charset=utf-8" },
  { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'",
  },
];
