# Audit de refactorisation V0.9.0 — Web / Mobile App Pipeline

## Objectif

Ajouter une préparation Android/iOS complète et optionnelle après la production Web, sans modifier le comportement des SaaS Web-only existants.

## Décisions de non-régression

- `mobile:check` conserve sa fonction historique de gate responsive Web.
- Les nouvelles commandes utilisent le namespace `mobile:app:*`.
- `mobileAppEnabled=false` par défaut.
- Aucune dépendance Capacitor n'est installée dans le kit de base.
- Le check applicatif retourne `SKIPPED` lorsque le mobile natif est désactivé.
- Les composants natifs ne sont jamais montés automatiquement dans le Web.
- Le backend Next.js, Neon, Resend et les secrets de paiement restent côté serveur.
- Zod reste obligatoire aux frontières serveur pour les entrées non fiables.

## Ajouts

- Configuration `mobileAppEnabled` et bloc `mobileApp`.
- Phase 21 optionnelle dans `/setup-saas`.
- Scripts configure/install/prepare/check.
- Guide `docs/mobile/mobile-app-pipeline.md`.
- Runtime `NativeOnly` sans import Capacitor obligatoire.
- Navigation basse native optionnelle.
- Validation HTTPS, appId et plateformes Android/iOS.
- Gate de conformité pour garantir que le support mobile reste présent dans le kit.

## Vérifications exécutées

- `npm run version:check` — PASS.
- `npm run mobile:check` — PASS.
- `npm run validation:zod-check` — PASS.
- `npm run refactor:check` — PASS (warning historique: package-lock absent).
- `npm run features:check` — PASS.
- `npm run mobile:app:check` avec mobile désactivé — SKIPPED/PASS.
- Activation temporaire de la configuration mobile — validation appId/HTTPS/platformes PASS; le check échoue volontairement tant que Capacitor n'est pas installé.
- Retour en Web-only — PASS.
- `npm run conformity:check` — 198 PASS, 1 FAIL uniquement parce que `package-lock.json` est absent du ZIP source. L'installation npm a été tentée mais n'a pas terminé dans l'environnement de travail; aucun lockfile artificiel n'a été créé.
