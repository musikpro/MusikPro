# /security-saas

`/security-saas` est l'audit de sécurité à la demande de l'Africa SaaS Kit.

## Commandes

- Antigravity : `/security-saas`
- Terminal : `npm run security-saas`
- Avec vérification réelle Neon/Postgres : `npm run security-saas:online`
- JSON console : `npm run security-saas:json`

## Ce qui est vérifié

Le scanner parcourt les fichiers source et orchestre les garde-fous existants du kit : secrets et clés API, `.env.local` et Git, variables `NEXT_PUBLIC_*`, classification des routes API, validation serveur, Zod, RLS/policies déclarées, RLS/policies réellement actives en mode online, middleware/proxy, gardes serveur, vérification email, rate limiting, webhooks, planchers de versions sensibles et `npm audit` quand un lockfile existe.

## Score et rang

PASS vaut 100 %, À VÉRIFIER vaut 50 %, FAIL vaut 0 % dans le calcul. Un FAIL critique empêche les meilleurs rangs. Un contrôle qui nécessite une ressource absente (par exemple la base réelle ou un lockfile) reste « À VÉRIFIER » : il n'est jamais déclaré PASS sans preuve.

Les résultats sont écrits dans `generated/security-saas-report.md` et `generated/security-saas-report.json`. La page d'accueil locale lit le dernier rapport.

Le score mesure la conformité aux règles automatisables du kit ; ce n'est pas une garantie absolue d'absence de vulnérabilité.
