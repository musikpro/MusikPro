const production = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${production ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
  "frame-src https://challenges.cloudflare.com",
  "connect-src 'self' https:",
  ...(production ? ["upgrade-insecure-requests"] : []),
].join("; ");

export const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(production ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }] : []),
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];
