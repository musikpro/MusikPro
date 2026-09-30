# CSP stricte avec nonce — Africa SaaS Kit

Le kit utilise une Content-Security-Policy stricte pour les documents HTML, sans `unsafe-inline`.

- `proxy.ts` génère un nonce unique par requête HTML avec `crypto.randomUUID()`.
- Le même CSP est envoyé à Next.js dans les headers de requête et au navigateur dans la réponse.
- `app/layout.tsx` lit `x-nonce` et le transmet aux composants client via `NonceProvider`.
- Le script Cloudflare Turnstile reçoit explicitement le nonce.
- Les styles applicatifs utilisent des classes CSS; les attributs `style` sont interdits dans le HTML normal.
- Les routes de génération d'images (`opengraph-image`, `apple-icon`) peuvent utiliser des styles React car elles produisent une image et non le document HTML.
- `sw.js` possède des headers séparés : JavaScript explicite, no-cache et CSP `script-src 'self'`.

Validation :

```bash
npm run security:csp-check
```

Ce contrôle fait partie de `verify:code`, `verify:production`, `ci:check` et `security:release`.
