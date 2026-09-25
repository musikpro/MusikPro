---
name: setup-saas
description: Assistant officiel Africa SaaS Kit. Analyse l’état du projet et guide l’utilisateur phase par phase jusqu’à la production, sans exiger les paiements, Cloudflare ou Cloudinary quand ils ne sont pas nécessaires.
---

## Langue de réponse
Toujours répondre à l’utilisateur en **français**. Conserver seulement les commandes, chemins, identifiants et extraits de code dans leur syntaxe technique d’origine. Utiliser une autre langue uniquement si l’utilisateur le demande explicitement pour une réponse précise.

# /setup-saas — Assistant de configuration complet en 21 phases

Quand cette skill est invoquée, lire `AGENTS.md`, `README.md`, `SECURITY.md`, `DESIGN.md`, `docs/setup-saas.md` et la configuration réelle si elle existe.

1. Exécuter `npm run features:list` puis `npm run setup-saas` afin de connaître les briques déjà présentes et éviter les doublons.
2. Avant toute construction, exécuter `npm run computer-use:openai:check` pour OpenAI/Antigravity et `npm run claude-code:check` + `npm run computer-use:claude:check` si Claude Code est utilisé; dans Antigravity, vérifier réellement Browser Tools avec le Browser Subagent. Si le test réussit, marquer la preuve avec `npm run computer-use:mark`.
3. Pour chaque phase suivante, lire la section **Assistance Computer Use pour cette phase** du rapport et utiliser le Browser Subagent dès qu’une surface web/visuelle est vérifiable. Ne pas prétendre à un PASS visuel sans observation réelle.
4. Lire `generated/setup-saas-report.md` et `.json`.
5. Afficher la roadmap complète avec 🟢 / 🟡 / 🔴 / ⚪ et une explication courte de chaque phase.
6. Développer uniquement la première phase non terminée.
7. Pour la phase courante : expliquer le rôle du service, ce qu’il apporte, s’il est obligatoire ou optionnel, le résultat attendu, puis les étapes exactes.
8. Ne jamais demander de secret dans le chat.
9. Revalider avant de marquer une phase passée.
10. En Phase 9 Banani, exécuter d'abord `npm run banani:prepare`, demander à l'utilisateur de compléter lui-même `.codex/config.toml`, puis `npm run banani:check`. Ne jamais demander ni afficher le bearer token.

11. Workflow post-Banani : juste après l’import Banani (Phase 9), la Phase 10 doit vérifier/attacher le CRUD Clients si le SaaS en a besoin : modèle Prisma `Client`, routes `/api/clients/*`, validation Zod serveur, Better Auth, rate limiting et RLS. Ne jamais brancher ce CRUD avant que les écrans Banani aient été réellement importés. Drizzle reste l’ORM principal du starter; Prisma est une brique ciblée pour Clients.
12. Les Paiements, Cloudflare domaine/DNS, Cloudinary et le Mobile App Pipeline sont optionnels et restent en fin de parcours. La Phase 21 Android/iOS intervient seulement après le SaaS Web de production. Son architecture officielle est **Capacitor WebView connectée à l’URL HTTPS du SaaS en ligne**; ne jamais déplacer le backend ou ses secrets dans l’app.
13. En Phase 13, valider `/api/health`, `/api/readyz`, `runtime:check`, `features:check`, lint, tests, typecheck, build, audit et `smoke:system`.
14. Avant la validation finale de sécurité, exécuter `npm run security-saas` et traiter tous les FAIL; si Neon est accessible, compléter avec `npm run security-saas:online`.
15. En phase finale, exécuter `npm run conformity:check` et ne pas déclarer le projet conforme s’il reste un FAIL.

La définition détaillée des phases et les règles de progression sont dans `AGENTS.md` et `docs/setup-saas.md`; les suivre comme source de vérité.

- Phase 16 : Upstash Redis optionnel (cache/rate limiting); si ignoré, continuer avec Neon directement.

- Phase 21 : Mobile App Pipeline Android/iOS WebView optionnel; ne jamais installer Capacitor si le projet reste Web-only. Si activé, guider aussi la préparation Android Studio/Xcode, les tests WebView, les assets (logo, icône, splash, captures Android/iPhone) et la publication stores.

## Staging Gate obligatoire
Avant toute Production, lire `docs/deployment/staging-vercel.md` et valider une Vercel Preview du commit courant : `npm run staging:deploy`, `npm run staging:test -- --url=...`, `npm run staging:approve -- --url=...`, puis `npm run deploy:production:check`. Ne jamais contourner ce gate. Séparer les variables et bases Preview/Production ; refaire le staging si le code change.

16. Compatibilité Claude Code : lire `CLAUDE.md`, utiliser les commandes `.claude/commands/`, et garder les voyants Computer Use OpenAI/Claude indépendants. Un voyant vert exige un test réel marqué `verified`.

## État production propriétaire — installation obligatoire

À chaque installation ou adaptation d'un SaaS, ajouter ou préserver dans le tableau de bord du propriétaire un menu **État production** pointant vers `/admin/production-doctor`.

L'écran doit :
- afficher « Diagnostic local de préparation à la production. Le rapport CLI reste la source de vérité. » ;
- lire le rapport du Production Doctor au lieu de recalculer un état divergent dans l'UI ;
- afficher un voyant vert pour un contrôle prêt/installé, orange pour un contrôle à compléter/à vérifier et rouge pour un contrôle absent/bloquant ;
- conserver un voyant vert à côté du menu lorsqu'il est installé ;
- rester protégé par `requireAdmin()` via le layout `/admin`.

Validation obligatoire après intégration : `npm run kit:integrity && npm run doctor:production`.


## Règle de refactorisation
Toute intervention doit être traitée comme une **refactorisation propre, professionnelle et non régressive**. Préserver les fonctionnalités existantes, éviter les suppressions/destructions inutiles, privilégier les changements additifs et réversibles, puis exécuter les contrôles pertinents du kit avant de conclure. Une rupture nécessaire doit être accompagnée d’une migration explicite et documentée.
