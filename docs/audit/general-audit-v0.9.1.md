# Africa SaaS Kit V0.9.1 — Audit général et nettoyage

## Périmètre

Audit statique transversal du starter V0.9.0 : routes Next.js, imports locaux, scripts Node/Shell, contrats Zod, sécurité, inventaire des features, runtime API, responsive Web, séparation Web/native, CI, fichiers générés et hygiène du ZIP.

## Corrections effectuées

1. **Navigation Web/native** : la navigation mobile Web est maintenant protégée par `WebOnly`, complémentaire de `NativeOnly`, afin d’éviter une double barre dans Capacitor.
2. **CI sans lockfile initial** : les workflows utilisent `npm ci` quand `package-lock.json` existe et `npm install` uniquement pour le bootstrap d’un starter qui n’en possède pas encore. Le lockfile généré doit ensuite être conservé dans le projet SaaS.
3. **Rapports obsolètes** : suppression des rapports générés hérités de V0.8.x/V0.9.0. `generated/` est désormais un espace local régénérable et ignoré par Git, sauf `.gitkeep`.
4. **Nettoyage reproductible** : ajout de `kit:clean:check` (dry-run) et `kit:clean` (suppression) pour `.next`, coverage, out, `.turbo`, tsbuildinfo, logs/temp et sorties `generated/`.
5. **Documentation d’audit** : correction d’un lien historique qui pointait vers un rapport `generated/` non pérenne.

## Contrôles exécutés

- syntaxe de tous les scripts `.mjs/.js` via `node --check`;
- syntaxe de tous les scripts Shell via `bash -n`;
- résolution statique de tous les imports locaux et alias `@/`;
- `version:check`;
- `security:baseline`;
- `validation:zod-check`;
- `refactor:check`;
- `mobile:web-check`;
- `mobile:app:check` (SKIPPED proprement quand option désactivée);
- `features:check`;
- `runtime:check`;
- `env:check`;
- `ui:icons-check`;
- `ui:loading-check`;
- `ui:hydration-check`;
- `seo:check`;
- `deploy:check`;
- recherche d’artefacts `.DS_Store`, logs, caches, backups et builds.

## Limite de certification

Le ZIP source ne contient pas de `package-lock.json` et l’accès au registre npm a expiré pendant l’audit. Il n’est donc pas possible de certifier ici un `npm audit`, un `npm ci`, ESLint, TypeScript, Vitest et un build Next.js exécutés avec l’arbre réel des dépendances. Les gates restent prévus pour être exécutés dès que `npm install` a généré le lockfile sur une machine connectée.
