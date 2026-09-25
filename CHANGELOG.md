# Changelog

## 0.10.7 — Refactorisation générale et test d'intégrité complet

- Ajout de `npm run kit:full-test` et des rapports `generated/full-integrity-report.{md,json}`.
- Correction du contrôle CSP : `PASS` seulement sans `unsafe-inline` et avec stratégie nonce détectée.
- Renforcement Turnstile : widget, vérification serveur et deux clés requises pour le voyant vert.
- Ajout du contrôle Playwright (projet/config/MCP) dans Production Doctor.
- Upstash et Playwright sont explicitement optionnels et exclus du score global de préparation.
- Conservation de tous les garde-fous existants et refactorisation non régressive.

## 0.10.6 — État production propriétaire permanent

- Renomme le libellé visible **Production Doctor** en **État production** tout en conservant la route `/admin/production-doctor` pour la rétrocompatibilité.
- Ajoute un voyant vert au menu propriétaire pour signaler que le module est bien installé.
- Ajoute le contrôle `owner-production-state` au rapport CLI : l'absence du menu/page devient un FAIL.
- Renforce `kit:integrity` pour empêcher une suppression accidentelle du menu ou de l'écran.
- Rend cette règle permanente dans `AGENTS.md`, `CLAUDE.md` et le skill `/setup-saas`.

## 0.10.5 — Voyants Sécurité / Performance / Playwright

- Ajoute au tableau **État de préparation du kit** les contrôles CSP sans `unsafe-inline` / stratégie nonce, Cloudflare Turnstile, cache + rate limiting distribué Upstash et Playwright.
- Ajoute les groupes dédiés **Sécurité** et **Performance**.
- Les modules optionnels (Upstash, Playwright) restent visibles mais ne pénalisent pas le score global lorsqu'ils ne sont pas installés.

## 0.10.4 — Refactorisation non régressive par défaut

- Durcit la CSP : `script-src` passe d'`unsafe-inline` à un nonce généré par requête (`proxy.ts`), conformément au pattern officiel Next.js App Router. Les pages jusqu'ici statiques nécessitant ce nonce (`/privacy`, `/terms`, `/forgot-password`, `/register`, `/reset-password`, `/two-factor`, la page 404) passent en rendu dynamique. `style-src` garde `unsafe-inline` (nonce non applicable aux attributs `style=""` HTML, utilisés massivement via `style={{}}` React).
- Ajoute une règle générale obligatoire : toute intervention doit être une refactorisation propre, professionnelle et non régressive.
- Propage cette règle à `AGENTS.md`, `CLAUDE.md`, `.claude/README.md`, `.codex/README.md` et tous les skills officiels.
- Renforce `kit:integrity` pour détecter la disparition de la règle dans une future version.
- Exige de préserver les fonctionnalités existantes, privilégier les changements additifs/réversibles et relancer les gates pertinents après modification.

## 0.10.3 — French-first AI instructions
- Ajoute une règle globale : réponses utilisateur toujours en français pour ChatGPT/Codex/Antigravity et Claude Code.
- Propage la règle dans `AGENTS.md`, `CLAUDE.md`, `.claude/README.md` et tous les skills officiels.
- Renforce `kit:integrity` pour détecter la disparition de cette règle lors d’une future refactorisation.
- Les commandes, chemins, identifiants et extraits de code gardent leur syntaxe technique d’origine.

## 0.10.2 — Claude Code + Computer Use multi-agent
- Ajout de `CLAUDE.md` et `.claude/commands/` pour Claude Code.
- Ajout de `claude-code:check` / `claude-code:prepare`.
- Deux voyants indépendants Computer Use: OpenAI et Claude Code.
- Ajout des commandes `computer-use:claude:check` et `computer-use:claude:mark`.
- Renforcement des gates d’intégrité et d’audit pour protéger l’intégration Claude.


## 0.10.1 — Integrity refactor + guided first run

- Adds `npm run first-run` and `npm run first-run:install` as a safe, guided installation entry point.
- Verifies Node/npm and `.gitignore` before installation.
- Runs the static kit audit before dependency installation and never overwrites an existing SaaS configuration.
- Adds the first-run helper to the dashboard and critical-file integrity gate.
- Keeps staging, `/security-saas`, Banani, Clients CRUD and Mobile WebView behavior unchanged.

## 0.10.0 — Mandatory Vercel Staging Gate
- Ajoute un staging Vercel Preview obligatoire avant Production.
- Ajoute staging:check/deploy/test/approve et deploy:production:check/deploy.
- Sépare explicitement les variables Preview et Production et bloque la production si le commit a changé après approbation.
- Ajoute la section staging au dashboard et renforce la Phase 15 de /setup-saas.


## 0.9.9 — Integrity Refactor & Smart Verify

- corrige le statut du dashboard pour Google OAuth/Search Console lorsqu’ils sont optionnels ;
- aligne le contrôle Node du dashboard sur l’exigence réelle `>=20.9.0` ;
- ajoute `npm run kit:verify` pour orchestrer audit statique, `/security-saas` et contrôles dynamiques quand les dépendances sont disponibles ;
- étend `kit:audit` aux imports locaux, scripts Shell et marqueurs de conflit Git ;
- étend l’inventaire des features aux dépendances inconnues et cycles ;
- conserve toutes les fonctionnalités existantes, y compris CRUD Clients post-Banani et Mobile WebView optionnelle.

## 0.9.8 — Post-Banani Clients CRUD

- ajoute le modèle Prisma `Client` sans remplacer Drizzle;
- ajoute `GET/POST /api/clients` et `GET/PATCH/DELETE /api/clients/[id]`;
- impose Zod, Better Auth, rate limiting, request guards et RLS propriétaire;
- place l’attachement du CRUD en Phase 10, après l’import Banani;
- ajoute `clients:crud:generate`, `clients:crud:migrate` et `clients:crud:check`;
- étend les audits d’intégrité et l’inventaire des fonctionnalités.

## 0.9.7 — Integrity Audit & Installation Safety

- Ajoute `npm run kit:audit`, un audit transversal exécutable même avant `npm install`.
- Vérifie intégrité, versions, features/routes, sécurité, Zod, runtime, responsive Web, Mobile WebView, UI, SEO, déploiement, syntaxe des scripts, JSON et cibles npm.
- Génère `generated/kit-audit-report.md` et `.json`.
- Les tests dépendant de `node_modules` restent explicitement séparés (`verify:code` / `verify:production`) afin de ne jamais produire de faux PASS.
- Aucun module existant n'est supprimé et la partie Mobile reste optionnelle.

## 0.9.6 — /security-saas Security Audit

- Ajoute le skill officiel `.agents/skills/security-saas/SKILL.md` et la commande `/security-saas`.
- Ajoute `npm run security-saas`, `security-saas:online` et `security-saas:json`.
- Scanne les fichiers du SaaS pour secrets, `.env.local`, RLS/policies, Zod, validation serveur, auth, email verification, rate limiting et dépendances.
- Exécute `npm audit` quand un lockfile est disponible et ne transforme jamais un contrôle impossible en faux PASS.
- Produit `generated/security-saas-report.md` et `.json` avec score et rang.
- Affiche le dernier score/rang et le détail des contrôles sur la page d'accueil locale du kit.
- Renforce `kit:integrity` pour protéger la commande, son skill et son intégration dashboard.

## 0.9.5 — Integrity & Installation Refactor

- Corrige la progression `/setup-saas` pour accepter réellement les **21 phases**, y compris la Phase 21 Mobile WebView.
- Corrige le contrôle sécurité resté sur l’ancien contrat 20 phases.
- Sépare la conformité structurelle du starter de la disponibilité des dépendances locales : l’absence initiale de `package-lock.json` est un avertissement dans le starter, mais reste bloquante pour `verify:production`.
- Ajoute `npm run dependencies:check` et `npm run dependencies:check:production`.
- Ajoute `npm run doctor:kit`, un diagnostic simple et non destructif pour faciliter l’installation sans ajouter de complexité.
- Renforce la vérification du skill officiel `.agents/skills/setup-saas/SKILL.md`.
- Nettoie les rapports générés/transitoires avant distribution.

## 0.9.4 — Hosted WebView Mobile Pipeline
- Mobile App Phase 21 standardized on Capacitor WebView loading the deployed HTTPS SaaS.
- Added dedicated Android/iPhone readiness panel below Quality without affecting the Web readiness score.
- Added tool/service, step and visual-asset reminders.
- Strengthened integrity checks for `.agents/skills/setup-saas/SKILL.md`, Mobile Phase 21 guidance and dashboard section.

# V0.9.3 — Intégrité des fichiers critiques

- Garantit la présence du skill officiel `.agents/skills/setup-saas/SKILL.md`.
- Ajoute `npm run kit:integrity` pour détecter immédiatement une copie incomplète du kit.
- Ajoute ce contrôle aux gates `verify:code`, `verify:production` et `ci:check`.
- Aucun changement fonctionnel du SaaS Web ou du Mobile App Pipeline.

# V0.9.2 — Correctif Runtime Dashboard

- Correction de `ReferenceError: root is not defined` dans `getKitDashboardChecks()`.
- Initialisation locale de `root` via `process.cwd()` avant les contrôles Banani/Codex.
- Correctif de non-régression uniquement : aucune fonctionnalité existante supprimée ou modifiée.

# V0.9.1 — Audit général, nettoyage et non-régression

- Audit transversal du code, scripts, routes, sécurité, Zod, responsive Web et pipeline mobile.
- Correction du conflit potentiel entre navigation mobile Web et navigation native via `WebOnly`.
- Ajout de `npm run kit:clean` et `npm run kit:clean:check` pour éliminer les artefacts temporaires sans toucher aux sources.
- Les rapports `generated/` ne sont plus livrés ni suivis, sauf `.gitkeep`; ils sont régénérés localement à la demande.
- CI GitHub rendue compatible avec un starter sans lockfile : `npm ci` si le lockfile existe, sinon bootstrap via `npm install`.
- Suppression des rapports obsolètes V0.8.x/V0.9.0 présents dans le ZIP.
- Aucun module métier optionnel n'est supprimé simplement parce qu'il n'est pas importé : le kit reste un starter multi-SaaS.

## 0.9.0 — Optional Mobile App Pipeline

- Séparation explicite du produit Web et de l’application Android/iOS.
- Pipeline mobile désactivé par défaut, sans dépendance Capacitor obligatoire.
- Ajout de `mobile:app:configure`, `mobile:app:install`, `mobile:app:prepare`, `mobile:app:check`.
- Validation de configuration mobile et garde-fous HTTPS/appId/platformes.
- Phase 21 optionnelle après la production Web.
- Conservation des gates Zod, sécurité et mobile-first Web avant toute préparation native.


## 0.8.28 — General Refactor & Security/Quality Gate
- ajout de `refactor:check`, garde-fou global permanent branché sur les principaux pipelines de livraison ;
- protection serveur héritée de toutes les pages `/dashboard/*` via `requireUser()` dans le layout ;
- suppression de l’exposition navigateur des payloads `raw` des passerelles de paiement ;
- ajout de contrôles origin/cross-site, Content-Type et taille déclarée sur checkout et upload ;
- remplacement de `Math.random()` par `crypto.randomUUID()` pour les identifiants générés ;
- HSTS et `upgrade-insecure-requests` limités à la production pour préserver le développement HTTP local ;
- CI et Security Guard recentrés sur les commandes canoniques `ci:check` / `security:release` ;
- Zod Gate renforcé pour vérifier aussi l’autorisation serveur des Server Actions admin/dashboard ;
- ajout de tests Vitest ciblés pour les request guards et la non-exposition des données brutes de paiement.


## V0.8.26 — Security Baseline Gate
- Ajout d’un garde-fou permanent issu de la checklist sécurité: `.env.local`, secrets, RLS/policies, validation serveur, middleware auth, vérification email, rate limiting et audit npm.
- Toute nouvelle route API doit désormais être classifiée pour auth/validation/rate-limit.
- Toute nouvelle table DB doit être classifiée RLS ou exemption justifiée.
- Ajout de `security:db-check` pour vérifier réellement RLS + policies dans Neon/Postgres.
- Ajout d’un rate limit fail-closed sur l’upload d’images.
- Intégration de `security:baseline` dans `verify:code`, `verify:production` et `ci:check`.

## 0.8.25

- Ajout du **Premium Icon Gate** permanent (`npm run ui:icons-check`) qui scanne toutes les pages et composants du SaaS.
- Interdiction des icônes `Sparkle`, `Sparkles`, `WandSparkles`, des glyphes scintillants (`✨`, `✦`, `✧`, etc.) et des anciens symboles Unicode utilisés comme raccourcis d’icônes.
- Refactorisation de la navigation mobile : remplacement de `⌂`, `◫`, `◉`, `◇` par des SVG premium homogènes via `components/ui/premium-icon.tsx`.
- Intégration du contrôle dans `verify:code`, `verify:production`, `ci:check` et `conformity:check` afin qu’une nouvelle page non conforme bloque la livraison.
- Documentation de la politique d’icônes dans `docs/ui/premium-icons.md` et règle persistante ajoutée à `AGENTS.md`.

## 0.8.24
- Ajout d’une phase Upstash Redis **optionnelle** dans `/setup-saas`.
- Ajout de `npm run upstash:setup`, `upstash:check` et `upstash:check:online`.
- Ajout d’un helper de cache Redis REST (`lib/cache/upstash.ts`) avec TTL et fallback direct vers Neon.
- Upstash est séparé de la phase sécurité pour éviter les doublons : il sert au cache, rate limiting distribué et états temporaires.
- Paiements/Cloudflare/Cloudinary/Production sont décalés aux phases 17/18/19/20.
- Nettoyage de l’artefact `tsconfig.tsbuildinfo`.


## 0.8.23

- Ajout de `/computer-use` et des scripts `computer-use:check` / `computer-use:mark`.
- Ajout d’une Phase 2 dédiée à l’activation/vérification réelle des Browser Tools Antigravity; la roadmap passe à 19 phases.
- Computer Use devient un assistant transversal : chaque phase affiche une consigne de vérification navigateur adaptée quand une surface web/visuelle existe.
- Aucun faux package npm `computer-use` n’est installé : Antigravity fournit nativement le Browser Subagent.
- Ajout d’un guide sécurité Browser Tools (Request Review, Allowlist/Denylist, secrets, MFA, achats et DNS sensibles).
- Ajout du statut Computer Use au dashboard local et au registre anti-doublons des features.
- Correction des numéros de phases paiements/Cloudflare/Cloudinary après insertion de la nouvelle Phase 2.

## 0.8.22

- Ajout d’un contrat de version unique (`scripts/lib/version.mjs`) et de `npm run version:check`.
- Correction des anciennes versions hardcodées dans payments setup, setup progress, Production Doctor et SQL de routage.
- `africa-saas.config.example.json` et `config/features.json` alignés sur la version du package.
- Phase 18: un rapport Production Doctor `NOT_READY`/`NEEDS_REVIEW` ne peut plus être considéré comme validé.
- Régression testée: Banani MCP local, import Banani/gap analysis, SaaS sans paiement, paiements tardifs optionnels, Cloudflare/Cloudinary optionnels, handoff Vercel.


## 0.8.21
- Ajout du vrai workflow `/import-banani` après connexion MCP.
- Snapshot design sans secret dans `design/banani/imported-design.json`.
- Gap analysis automatique RÉUTILISER / ADAPTER / CRÉER / À CONFIRMER.
- Comparaison des écrans Banani avec pages, composants et `config/features.json`.
- Génération du plan d’implémentation seulement après comparaison anti-doublons.

## V0.8.18 — Hydration guard

- Ajout de `suppressHydrationWarning` uniquement sur `<body>` pour tolérer les attributs injectés par des extensions navigateur avant l’hydratation React.
- Ajout de `npm run ui:hydration-check` et intégration dans les gates de vérification.
- La protection reste localisée au body afin de ne pas masquer les vraies erreurs d’hydratation dans les composants de l’application.


## V0.8.17 — Compatibility fix: Better Auth / Vitest

- Downgrade volontaire de Vitest `5.0.0` vers `4.1.11` pour respecter la plage de peer-dependency attendue par Better Auth 1.7.3 et éviter une installation npm incohérente.
- Aucun `--force` ni `--legacy-peer-deps` requis/recommandé.
- Les scripts `test` et `test:watch` restent inchangés (`vitest run`, `vitest`).

## V0.8.15 — Health, tests et CI de qualité
- Ajout de `/api/health` et `/api/readyz`.
- Ajout de Vitest et de tests unitaires sur les garde-fous de paiement/providers.
- Ajout ESLint Next.js, Prettier et contrôle d’hygiène de format.
- CI enrichie : format, lint, conformité, typecheck, tests, build et audit npm production.
- Ajout `DATABASE_URL_DIRECT` pour migrations Neon/Drizzle.
- Ajout d’une politique de migrations Drizzle versionnées.
- Ajout d’un inventaire « ce que le starter embarque » et d’une documentation health/readiness.
- Correction du `security-check` : les erreurs ajoutées dans la seconde moitié du script sont désormais réellement bloquantes.

## V0.8.12 — Phase Explanations + Final Conformity Check
- `/setup-saas` explique désormais le rôle de chaque phase et ce qu’elle apporte au SaaS avant les étapes techniques.
- La roadmap affiche une description courte sous chacune des 18 phases.
- La phase courante affiche : rôle, bénéfice, objectif, état, actions et validation.
- Ajout de `npm run conformity:check`.
- Rapport final `generated/conformity-report.md/json` pour vérifier fichiers requis, JSON, scripts npm, hygiène Git/env, invariants sécurité/paiement, SEO et lockfile.
- La Phase 18 exige le contrôle de conformité avant de déclarer le parcours terminé.


## 0.8.7
- Démarrage local direct sur un dashboard de readiness, sans inscription ni connexion.
- `/setup` devient lecture seule ; suppression de l’ancienne API web d’écriture de configuration.
- Ajout du point d’entrée IA `/setup-saas` et de `npm run setup-saas`.
- Voyants verts/rouges pour core, services, paiements et qualité.
- Le dashboard interne n’est pas exposé par défaut en production.

# V0.8.6 — Deep Audit Consolidation

- Hardened `.gitignore` for production/development/test env files.
- Added pinned Better Auth CLI dependency (`auth`).
- Fixed PayDunya verification to return amount/currency to common reconciliation.
- Prevented raw provider response bodies from being embedded in persistent error messages.
- Minimized webhook persistence to transaction/reference/status summary instead of raw PII-rich payloads.
- Added beta-provider live-runtime blocking.
- Added foreign keys and query indexes to core billing tables.
- Removed private/mobile navigation from the public root shell; mobile app navigation is now dashboard-scoped.
- Removed duplicate Drizzle auth schema input.
- Updated stale internal version markers and Production Doctor warnings.
- Added explicit CSP hardening warning for `unsafe-inline` until nonce-based CSP is implemented.
- Setup now generates a dedicated `CRON_SECRET` and public app name.
- Deployment handoff no longer invents provider requirements from the example config when no real setup config exists.
- Webhook request bodies are now streamed with a hard 1 MB application limit even when `Content-Length` is missing.

## Consolidation finale V0.8.6
- Safe fallback des paiements : arrêt sur état fournisseur ambigu.
- Filtrage readiness/runtime corrigé sans pays.
- Comparaison monétaire normalisée par devise.
- Validation XOF/XAF en montant entier.
- Catalogue providers aligné et anciennes notes versionnées supprimées.

## V0.8.8 — Guided Setup Phases
- `/setup-saas` devient un assistant guidé en 16 phases.
- La commande `npm run setup-saas` génère un rapport Markdown et JSON avec roadmap complète, statut de chaque phase et première phase à traiter.
- Le workflow Antigravity affiche la liste complète puis accompagne une seule phase à la fois.
- Les actions décrivent service, menu, variable, commande, résultat attendu et validation.
- Les secrets ne doivent jamais être collés dans le chat : saisie directe dans `.env.local` ou le dashboard du service.
- Distinction explicite CONFIGURÉ / TESTÉ / NON VÉRIFIÉ.

## V0.8.9 — Optional Payments Late Setup
- Les providers de paiement deviennent totalement optionnels.
- Le wizard principal ne demande plus aucun provider et génère `providers: []`, `defaultProvider: null`.
- Les paiements sont déplacés en Phase 15, juste avant la mise en ligne.
- Nouvelle commande `npm run payments:setup` pour activer tardivement uniquement les providers nécessaires.
- Une Phase 15 non applicable peut être marquée `skipped` pour les SaaS sans paiement.
- Le Local Payment Lab, les routes de paiement, le Production Doctor et le handoff Vercel ne pénalisent plus un SaaS sans paiement.


## V0.8.10 — Optional Cloudflare Domain/DNS Phase
- Ajout d’une Phase 16 Cloudflare optionnelle pour domaine/DNS.
- La finalisation production/Search Console passe en Phase 17.
- Ajout de `npm run cloudflare:setup` et d’un guide généré sans secrets.
- Cloudflare n’est jamais bloquant et peut être marqué `skipped`.
- Distinction explicite entre Cloudflare domaine/DNS et Cloudflare R2 (toujours non intégré).


## V0.8.11
- Cloudinary ajouté comme provider optionnel pour les uploads d’images.
- Nouvelle Phase 17 optionnelle; production déplacée en Phase 18.
- Upload serveur signé, authentifié, limité à 10 MB et SVG refusé par défaut.
- `npm run cloudinary:setup` / `-- --none` et guide staging/Vercel.

## V0.8.13 — Provider Skill Router

- ajout du workflow Antigravity `/provider` ;
- ajout du registre `config/provider-skills.json` ;
- ajout de `npm run provider` ;
- intégration du skill Chariow fourni par l'utilisateur ;
- intégration du skill Mobile Money partagé et de ses références Moneroo, PayTech, Bictorys et Stripe ;
- distinction explicite entre skill dédié, skill partagé, documentation seulement et adaptateur seulement.

## V0.8.14 — Antigravity Skills fix

- Corrige la découverte de `/provider` et `/setup-saas` : migration de l'ancien `.agent/workflows/` vers `.agents/skills/<name>/SKILL.md`.
- `/provider` est maintenant un vrai Agent Skill Antigravity et peut être invoqué comme `/provider` ou `/provider <nom>`.
- Suppression des doublons `commands/` et de l'ancien chemin workflow pouvant induire Antigravity en erreur.
- Le fallback terminal `npm run provider [-- <nom>]` reste disponible.

## 0.8.16 — Robustesse serveur, anti-doublons et smoke tests

- ajout d’un gate `runtime:check` et runtime Node.js explicite sur toutes les routes API ;
- ajout d’un manifeste `config/features.json` pour éviter les doublons fonctionnels et clarifier la responsabilité des routes ;
- ajout d’un logger serveur structuré avec redaction récursive et request IDs sur les webhooks ;
- ajout d’un client HTTP générique : retry automatique seulement pour GET/HEAD ;
- centralisation de l’authentification cron et support GET/POST pour la réconciliation ;
- ajout de `smoke:system` et `cron:generate` ;
- renforcement Cloudinary par vérification des magic bytes ;
- documentation de la revue sélective du dépôt de référence ;
- aucune migration vers Prisma/JWT maison, aucun circuit breaker dupliqué, aucun Sentry/OTel forcé sans dépendances vérifiées.

### V0.8.16 — Auth/email fail-closed
- Email/password devient explicitement configurable.
- Vérification e-mail explicite via `AUTH_REQUIRE_EMAIL_VERIFICATION`.
- Resend devient une dépendance conditionnelle de l’auth email/password, pas une dépendance globale du SaaS.
- En production, les e-mails d’auth critiques ne sont plus silencieusement abandonnés si Resend manque.
- Le setup refuse une configuration sans aucune méthode d’auth réelle.

## V0.8.19 — Banani MCP local via `.codex/config.toml`

- connexion Banani standardisée sur `.codex/config.toml` pour Codex/Antigravity ;
- fichier livré vide, jamais rempli automatiquement ;
- `.codex/config.toml` ajouté au `.gitignore` ;
- `npm run banani:prepare` crée le fichier vide sans écraser l'existant ;
- `npm run banani:check` vérifie la structure et la protection Git sans afficher le token ;
- Phase 8 `/setup-saas` mise à jour ;
- documentation sécurité ajoutée pour la rotation des tokens exposés.


## V0.8.20 — Validation Banani + conformité workspace
- `banani:check` exige désormais HTTPS et avertit si le host n'est pas `app.banani.co`, sans afficher le token.
- `conformity:check` accepte `.env.local` après setup si le fichier est ignoré/non suivi par Git.
- Batterie de tests V0.8.19 relancée avant packaging.

## 0.8.27 — Zod Validation Gate
- Zod devient un garde-fou permanent de validation des entrées de première partie.
- Validation client ajoutée aux flux connexion, inscription, mot de passe oublié/réinitialisation et 2FA.
- Revalidation serveur obligatoire pour les Server Actions et routes API mutantes, avec exceptions documentées pour contrats framework/raw-signature.
- Upload image désormais validé via Zod avant traitement du fichier.
- Nouveau `validation:zod-check`, branché sur `verify:code`, `verify:production` et `ci:check`.
