# Production Checklist — Africa SaaS Kit V0.8.2

## Accounts and source code
- [ ] GitHub MFA enabled for privileged maintainers.
- [ ] Branch protection / required reviews enabled for production branch.
- [ ] `.env*`, provider credentials and database URLs are not committed.
- [ ] Dependency lockfile is committed after `npm install`.

## Database
- [ ] Separate Neon production project/branch from local development.
- [ ] Least-privilege database role used by the application where practical.
- [ ] Restore procedure tested, not merely backups enabled.

## Authentication
- [ ] Production `BETTER_AUTH_SECRET` is unique and securely stored.
- [ ] Email verification works on the production domain.
- [ ] Admin accounts use 2FA.
- [ ] Password reset and session revocation tested.

## Payments
- [ ] Sandbox success/failure/cancel flows tested for every enabled provider.
- [ ] Webhook/IPN authenticity verification tested.
- [ ] Webhook replay/idempotency tested.
- [ ] Amount, currency and internal reference are re-verified server-side.
- [ ] No provider is marked enabled solely because its logo/button exists.
- [ ] Live keys are stored only in production secret storage.

## Web and infrastructure
- [ ] HTTPS only.
- [ ] CSP/HSTS and other security headers verified in production.
- [ ] Rate limits tested without blocking normal mobile-network users.
- [ ] Turnstile/bot protection enabled on abuse-prone flows if configured.
- [ ] R2 buckets private by default; signed URLs used for private files.

## Monitoring and incident response
- [ ] Error monitoring configured.
- [ ] Audit/security events reviewed.
- [ ] Payment provider outage/fallback procedure documented.
- [ ] Secret rotation procedure known.
- [ ] Incident contacts and rollback procedure documented.

## V0.8.2 — Gates ajoutés

### Paiements sandbox locaux
- [ ] `npm run payments:local` a généré les URL webhook ngrok attendues.
- [ ] Chaque provider activé a été testé en sandbox avec succès + échec/annulation + pending/retard.
- [ ] Un webhook dupliqué/rejoué ne crée pas de double fulfillment.
- [ ] La signature/IPN invalide est refusée.
- [ ] Le webhook production utilise le vrai domaine HTTPS, jamais une URL ngrok temporaire.

### Mobile-first
- [ ] `npm run mobile:check` passe.
- [ ] Écrans essentiels vérifiés à 320/360/390/430 px.
- [ ] Tablette vérifiée à 768/1024 px.
- [ ] Desktop vérifié à 1440 px.
- [ ] Aucun scroll horizontal global.
- [ ] Navigation principale utilisable au pouce et safe area respectée.
- [ ] Checkout et retour Mobile Money testés depuis un viewport/téléphone mobile.


## Domaine / DNS
- [ ] Fournisseur de domaine/DNS choisi (Cloudflare ou autre).
- [ ] Si Cloudflare est utilisé, Phase 17 validée avec les enregistrements exacts Vercel.
- [ ] Si Cloudflare n’est pas utilisé, Phase 17 explicitement `skipped`.

- [ ] Si Cloudinary est utilisé, Phase 18 validée avec upload réel + tests de refus.
- [ ] Sinon, Phase 18 explicitement `skipped`.

## Conformité finale des fichiers

- [ ] `npm run conformity:check` retourne PASS et `generated/conformity-report.md` ne contient aucun FAIL.

## Health, tests et migrations
- [ ] `/api/health` répond 200.
- [ ] `/api/readyz` répond 200 sur staging/production.
- [ ] `npm run format:check` passe.
- [ ] `npm run lint` passe.
- [ ] `npm run test` passe.
- [ ] `npm run typecheck` passe.
- [ ] `npm run build` passe.
- [ ] `npm run audit:prod` ne contient aucun HIGH/CRITICAL non accepté.
- [ ] Les migrations `db/migrations/` sont générées, relues, testées et commitées.
- [ ] `DATABASE_URL_DIRECT` est configurée si une connexion directe Neon est utilisée pour les migrations.


## V0.8.26 — Security Baseline Gate

- [ ] `npm run security:baseline` retourne PASS.
- [ ] `.env.local` est ignoré par Git; aucune clé secrète n'utilise `NEXT_PUBLIC_*`.
- [ ] Chaque nouvelle route API est classifiée pour authentification, validation serveur et rate limiting.
- [ ] Chaque nouvelle table est classifiée RLS; toute exemption a une justification explicite.
- [ ] Les tables utilisateur/tenant requises ont RLS + policy en base (`npm run security:db-check`).
- [ ] Le middleware/proxy d'authentification protège toujours `/dashboard` et `/admin`.
- [ ] La vérification email production est activée et testée.
- [ ] Le rate limiting distribué est configuré pour les routes sensibles en production.
- [ ] `npm run audit:prod` ne remonte aucun HIGH/CRITICAL non accepté.
- [ ] `npm run security:release` puis `npm run verify:production` passent avant livraison.
