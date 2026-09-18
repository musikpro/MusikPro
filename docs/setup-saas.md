# Setup SaaS guidé

Le workflow `/setup-saas` guide Africa SaaS Kit en **21 phases**. Chaque phase commence par une explication simple : **à quoi sert le service**, **ce qu’il apporte au SaaS**, **s’il est obligatoire ou optionnel**, puis seulement les étapes de configuration.

Le workflow n’affiche pas uniquement une checklist technique : il doit permettre à une personne non spécialiste de comprendre pourquoi Neon, Better Auth, Resend, Vercel, Cloudflare ou Cloudinary sont utilisés avant de les configurer.

## Vérification rapide du kit

Après extraction, `npm run kit:verify` est la commande recommandée : elle exécute les contrôles statiques et sécurité immédiatement, puis ajoute automatiquement les contrôles dynamiques après `npm install`. Elle ne rend aucun service optionnel obligatoire.

## Principes
- une seule phase détaillée à la fois ;
- la roadmap complète reste visible ;
- aucune clé secrète dans le chat ;
- CONFIGURÉ ≠ TESTÉ ;
- paiements, Cloudflare et Cloudinary sont optionnels ;
- une phase n’est verte qu’après contrôle réel ou `skipped` explicite lorsqu’elle est optionnelle.



## Computer Use en Phase 2

Dans Antigravity, Browser Tools sont une capacité intégrée, pas une dépendance npm. La Phase 2 doit prouver leur fonctionnement par un vrai test Browser Subagent sur la documentation officielle Antigravity, sans dépendre de npm. Après l’installation des dépendances, l’agent réutilise cette capacité sur la homepage locale, `/api/health`, puis comme vérification visuelle continue durant les phases UI, OAuth, paiements sandbox, staging et production. Voir `docs/computer-use/antigravity-browser.md`.

## Banani MCP en Phase 9

La connexion Banani passe par le fichier local **`.codex/config.toml`**. Le kit le fournit vide et ne doit jamais y écrire automatiquement un token.

```bash
npm run banani:prepare
```

Puis l’utilisateur colle manuellement sa configuration MCP Banani dans `.codex/config.toml` et vérifie :

```bash
npm run banani:check
```

Le fichier est ignoré par Git. Le token ne doit jamais être collé dans le chat, une capture, un commit ou une documentation.

### Après la connexion : `/import-banani`
Une fois le MCP Banani connecté, l’étape officielle est désormais :

```text
/import-banani
```

L’agent doit parcourir le projet Banani via les outils MCP réellement disponibles, écrire `design/banani/imported-design.json`, puis lancer :

```bash
npm run import-banani:check
npm run import-banani:analyze
```

Le résultat compare le design avec le starter et génère `generated/banani-gap-analysis.md` puis `generated/implementation-plan.md`. Aucun code massif ne doit être lancé avant cette comparaison.


## Upstash optionnel en Phase 16

Upstash Redis est une phase dédiée et facultative. Il sert au cache TTL, au rate limiting distribué et aux états temporaires. Neon reste la source de vérité. Utiliser `npm run upstash:setup` ou `npm run upstash:setup -- --none`, puis `npm run upstash:check:online` si activé.

## Fin du parcours
La Phase 20 finalise et contrôle le SaaS Web. La Phase 21 Mobile App est ensuite optionnelle.

La Phase 20 inclut le contrôle final :

```bash
npm run conformity:check
```

Ce test produit :
- `generated/conformity-report.md`
- `generated/conformity-report.json`

Il vérifie notamment les fichiers requis, JSON, scripts npm, `.gitignore`, absence de fichiers secrets locaux, propreté des audits/changelogs, règles `/setup-saas`, protections des paiements/webhooks, skeleton loaders, SEO, health/readiness, tests unitaires, lint/format et présence du lockfile.

Un `FAIL` doit être corrigé avant de considérer le kit conforme. Le test de conformité reste complémentaire au `build`, à `npm audit`, aux tests des services externes et au staging Vercel.

## Gates renforcés V0.8.16

En Phase 13, ajouter aux contrôles existants :

```bash
npm run runtime:check
npm run features:check
npm run smoke:system
```

`runtime:check` protège la compatibilité Node.js de toutes les Route Handlers. `features:check` empêche deux features de revendiquer la même route et vérifie les fichiers propriétaires. `smoke:system` s'exécute contre un serveur local ou un preview via `SMOKE_BASE_URL`.

En Phase 17, après activation de paiements :

```bash
npm run cron:generate
```

Cette commande ne fait rien si aucun provider n'est activé.


## Mobile App WebView optionnelle en Phase 21

Après déploiement et conformité du Web, le projet peut rester Web-only ou activer `mobileAppEnabled`. Le mode officiel est une app Capacitor WebView qui ouvre le SaaS HTTPS déjà en ligne. Aucune dépendance Capacitor n’est installée par défaut. Voir `docs/mobile/mobile-app-pipeline.md`.

```bash
npm run mobile:app:configure -- --none
# ou
npm run mobile:app:configure -- --app-id=com.entreprise.app --url=https://app.exemple.com
npm run mobile:app:install
npm run mobile:app:prepare
npm run mobile:app:check
```

## CRUD Clients post-Banani (V0.9.8)

Après la Phase 9 `/import-banani`, la Phase 10 met à disposition le CRUD Clients si le SaaS en a besoin. Ne pas brancher l’UI Clients avant l’import Banani. Utiliser ensuite `npm run clients:crud:generate`, `npm run clients:crud:check`, puis `npm run clients:crud:migrate` sur la base de développement si la fonctionnalité est retenue. Drizzle reste le socle; Prisma est ciblé sur `Client`.
