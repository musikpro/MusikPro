# Audit de refactorisation V0.9.4 — Mobile WebView

## Objectif

Standardiser la Phase 21 sur une application Android/iPhone Capacitor WebView qui charge le SaaS Next.js déjà déployé en HTTPS, tout en gardant cette phase optionnelle et sans modifier le comportement Web par défaut.

## Changements

- Dashboard : section Android/iPhone dédiée sous Qualité, avec progression séparée du score Web.
- Architecture : `webview-hosted` devient la stratégie officielle; `hosted-nextjs` reste accepté pour compatibilité.
- Checklist : Capacitor, Android Studio/SDK/JDK, Xcode, étapes de préparation, tests WebView et assets stores.
- Documentation : `docs/mobile/mobile-app-pipeline.md` réécrit autour du mode connecté au SaaS en ligne.
- Skill officiel : `.agents/skills/setup-saas/SKILL.md` enrichi avec le workflow Phase 21 WebView.
- Intégrité : `kit:integrity` bloque désormais si le skill officiel, le guide mobile ou la section dashboard disparaissent.

## Contrôles exécutés

- `npm run kit:integrity` : PASS
- `npm run version:check` : PASS
- `npm run mobile:app:check` : PASS/SKIPPED lorsque désactivé
- `npm run refactor:check` : PASS
- `npm run validation:zod-check` : PASS
- `npm run security:baseline` : PASS
- `npm run features:check` : PASS
- `npm run kit:clean:check` : PASS

## Limite

Le `package-lock.json` n'est pas présent dans le kit source. Un build complet avec dépendances installées et `npm audit` doit être exécuté après `npm install` dans l'environnement final.
