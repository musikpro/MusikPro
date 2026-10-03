# Africa SaaS Kit V0.11.6 — RBAC + Multi-tenant Readiness

## Périmètre demandé

La checklist SaaS a été comparée à la V0.11.5. Les éléments déjà couverts n'ont pas été dupliqués : authentification, sécurité, base de données, paiements, email, stockage, rate limiting, tests, observabilité, administration, staging et production.

Deux éléments manquaient comme gates dédiés avec voyants :

1. **RBAC — rôles et permissions**
2. **Multi-tenant — isolation organisations**

## Ajouts

- `lib/auth/organization-access.ts` vérifie côté serveur qu'un utilisateur appartient réellement à l'organisation demandée.
- `lib/auth/permissions.ts` couvre maintenant les rôles organisationnels `owner`, `admin`, `member` en plus des rôles application.
- `scripts/access-control-check.mjs` contrôle 7 points RBAC/multi-tenant.
- `config/readiness-ui.json` garantit les deux cartes dans État de préparation et État production.
- `scripts/production-doctor.mjs` garde le Multi-tenant en WARN hors ligne et ne le passe en PASS qu'après `security-db-check` en mode online.

## Règle de vérité

La présence du SQL RLS dans le dépôt ne suffit pas à certifier l'isolation en production. Le voyant Multi-tenant de production exige une vérification réelle des policies sur Neon via `npm run doctor:production:online` ou `npm run security:db-check`.
