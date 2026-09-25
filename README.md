# Africa SaaS Kit V0.10.7

> **Version : V0.10.7 — Refactorisation générale + test d’intégrité complet**


## V0.10.7 — Refactorisation générale + intégrité complète

Cette version ajoute une commande unique `npm run kit:full-test` qui orchestre les principaux contrôles du kit et génère un rapport consolidé dans `generated/full-integrity-report.md` et `.json`. Elle corrige aussi le diagnostic CSP afin qu’un voyant vert exige réellement l’absence de `unsafe-inline` **et** la présence d’une stratégie de nonces, renforce le contrôle Turnstile (widget + vérification serveur + clés site/secret), ajoute Playwright au diagnostic et retire les modules optionnels du calcul du score de préparation.

Le test complet reste volontairement non destructif : il ne modifie ni `.env.local`, ni les providers, ni la base. Sans dépendances installées, il valide toute la partie statique et marque les tests dynamiques `PENDING`; après `npm install`, il exécute aussi lint, typecheck et tests.

## V0.10.6 — État production permanent dans le dashboard propriétaire

Le tableau de bord propriétaire/admin contient désormais obligatoirement un menu **État production** avec voyant vert d’installation. La route historique `/admin/production-doctor` est conservée pour éviter toute régression. L’écran reprend le diagnostic local de préparation à la production avec voyants vert/orange/rouge et continue de lire le rapport CLI comme source de vérité. `kit:integrity` et le Production Doctor détectent désormais la disparition de ce menu/page.

## V0.10.5 — Voyants Sécurité / Performance

Le tableau **État de préparation du kit** détecte maintenant CSP nonce/sans `unsafe-inline`, Cloudflare Turnstile, Upstash (cache/rate limiting distribué) et Playwright (projet ou configuration MCP connue). Les contrôles utilisent un voyant rouge si absent/incomplet et vert si prêt. Upstash et Playwright restent optionnels et ne bloquent pas le score global.

## V0.10.4 — Refactorisation propre et non régressive

Cette version rend explicite une règle commune à tous les agents et skills : **chaque modification du projet doit être une refactorisation propre, professionnelle et non régressive**. Les fonctionnalités existantes doivent être préservées, les changements doivent être additifs/réversibles autant que possible, et les gates d’intégrité, sécurité et Zod doivent être relancés avant de considérer une modification terminée. `npm run kit:integrity` protège aussi cette règle contre une suppression accidentelle.

## V0.10.3 — Réponses IA toujours en français

Cette version ajoute une règle de langue commune à tous les agents supportés par le kit : **ChatGPT/Codex/Antigravity et Claude Code doivent répondre en français**. La règle est protégée par `npm run kit:integrity` et propagée dans `AGENTS.md`, `CLAUDE.md`, `.claude/README.md` et les skills officiels. Les commandes, chemins, identifiants et extraits de code conservent leur syntaxe technique d’origine.

## V0.10.2 — Claude Code + Computer Use multi-agent

Cette version adapte le kit à **Claude Code (Anthropic)** sans remplacer le workflow OpenAI existant. La page État de préparation affiche désormais deux voyants indépendants pour **Computer Use — ChatGPT/OpenAI** et **Computer Use — Claude Code/Anthropic**. Un voyant devient vert uniquement après un test réel marqué `verified`.

Commandes : `npm run claude-code:check`, `npm run computer-use:openai:check`, `npm run computer-use:claude:check`.

## V0.10.1 — Premier démarrage guidé + audit d’intégrité

Cette version conserve toute l’architecture V0.10.0 et ajoute une commande complémentaire légère pour réduire les erreurs au premier lancement :

- `npm run first-run` vérifie Node/npm, `.gitignore`, l’intégrité du kit et l’état des dépendances sans rien installer ;
- `npm run first-run:install` effectue les mêmes contrôles puis lance `npm install` uniquement si nécessaire ;
- aucune configuration existante n’est écrasée ;
- le dashboard local affiche ces commandes avant l’audit général.

Après l’installation, continuez avec `npm run setup`, puis `/setup-saas`.

## V0.10.0 — Refactorisation d’intégrité et installation simplifiée

Cette version renforce les contrôles sans changer l’architecture du starter :

- `npm run kit:audit` vérifie désormais aussi les imports locaux, la syntaxe Shell et les marqueurs de conflit Git ;
- `npm run kit:verify` orchestre l’audit statique + `/security-saas`, puis lance automatiquement les contrôles dynamiques quand `package-lock.json` et `node_modules` sont disponibles ;
- l’inventaire des fonctionnalités vérifie les dépendances inconnues et les cycles entre modules ;
- le dashboard respecte exactement Node `>=20.9.0` et n’affiche plus Google OAuth/Search Console en erreur lorsqu’ils sont réellement optionnels ;
- aucun service optionnel n’est rendu obligatoire et aucun module existant n’est supprimé.

Commande recommandée après extraction : `npm run kit:verify`. Si les dépendances ne sont pas encore installées, la commande indique simplement `npm install`, puis peut être relancée.

## V0.9.8 — CRUD Clients post-Banani

Cette version ajoute une brique complémentaire **CRUD Clients** placée après l’import des écrans Banani : modèle Prisma `Client`, routes sécurisées `/api/clients/*`, validation Zod côté serveur, session Better Auth, rate limiting et RLS propriétaire. Drizzle reste l’ORM principal du kit; Prisma est limité à cette fonctionnalité ciblée.

Commandes utiles : `npm run clients:crud:setup`, `npm run clients:crud:migrate`, `npm run clients:crud:check`.

## V0.9.7 — Audit intégrité unifié

Commande complémentaire simple : `npm run kit:audit`. Elle contrôle l’intégrité structurelle complète du kit avant même l’installation des dépendances et génère un rapport dans `generated/`. Les tests dynamiques restent dans `verify:code` et `verify:production`.

## V0.9.6 — Sécurité à la demande + Mobile WebView

- La Phase 21 cible officiellement une **app Capacitor WebView connectée au SaaS Next.js déjà déployé en HTTPS**.
- Le dashboard affiche sous **Qualité** une section Android/iPhone optionnelle avec progression distincte du score Web.
- La section rappelle Capacitor, Android Studio/SDK/JDK, Xcode, les étapes de préparation et les assets (logo, icône, splash, captures Android/iPhone).
- `mobile:app:check` valide explicitement la stratégie WebView hébergée.
- `.agents/skills/setup-saas/SKILL.md` est présent et son guidage Phase 21 WebView est vérifié par `npm run kit:integrity`.

## /security-saas — audit sécurité à la demande

Dans Antigravity, utilisez **`/security-saas`** à tout moment pour auditer les fichiers du SaaS. L'équivalent terminal est `npm run security-saas`; `npm run security-saas:online` ajoute la vérification réelle RLS/policies dans Neon/Postgres quand la connexion locale est disponible. Le rapport donne un **score**, un **rang**, le nombre de fichiers scannés et le détail PASS / À VÉRIFIER / FAIL.

Le contrôle couvre notamment `.env.local`/Git, secrets et clés API, RLS/policies, validation côté serveur, Zod, middleware/auth, vérification email, rate limiting, webhooks, planchers de versions sensibles et `npm audit`. Le dashboard local affiche le dernier rapport généré.


## V0.9.3 — correctif dashboard (`root` non défini)

- Corrige le `Runtime ReferenceError: root is not defined` dans `lib/setup/kit-dashboard.ts`.
- Définit explicitement la racine du projet avec `process.cwd()` dans `getKitDashboardChecks()`.
- Aucun changement fonctionnel du pipeline Web/Mobile.

## V0.9.1 — séparation Web / Mobile App Pipeline

Le SaaS **Web Next.js reste obligatoire et source de vérité**. La création Android/iOS est désormais une phase **optionnelle après déploiement**.

- `npm run mobile:check` : contrôle responsive/mobile-first du site Web.
- `npm run mobile:app:configure -- --none` : conserve un SaaS Web-only.
- `npm run mobile:app:configure -- --app-id=com.exemple.app --url=https://app.exemple.com` : active explicitement la préparation native.
- `npm run mobile:app:install` : installe Capacitor uniquement après opt-in.
- `npm run mobile:app:prepare` : génère/synchronise les projets Android/iOS sans déplacer la logique serveur Next.js.
- `npm run mobile:app:check` : retourne `SKIPPED` lorsque l’app mobile est désactivée, afin de ne jamais casser le workflow Web.

Guide complet : `docs/mobile/mobile-app-pipeline.md`.

## V0.8.28 — General Refactor Gate

Le kit possède maintenant un contrôle global permanent avec `npm run refactor:check`. Il protège notamment les frontières d’authentification serveur de `/dashboard` et `/admin`, interdit l’exposition des réponses brutes des passerelles de paiement, impose des gardes d’origine/taille/type sur les endpoints mutateurs sensibles, interdit `Math.random()` pour les identifiants/tokens du kit et vérifie la cohérence des workflows CI. Ce contrôle est exécuté automatiquement par `verify:code`, `verify:production`, `ci:check` et `security:release`.

Voir `docs/audit/general-refactor-v0.8.28.md`.


## Zod Validation Gate — validation client + serveur obligatoire

Zod est maintenant un garde-fou permanent. Les formulaires sensibles valident les entrées côté client avec `safeParse`, puis les données sont **revalidées côté serveur** avant toute mutation. Les Server Actions et routes API mutantes de première partie qui ne respectent pas ce contrat bloquent la CI. Commande : `npm run validation:zod-check`. Voir `docs/security/zod-validation-gate.md`.

## Premium Icon Gate — aucune Sparkle/Sparklet dans l’UI

Le kit applique désormais un contrôle visuel permanent : les composants/pages sous `app/` et `components/` sont scannés afin d’empêcher le retour d’icônes Sparkle/Sparkles, baguettes scintillantes et glyphes décoratifs génériques associés aux interfaces IA. Utiliser des pictogrammes sémantiques cohérents via `components/ui/premium-icon.tsx` ou une bibliothèque professionnelle auditée.

Commande dédiée : `npm run ui:icons-check`. Le gate fait partie de `verify:code`, `verify:production` et `ci:check`, donc les nouvelles pages sont contrôlées elles aussi. Voir `docs/ui/premium-icons.md`.


## Computer Use / Browser Tools (Antigravity)

Dans Antigravity, le kit utilise le **Browser Subagent / Browser Tools** comme couche de vérification visuelle continue. Il n’existe aucun package npm `computer-use` à installer. La Phase 2 de `/setup-saas` vérifie l’activation réelle en demandant au Browser Subagent d’ouvrir une page web; après `npm install`, l’agent teste ensuite le SaaS local, les viewports mobile, les formulaires, OAuth, uploads, paiements sandbox, previews Vercel et le domaine final.

Commandes :

```bash
npm run computer-use:check
npm run computer-use:mark -- --status=verified --evidence="preuve navigateur réelle"
```

Le statut local est stocké dans `.africa-saas/` (ignoré par Git). Une preuve Browser ne remplace jamais les tests CLI, le build ou l’audit sécurité. Voir `docs/computer-use/antigravity-browser.md`.

Starter Next.js + Neon + Better Auth conçu pour construire des SaaS adaptés aux réalités africaines : Mobile Money, XOF/XAF, paiements asynchrones, sécurité intégrée et routage multi-gateway.


## V0.8.16 — revue sélective izikit, sans duplication

Cette revue a aussi détecté une **impasse auth/e-mail** : un SaaS ne doit jamais garder email/mot de passe actif en production si aucun service ne peut livrer les e-mails de vérification et de récupération. Le setup lie maintenant explicitement ce choix à Resend ; sans Resend, il faut désactiver email/mot de passe et utiliser un autre provider d’auth.


Cette version compare les idées utiles du dépôt de référence avec les briques déjà présentes dans Africa SaaS Kit. Elle **n’ajoute pas une deuxième implémentation** lorsqu’une fonction existe déjà.

Nouveautés retenues :

- `npm run runtime:check` : toutes les routes `app/api/**` restent explicitement en runtime Node.js ;
- `config/features.json` + `npm run features:list` / `features:check` : manifeste de responsabilité pour éviter les doublons de routes/helpers ;
- `lib/observability/logger.ts` : logs structurés avec redaction récursive des secrets/PII ;
- request IDs sur les webhooks ;
- `lib/api/client.ts` : retries automatiques uniquement pour GET/HEAD, jamais pour les mutations ambiguës ;
- helper cron centralisé, fail-closed en production, avec GET pour Vercel Cron et POST pour test manuel ;
- `npm run smoke:system` : smoke test health/readiness/Better Auth/robots/sitemap ;
- `npm run cron:generate` : génère la config cron Vercel seulement si des paiements ont réellement été activés ;
- Cloudinary vérifie maintenant le contenu binaire réel de l’image (magic bytes), pas seulement le MIME fourni par le client.

Voir `docs/architecture/izikit-selective-review.md`.

## Backend status et qualité V0.8.16

Le starter expose maintenant :

- `GET /api/health` : liveness Next.js (200 si le serveur tourne) ;
- `GET /api/readyz` : readiness Neon + Upstash lorsqu’il est configuré (503 si une dépendance configurée nécessaire est indisponible) ;
- `npm run test` : tests unitaires Vitest des garde-fous sensibles ;
- `npm run lint` : ESLint Next.js Core Web Vitals ;
- `npm run format:check` : hygiène de format reproductible en CI ;
- `npm run audit:prod` : audit des dépendances de production ;
- `DATABASE_URL_DIRECT` : connexion Neon directe optionnelle recommandée pour Drizzle Kit/migrations.

Les migrations sous `db/migrations/` doivent être versionnées dans Git. Voir `docs/architecture/starter-capabilities.md` et `docs/operations/health-readiness.md`.


## V0.8.13 — Setup pédagogique + routeur de skills providers

La V0.8.13 conserve le handoff GitHub/Vercel, SEO, ngrok, skeleton loaders, mobile-first, les phases pédagogiques et le contrôle final de conformité. Elle ajoute `/provider`, le routeur officiel permettant de découvrir et charger les skills ou références disponibles pour chaque fournisseur de paiement.


### Test final de conformité

À la fin du parcours :

```bash
npm run conformity:check
```

Le rapport `generated/conformity-report.md` contrôle la structure du starter, les scripts, les JSON, `.gitignore`, les invariants sécurité/paiements, le SEO, les skeleton loaders et le `package-lock.json`. Un `FAIL` doit être corrigé avant de considérer le kit conforme. Ce test ne remplace pas le build réel, `npm audit` ni les tests des services externes.

### Tester les paiements en local

```bash
# Terminal A
npm run dev

# Terminal B
npm run payments:ngrok

# Terminal C
npm run payments:local
npm run payments:local:apply
```

Le Local Payment Lab est **optionnel** et ne s’utilise que si le SaaS active des paiements en Phase 17. Il génère alors `generated/local-payment-lab.md` avec les URL webhook exactes. `PAYMENT_WEBHOOK_BASE_URL` est séparé de `NEXT_PUBLIC_APP_URL`.

### Mobile-first

```bash
npm run mobile:check
```

Chaque écran doit être construit et vérifié d’abord à 320/360/390/430 px, puis 768/1024/1440 px. Le starter inclut une navigation basse mobile, safe-area, cibles tactiles et protections contre les débordements. Voir `docs/mobile/mobile-first-delivery.md`.

## Héritage V0.8.1 — Google + Banani + paiement + audit sécurité

Le kit démarre maintenant directement sur un tableau de préparation local : aucun compte ni formulaire d’inscription n’est requis pour accéder au starter. Le setup est piloté par `/setup-saas` dans l’IA ou par les commandes terminal.

`http://localhost:3000/` et `/setup` affichent en lecture seule l’état du kit avec voyants verts/rouges. La configuration n’est plus écrite par une API web.

En production, `/setup` est désactivé et le tableau interne du kit n’est pas exposé. Utilisez les variables d’environnement de l’hébergeur pour la production.


```bash
npm run doctor:kit
npm install
npm run dependencies:check
npm run setup
```

`doctor:kit` est un diagnostic non destructif : il indique ce qui est déjà prêt et ce qu’il reste à installer, sans bloquer les services optionnels. Le premier `npm install` génère le `package-lock.json`; avant une mise en production, `npm run dependencies:check:production` exige ensuite le lockfile et les dépendances installées.

L'assistant principal demande uniquement les choix de base :

- pays principal et devise ;
- nom et URL locale de l'application ;
- niveau de sécurité (`standard`, `high`, `maximum`) ;
- Resend ou aucun fournisseur email ;
- Google OAuth/Search Console si souhaités.

Les paiements, Cloudflare domaine/DNS et Cloudinary restent **optionnels** et sont configurés seulement en fin de parcours via `/setup-saas`.

Il génère :

```text
africa-saas.config.json
.env.local
generated/setup-summary.json
```

`BETTER_AUTH_SECRET` est créé automatiquement avec un générateur cryptographique. Les vraies clés Neon, Resend et paiement ne sont jamais inventées.

### Exemple Côte d'Ivoire

```bash
npm run setup -- \
  --non-interactive \
  --country=CI \
  --name="Mon SaaS" \
  --security=high
```

Puis :

```bash
npm run setup:check
npm run db:generate
npm run db:migrate
npm run security:check
npm run dev
```

`npm run payments:routes` n’est utilisé qu’en Phase 17 si des paiements sont activés. Il génère alors un fichier SQL **à relire** dans `generated/payment-routes.sql` et ne modifie pas automatiquement une base de production.

## Presets pays V0.7

Le kit fournit des presets pour :

```text
CI  Côte d'Ivoire  XOF
SN  Sénégal        XOF
BJ  Bénin          XOF
BF  Burkina Faso   XOF
TG  Togo           XOF
CM  Cameroun       XAF
NG  Nigeria        NGN
GH  Ghana          GHS
KE  Kenya          KES
```

Les presets sont des points de départ. La disponibilité réelle d'un opérateur et d'une devise doit toujours être confirmée dans le contrat du marchand avec chaque provider.

## Smart Payment Router

La V0.5/V0.6 conserve le moteur de routage :

```text
Pays + méthode
     ↓
providers autorisés
     ↓
priorité admin
     ↓
santé récente
     ↓
checkout
```

Un fallback automatique peut avoir lieu uniquement lors de la **création du checkout** et uniquement lorsque l'utilisateur n'a pas choisi explicitement un provider. Un paiement n'est jamais validé par le router.

Validation :

```text
webhook/IPN authentifié
        ↓
re-vérification API fournisseur
        ↓
montant + devise + référence
        ↓
idempotence
        ↓
abonnement activé
```

## Providers

| Provider | Statut du kit |
|---|---|
| FedaPay | production après tests marchand |
| Chariow | production après tests/mapping |
| PayDunya | production après tests marchand |
| Flutterwave | beta |
| Djomy | merchant-validation — bloqué par le wizard |
| Moneroo | production après tests marchand |
| PayTech | beta |
| Bictorys | beta |
| Stripe | scaffold — bloqué |

Le wizard refuse volontairement les providers `scaffold` ou `merchant-validation`. Les providers `beta` restent activables uniquement pour sandbox/tests contrôlés.

## Sécurité

La sécurité est une partie centrale du kit :

- headers CSP/HSTS et protections navigateur ;
- validation serveur ;
- 2FA admin selon niveau de sécurité ;
- rate limiting ;
- Turnstile optionnel ;
- audit/security events ;
- webhooks idempotents ;
- prix relus côté serveur ;
- `.env.local` non commité ;
- checklist de mise en production ;
- procédure d'incident.

Avant production :

```bash
npm run setup:check
npm run security:check
npm run runtime:check
npm run features:check
npm run security:audit
npm run design:check
npm run typecheck
npm run test
npm run build
npm run smoke:system
```

Puis suivre :

```text
docs/production-checklist.md
SECURITY.md
```

## Stack

```text
Next.js
TypeScript
Neon PostgreSQL
Drizzle ORM
Better Auth
Resend
Cloudinary (optionnel, images publiques)
Upstash (optionnel)
FedaPay / Chariow / PayDunya / Flutterwave / Moneroo / PayTech / Bictorys
GitHub Actions
Vercel / Cloudflare
```

## Documentation V0.7

```text
docs/setup-wizard.md
docs/web-setup.md
docs/production-checklist.md
docs/payments/smart-router.md
docs/payments/paydunya.md
docs/payments/djomy.md
docs/security/*
docs/google/search-console.md
docs/google/cloud-console.md
docs/design/banani.md
docs/payments/skills-review-v0.7.1.md
docs/payments/reconciliation.md
DESIGN.md
```

## Important avant production

1. Faire `npm install` et commiter le vrai `package-lock.json`.
2. Utiliser une base Neon production séparée du développement.
3. Tester chaque gateway en sandbox puis avec de petits paiements live contrôlés.
4. Vérifier les webhooks/IPN, rejouages et montants erronés.
5. Activer 2FA pour les administrateurs.
6. Ne jamais placer une clé privée dans une variable `NEXT_PUBLIC_*`.
7. Tester une restauration de base de données.

## Google Search Console

Le kit génère `/sitemap.xml` et `/robots.txt` et peut injecter la balise de vérification Google avec :

```env
GOOGLE_SITE_VERIFICATION=
```

Pour une propriété de domaine, la validation DNS reste recommandée. Un helper API lecture seule est disponible dans `lib/google/search-console.ts`.

## Google Cloud Console / Connexion Google

Configurer dans `.env.local` :

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true
```

Callback Better Auth :

```text
http://localhost:3000/api/auth/callback/google
https://votre-domaine.com/api/auth/callback/google
```

L'écran admin `/admin/integrations/google` affiche uniquement l'état de configuration, jamais les secrets.

## Banani

La connexion Banani/Codex utilise désormais `.codex/config.toml`. Le fichier est volontairement vide dans le starter et ignoré par Git.

```bash
npm run banani:prepare
```

Ensuite, ouvre `.codex/config.toml` et colle manuellement la configuration MCP obtenue depuis ton compte Banani. Le kit n’écrit jamais automatiquement l’URL ou le bearer token.

Vérification sans afficher le token :

```bash
npm run banani:check
```

Après connexion MCP, importe les écrans, mets à jour `design/banani/screens.json`, puis lance `npm run design:check` et `npm run design:plan`. Voir `docs/design/banani.md`.

## Réconciliation paiements

Configurer :

```env
CRON_SECRET=
```

Puis appeler périodiquement :

```text
POST /api/cron/reconcile-payments
Authorization: Bearer <CRON_SECRET>
```

Les paiements `pending` et `failed` récents sont re-vérifiés auprès du fournisseur jusqu'à 14 jours afin de rattraper les confirmations Mobile Money tardives.

---

# V0.8 — Banani Implementation Planner + Production Doctor

Après import des écrans Banani, ne commencez pas directement à coder tout le SaaS. Mettez à jour `design/banani/screens.json`, puis lancez :

```bash
npm run design:plan
```

Le kit génère `generated/implementation-plan.md`. Les agents IA doivent lire `AGENTS.md` et suivre le plan phase par phase, avec critères de validation avant de continuer.

Avant production :

```bash
npm run doctor:production
```

Et lorsque l'URL de production est accessible :

```bash
npm run doctor:production:online
```

Le rapport est enregistré dans `generated/production-doctor.json` et visible dans `/admin/production-doctor`.

Le Doctor contrôle notamment configuration, env, Better Auth, Neon, Resend, état du stockage, Google, providers activés, routes webhooks, réconciliation, lockfile, dépendances épinglées, sécurité structurelle et — en mode online — DNS, HTTPS, headers, robots et sitemap.

Un score élevé n'est pas une preuve absolue de sécurité : `npm run security:audit`, les tests à deux comptes, si des paiements sont activés, leurs tests sandbox et la réconciliation restent obligatoires.


## Skeleton loaders V0.8.3

Toute page data-driven doit fournir un `loading.tsx` ou un fallback `Suspense` basé sur `components/ui/skeleton.tsx`. Les skeletons imitent la structure finale, sont mobile-first, respectent `prefers-reduced-motion` et sont contrôlés par `npm run ui:loading-check`.

## SEO Google & aperçus de partage V0.8.6

Le kit inclut maintenant une couche SEO par défaut :

```text
lib/seo/site.ts
lib/seo/metadata.ts
components/seo/json-ld.tsx
app/opengraph-image.tsx
app/twitter-image.tsx
app/manifest.ts
app/sitemap.ts
app/robots.ts
public/icon.svg
```

Chaque page publique doit définir un titre, une description, une URL canonical et sa stratégie d'indexation. Les espaces privés (`/dashboard`, `/admin`, `/setup`, `/api` et auth) restent `noindex` et hors sitemap.

L'image Open Graph par défaut est générée en 1200×630 pour accompagner les liens partagés sur WhatsApp, Facebook, LinkedIn, X et autres clients compatibles. Les pages marketing importantes peuvent définir leur propre image de partage.

Contrôle :

```bash
npm run seo:check
```

Après déploiement, compléter la vérification réelle avec Google Search Console et :

```bash
npm run doctor:production:online
```

Le kit optimise la préparation technique SEO mais ne promet jamais une position Google : la qualité et la pertinence du contenu, la performance, les liens et la concurrence restent déterminants.


## V0.8.6 — Deployment & Environment Handoff

Avant GitHub/Vercel, lance :

```bash
npm run deploy:handoff
```

Puis suis `generated/deployment-handoff.md`. Le rapport liste les variables, services, webhooks et callbacks à configurer sans jamais révéler les valeurs secrètes. L’IA doit avancer gate par gate jusqu’au Production Doctor final.


## Documentation de version

- `AUDIT.md` : dernier audit consolidé du kit.
- `CHANGELOG.md` : changements de la version courante.

Les anciens fichiers `AUDIT-V...` et `CHANGELOG-V...` ne sont pas livrés dans le starter afin de garder la racine propre. L’historique détaillé doit vivre dans Git/GitHub.



## Paiements optionnels — configurés seulement avant mise en ligne

Le kit démarre et reste valide avec :

```json
"paymentsEnabled": false,
"providers": [],
"defaultProvider": null
```

Le wizard initial `npm run setup` **ne demande plus aucun provider**.

En Phase 17 seulement :

```bash
# SaaS avec paiements
npm run payments:setup

# SaaS sans paiements
npm run payments:setup -- --none
```

Si aucun paiement n’est nécessaire, FedaPay, PayDunya, Chariow, Flutterwave, Moneroo, etc. ne sont jamais requis.

## /setup-saas — démarrage guidé dans Antigravity

Dans le chat de l’agent, écris simplement :

```text
/setup-saas
```

L’agent doit lire `.agents/skills/setup-saas/SKILL.md`, exécuter `npm run setup-saas`, présenter les voyants rouges/verts et guider la configuration gate par gate. Aucun compte n’est requis pour accéder au kit.

Équivalent terminal :

```bash
npm run setup-saas
```


## Cloudflare (optionnel, Phase 18)
Le kit peut guider l’achat/gestion du domaine et la configuration DNS via Cloudflare, mais Cloudflare n’est jamais requis. Utiliser `npm run cloudflare:setup` seulement en Phase 18. Sans Cloudflare, exécuter `npm run cloudflare:setup -- --none` puis marquer la phase `skipped`. Cette option domaine/DNS est distincte de Cloudflare R2, qui reste non intégré.


## Cloudinary (optionnel)

Les uploads d’images peuvent être activés tardivement en Phase 19 avec `npm run cloudinary:setup`. Un SaaS sans upload d’images n’a besoin d’aucun compte Cloudinary. Le endpoint de référence `/api/uploads/images` est authentifié et limite types/taille côté serveur.

## Commande `/provider`

Dans l'Agent Antigravity, utilise :

```text
/provider
```

pour afficher le catalogue des skills providers disponibles et la syntaxe pour les appeler.

Exemples :

```text
/provider chariow
/provider moneroo
/provider paytech
/provider bictorys
/provider stripe
/provider paydunya
```

Le registre officiel est `config/provider-skills.json`. Un provider peut avoir un skill dédié, utiliser un skill partagé, n'avoir qu'une documentation d'intégration, ou seulement un adaptateur de code. Le workflow doit toujours afficher cette différence clairement.

Équivalent terminal :

```bash
npm run provider
npm run provider -- chariow
```

## Commandes Antigravity (`/setup-saas` et `/provider`)

Les commandes personnalisées du kit sont désormais de vrais **Agent Skills Antigravity** dans `.agents/skills/` :

- `/setup-saas` → `.agents/skills/setup-saas/SKILL.md`
- `/provider` → `.agents/skills/provider/SKILL.md`
- `/provider chariow`, `/provider fedapay`, etc. pour cibler un fournisseur.

Si une session Antigravity était déjà ouverte avant l'ajout des skills, rouvrir/recharger le projet ou démarrer une nouvelle conversation afin que l'index des skills soit rafraîchi.

Fallback terminal :

```bash
npm run setup-saas
npm run provider
npm run provider -- chariow
```


## Compatibilité de tests

Le starter fixe **Vitest 4.1.11** avec Better Auth 1.7.3. Ne remplacez pas automatiquement Vitest par la major 5 sans vérifier les peer-dependencies. Évitez `npm install --force` et `--legacy-peer-deps` : corrigez les versions à la source.

## Protection contre les faux avertissements d’hydratation

Le `RootLayout` applique `suppressHydrationWarning` **uniquement** sur `<body>`. Cela évite le panneau d’erreur React/Next.js lorsque certaines extensions navigateur injectent un attribut dans `<body>` avant l’hydratation (par exemple `__processed_...="true"`).

Cette protection est volontairement limitée au `<body>` : elle ne masque pas les vraies divergences d’hydratation dans les composants de l’application. Vérification :

```bash
npm run ui:hydration-check
```


## Import Banani après connexion MCP
Après `npm run banani:check`, utilise `/import-banani` dans Antigravity/Codex. L’agent récupère les écrans accessibles via Banani MCP, écrit un snapshot sans secret, compare avec les routes/composants/features du starter puis génère un gap analysis et le plan d’implémentation avant le code. Voir `docs/design/import-banani.md`.

## Upstash Redis (optionnel)

Upstash peut être activé en **Phase 16** pour le cache TTL, le rate limiting distribué et les états temporaires. Neon reste la source de vérité.

```bash
npm run upstash:setup
npm run upstash:check
npm run upstash:check:online
```

Pour ne pas l’utiliser :

```bash
npm run upstash:setup -- --none
```



### Dependency security floor
`npm run security:versions` bloque les régressions sous les versions minimales de sécurité revues pour Next.js, React, Drizzle ORM et Better Auth. Ce contrôle complète `npm audit`; il ne le remplace pas.


## Staging Vercel obligatoire

Avant Production : `npm run staging:deploy` → `npm run staging:test -- --url=...` → `npm run staging:approve -- --url=...` → `npm run deploy:production:check`. La production est bloquée sans approbation valide du commit courant. Voir `docs/deployment/staging-vercel.md`.
