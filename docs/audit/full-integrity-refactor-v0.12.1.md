# Africa SaaS Kit V0.12.1 — Integrity Refactor

Date d’audit : 2026-10-04.

## Objectif

Cette refactorisation part de V0.12.0 et conserve toutes les fonctionnalités existantes. Elle vise à fiabiliser le premier démarrage pré-Neon, supprimer les faux états rouges des intégrations optionnelles et relever le plancher de sécurité de Better Auth sans ajouter de service obligatoire.

## Corrections appliquées

### 1. Intégrations optionnelles

- **Banani MCP** : absent/non configuré avant sélection => `SKIPPED` non bloquant ; activé mais incomplet => `FAIL`.
- **Upstash** : absent/non sélectionné => `SKIPPED` non bloquant ; configuration partielle ou module activé sans credentials complets => `FAIL`.
- `kit:full-test` classe ces états `SKIPPED` en `WARN`, jamais en faux PASS ni faux FAIL.
- Les règles AGENTS/CLAUDE imposent désormais ce contrat à toutes les intégrations optionnelles.

### 2. Bootstrap local avant Neon

Le contrat officiel reste :

```text
dépendances → npm run dev → /setup-saas → setup local → Neon Phase 5 → migrations/auth
```

Corrections :

- `docs/operations/health-readiness.md` documente correctement `/api/readyz` = **200** avec `setupMode=true` et `database=skipped` en développement pré-Neon ;
- en production sans `DATABASE_URL`, `/api/readyz` reste **503** ;
- `docs/setup-wizard.md` présente maintenant `npm run dev` avant `npm run setup` ;
- `dev:bootstrap-check` vérifie aussi ces guides, `first-run` et `install:check` pour empêcher le retour d’un ordre obsolète ;
- `kit:audit` inclut désormais le gate bootstrap pré-Neon.

### 3. Better Auth — correctif sécurité

- `better-auth` : **1.7.3 → 1.7.7** ;
- CLI `auth` : **1.7.3 → 1.7.7** ;
- `config/security-dependency-floors.json` relève le minimum à **1.7.7** ;
- `config/documentation-sources.json` est aligné sur la version revue ;
- `SECURITY.md` documente l’avis critique **GHSA-965c-763c-88jm** corrigé par la release 1.7.7.

Aucune migration de base spécifique à ce correctif n’est ajoutée au kit. Les tests dynamiques devront être relancés après installation réelle des dépendances.

## Résultats des contrôles

- `kit:integrity` : **PASS — 89 fichiers critiques**.
- `kit:audit` : **PASS — 40/40 contrôles, 100 %**.
- `features:check` : **PASS — 30 fonctionnalités, 9 routes possédées / 9 routes scannées**.
- `agents:rules-check` : **PASS — 48 rubriques AGENTS.md intégralement reflétées dans CLAUDE.md**.
- `readiness:ui-check` : **PASS — 16 cartes Setup + 16 cartes Production**.
- `/security-saas` statique : **15 PASS · 4 WARN · 0 FAIL**, 391 fichiers scannés.
- `kit:full-test` : **28 PASS · 14 WARN · 0 FAIL · 8 PENDING**.

Les 14 WARN sont des états non bloquants/non vérifiés (staging non approuvé, modules optionnels non sélectionnés, Computer Use non vérifié, handoff non généré, parcours live/accessibilité navigateur non exécutés, etc.).

Les 8 PENDING exigent les dépendances installées :

1. bootstrap serveur pré-Neon réel ;
2. format ;
3. ESLint ;
4. TypeScript ;
5. Vitest ;
6. build Next.js ;
7. `npm audit --omit=dev` ;
8. tests dynamiques des parcours critiques.

## Tests de scénarios complémentaires

Des copies temporaires du kit ont vérifié :

- setup avec `banani=false` => Banani `SKIPPED`, Upstash `SKIPPED` ;
- setup avec Banani activé mais MCP vide => `banani:check` échoue comme attendu ;
- configuration Upstash partielle => `upstash:check` échoue comme attendu.

## Limite d’environnement

Le registre npm n’était pas joignable depuis l’environnement d’audit. Aucun `package-lock.json` artificiel n’a été créé et aucun test dynamique n’a été marqué PASS sans exécution réelle.

Après extraction sur une machine avec accès npm :

```bash
npm run install:preflight
npm run first-run:install
npm run dev:bootstrap-test
npm run kit:full-test
npm run dev
```

Puis ouvrir `http://localhost:3000/setup-saas`.

## Références sécurité revues

- Next.js 16.3.8 — release de sécurité du 30 septembre 2026.
- Better Auth 1.7.7 — release du 30 septembre 2026 corrigeant notamment GHSA-965c-763c-88jm.
