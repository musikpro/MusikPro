# Africa SaaS Kit V0.11.2 — Suppression de l’ancienne stratégie WebView mobile

## Objectif

Supprimer le chemin mobile legacy de la distribution courante sans modifier le backend Next.js serveur, la PWA, Capacitor, les projets Android/iOS ni les autres fonctionnalités du kit.

## Modifications

- suppression de `scripts/mobile-app-migrate.mjs`;
- suppression de la commande npm `mobile:app:migrate`;
- `mobileApp.strategy` n’accepte plus que `pwa-capacitor` lorsque l’app native est activée;
- mise à jour des scripts install/prepare/check afin d’échouer explicitement sur toute stratégie non supportée;
- suppression du document d’audit dédié à l’ancienne architecture;
- mise à jour de la skill permanente, des règles agents, du README et de l’inventaire des fonctionnalités;
- ajout d’un contrôle anti-réintroduction dans `mobile:app:check`.

## Invariants préservés

- Next.js reste serveur et source de vérité;
- aucun `output: 'export'`;
- PWA et service worker conservés;
- Capacitor Android/iOS conservé;
- desktop/Web mobile conservés;
- auth, DB, paiements, webhooks, IA, sécurité, Zod et secrets restent côté serveur;
- phase native toujours optionnelle.

## Critère de validation

La distribution est valide lorsque les gates d’intégrité passent, que `mobile:app:check` confirme l’absence du chemin legacy et qu’aucune commande ou configuration active ne réintroduit l’ancienne stratégie.

## Résultats exécutés dans cet environnement

- `kit:integrity` : **PASS** — 55 fichiers critiques vérifiés.
- `kit:audit` : **PASS** — 29/29 contrôles statiques.
- `mobile:check` : **PASS**.
- `mobile:pwa:check` : **PASS**.
- `mobile:app:check` : **PASS** — contrôle `legacy-webview-removed` validé.
- `features:check` : **PASS** — 23 fonctionnalités, 9 routes possédées/scannées.
- `security:baseline` : **PASS** — 9 routes API et 24 tables classifiées.
- `validation:zod-check` : **PASS**.
- `refactor:check` : **PASS**.
- `version:check` : **PASS** — V0.11.2.
- test d’intégrité complet : **STATIC_PASS_DYNAMIC_PENDING** — 16 PASS, 0 WARN, 0 FAIL, 6 PENDING.

Les 6 contrôles dynamiques restent `PENDING` car `node_modules` et `package-lock.json` ne sont pas présents dans le starter de cet environnement : format dynamique, ESLint, TypeScript complet, Vitest, build Next.js et audit npm de production. Ils doivent être exécutés après `npm install` sur la machine d’installation.
