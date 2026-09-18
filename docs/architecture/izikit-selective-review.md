# Revue sélective d'izikit → Africa SaaS Kit

Cette revue reprend des **principes**, pas du code copié à l'identique. Africa SaaS Kit conserve Next.js + Drizzle + Better Auth et ses providers africains optionnels.

## Ajouts retenus

- runtime Node.js explicite et gate CI pour les Route Handlers ;
- logger serveur structuré avec redaction récursive des clés sensibles ;
- request IDs sur les webhooks pour faciliter le diagnostic ;
- client HTTP générique qui ne retry automatiquement que GET/HEAD ;
- helper cron centralisé, fail-closed en production, compatible GET/POST ;
- smoke test système contre health/readiness/auth surface/robots/sitemap ;
- manifeste `config/features.json` pour éviter les doublons de fonctionnalités et clarifier la responsabilité de chaque route ;
- validation réelle du contenu image (magic bytes) avant upload Cloudinary.

## Éléments déjà présents, donc non dupliqués

- idempotence des paiements et webhooks ;
- Smart Router et suivi de santé des providers ;
- audit logs admin ;
- rate limiting ;
- health/readiness ;
- tests Vitest, ESLint, format et CI ;
- `DATABASE_URL_DIRECT` pour les migrations ;
- providers optionnels env-gated ;
- Cloudinary, Resend, Google OAuth, Banani, SEO, ngrok et Production Doctor.

## Éléments volontairement non ajoutés

- Prisma : Drizzle reste le socle; Prisma est réservé au CRUD Clients post-Banani ;
- JWT/CSRF maison : Better Auth gère l'authentification ;
- circuit breaker in-memory : le Smart Router exploite déjà la santé récente en base et évite les fallbacks ambigus ;
- Sentry/OTel : toujours non câblés dans cette version afin de ne pas ajouter des dépendances non vérifiées sans test d'installation réel ;
- outbox/email queue : utile lorsque le kit aura plusieurs side-effects asynchrones durables ; l'ajouter aujourd'hui doublerait inutilement des flux encore directs et introduirait une nouvelle infrastructure de retry/cron.

## Règle Cloudinary

Les URLs `secure_url` Cloudinary sont des URLs HTTPS mais restent publiques si le type de delivery est public. Le module inclus est destiné aux avatars/images publiques. Les pièces KYC, factures privées et documents sensibles exigent un mode de delivery authentifié/signé ou un proxy d'accès dédié.
