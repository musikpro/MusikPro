# Ce que le starter embarque

## Backend / application

- Next.js App Router + Route Handlers
- Neon PostgreSQL + Drizzle ORM
- Better Auth (auth, organisations, rôles, 2FA)
- Resend pour les emails
- API de health/readiness
- Admin, paiements, webhooks, uploads Cloudinary optionnels et cron de réconciliation

## Qualité

- TypeScript `typecheck`
- ESLint + règles Next.js Core Web Vitals
- Prettier en mode `format:check`
- Vitest pour les bibliothèques sensibles
- Build Next.js
- `npm audit --omit=dev --audit-level=high`
- contrôles sécurité/mobile/skeleton/SEO/conformité du kit

## Base de données

Les migrations du socle sont **Drizzle**. Prisma est utilisé uniquement par la brique optionnelle CRUD Clients post-Banani. Après génération, les fichiers sous `db/migrations/` doivent être versionnés dans Git. `DATABASE_URL_DIRECT` peut être utilisée par Drizzle Kit pour les migrations; l'application continue d'utiliser `DATABASE_URL`.

## Fournisseurs optionnels

Les fournisseurs absents restent inertes. Paiements, Cloudflare et Cloudinary ne sont jamais obligatoires pour un SaaS qui n'en a pas besoin.

## Robustesse V0.8.16

- `runtime:check` : chaque route API est explicitement Node.js ;
- `features:list` / `features:check` : inventaire des responsabilités et prévention des doublons ;
- observabilité de base : logs structurés avec redaction récursive + request IDs ;
- `apiFetch` : retry réseau uniquement sur GET/HEAD ;
- `smoke:system` : health/readiness/auth surface/SEO ;
- cron paiement optionnel généré seulement si les paiements sont activés ;
- Cloudinary : validation du MIME **et** des octets de signature de l'image.
