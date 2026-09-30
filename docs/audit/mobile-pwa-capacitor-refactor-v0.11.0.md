# Audit de refactorisation V0.11.0 — Mobile PWA + Capacitor

## Audit initial

- Next.js serveur présent, sans `output: export`.
- Manifest PWA déjà présent mais sans service worker sécurisé.
- Runtime Capacitor et navigation mobile partiellement présents.
- Stratégie active du kit encore `webview-hosted` dans config, scripts, docs, dashboard et gates.

## Migration appliquée

- Stratégie officielle : `pwa-capacitor`.
- Skill mobile permanente intégrée au repo.
- Service worker à cache statique contrôlé + fallback offline.
- Icônes PWA 192/512/maskable.
- Détection de contexte centralisée.
- Navigation Web/PWA et native séparée, avec état actif et safe areas.
- Migration legacy non destructive via `mobile:app:migrate`.
- Dashboard et État production mis à jour.

## Non-régression

- Backend, routes API, auth, base, paiements, webhooks et secrets inchangés.
- Aucun export statique Next.js.
- Les anciennes archives restent conservées et explicitement marquées historiques.

## Validation attendue

Exécuter `npm run kit:integrity`, `npm run mobile:pwa:check`, `npm run mobile:check`, `npm run mobile:app:check`, puis lint/typecheck/tests/build après installation des dépendances. Les builds Android/iOS exigent Android Studio/Xcode et restent non validés tant qu’ils n’ont pas été exécutés.
