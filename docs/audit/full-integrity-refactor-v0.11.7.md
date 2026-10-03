# Africa SaaS Kit V0.11.7 — Full Integrity Refactor

## Objectif

Refactorisation de maintenance non régressive de la V0.11.6, avec contrôle transversal du kit et ajout uniquement d’un garde-fou complémentaire utile à l’installation et à la production.

## Correction principale

- Next.js `16.3.7` était inférieur au correctif Active LTS `16.3.8` publié le 30 septembre 2026.
- `next` et `eslint-config-next` sont alignés sur `16.3.8`.
- `config/security-dependency-floors.json` exige désormais Next.js `>=16.3.8`.
- Le contrat de dépendances continue d’aligner Next/ESLint, React/React DOM, Prisma et Better Auth.

## Complément ajouté

Un voyant **Dépendances — seuils de sécurité** est désormais visible dans :

- **État de préparation** ;
- **État production** ;
- le préflight d’installation `npm run install:check`.

Le contrôle lit la politique locale des versions sensibles et signale une version inférieure au seuil revu. Il complète `npm audit` mais ne le remplace pas.

## Résultats des tests

- `kit:full-test` : **STATIC_PASS_DYNAMIC_PENDING**.
- Contrôles statiques consolidés : **29 PASS · 0 WARN · 0 FAIL**.
- Tests dynamiques : **6 PENDING** — Prettier, ESLint, TypeScript complet, Vitest, build Next.js et `npm audit`.
- `kit:audit` : **31/31 PASS — score 100 %**.
- Conformité structurelle : **253 PASS · 4 WARN · 0 FAIL**.
- Inventaire : **25 fonctionnalités**, **9 routes API recensées / 9 attribuées**.
- Runtime API : **9/9 routes Node.js PASS**.
- RBAC + multi-tenant : **7/7 PASS**.
- Zod : **PASS** — 4 Server Actions, 6 routes API mutantes et 5 formulaires auth contrôlés.
- CSP stricte par nonce : **PASS**.
- PWA : **PASS**.
- PWA + Capacitor : **PASS** pour le périmètre statique ; wrapper natif optionnel non activé.
- Premium Icon Gate : **PASS — 73 fichiers UI scannés**.
- AGENTS.md ↔ CLAUDE.md : **39 rubriques synchronisées**.
- Readiness UI : **9 cartes Setup + 9 cartes Production garanties**.
- Parsing TypeScript sans résolution : **0 erreur de syntaxe TS1xxx**.

## Avertissements attendus du starter

Les avertissements restants ne sont pas des régressions :

1. `package-lock.json` absent tant que `npm install` n’a pas pu être exécuté ;
2. `node_modules` absent ;
3. `africa-saas.config.json` absent avant le setup ;
4. handoff de déploiement et Production Doctor non générés avant configuration du projet.

Le registre npm n’était pas joignable dans l’environnement d’audit, donc les six tests dynamiques restent volontairement `PENDING` plutôt que d’être déclarés réussis sans preuve.

## Préservation

Aucune fonctionnalité métier n’a été supprimée. Les garde-fous existants restent actifs : sécurité, Zod, RBAC, multi-tenant, CSP nonce, PWA + Capacitor, staging obligatoire, règles AGENTS/CLAUDE, Premium Icon Gate, observabilité, paiements optionnels, CRUD Clients et tests d’intégrité.
