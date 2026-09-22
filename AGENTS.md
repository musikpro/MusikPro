# Règle prioritaire — langue de réponse
- **Toujours répondre à l’utilisateur en français.**
- Les explications, diagnostics, résumés, demandes de confirmation et recommandations doivent être rédigés en français, quel que soit l’agent utilisé (ChatGPT/Codex/Antigravity ou Claude Code).
- Les commandes, noms de fichiers, identifiants de code, noms d’API et messages techniques peuvent rester dans leur forme originale quand cela évite de casser ou d’altérer le code.
- Ne changer de langue que si l’utilisateur demande explicitement une autre langue pour une réponse précise.


# Règle obligatoire — refactorisation propre et non régressive
- **Toute modification, correction, mise à jour, migration, intégration ou nouvelle fonctionnalité doit être traitée comme une refactorisation propre, professionnelle et non régressive.**
- Inspecter d’abord l’architecture, les dépendances et les fonctionnalités déjà présentes avant de modifier le code.
- Préserver les comportements existants, routes, contrats API, modèles de données, variables d’environnement, règles de sécurité, skills et workflows, sauf demande explicite nécessitant leur évolution.
- Préférer des changements additifs, isolés, réversibles et rétrocompatibles plutôt qu’une réécriture destructive.
- Ne jamais supprimer ou casser une fonctionnalité existante pour en ajouter une nouvelle ; si une évolution incompatible est réellement nécessaire, prévoir une migration claire et documentée.
- Après chaque refactorisation, exécuter les contrôles pertinents du kit (`npm run kit:integrity`, `npm run kit:audit`, `/security-saas`, gates Zod et tests de la fonctionnalité concernée) et corriger toute régression avant de considérer le travail terminé.


# Règle prioritaire — Mobile App Pipeline WebView optionnel
- Le SaaS Web Next.js est construit, testé et déployé avant toute préparation Android/iOS.
- L’architecture mobile officielle est **Capacitor WebView → URL HTTPS du SaaS en ligne** (`webview-hosted`), pas une copie du backend Next.js dans l’app.
- La **Phase 21** est optionnelle. `mobileAppEnabled=false` est un état valide et ne doit déclencher aucune installation Capacitor.
- `mobile:check` reste le gate responsive du Web; les commandes `mobile:app:*` sont réservées au conteneur Android/iOS.
- Ne jamais déplacer les secrets, la connexion Neon, les clés Resend ou les secrets de paiement vers le bundle mobile.
- Toute entrée non fiable continue d’être validée côté serveur avec Zod; une validation mobile n’est qu’une couche UX supplémentaire.
- Une adaptation native doit être additive, isolée et réversible; elle ne doit jamais devenir nécessaire au rendu Web.


## Upstash optionnel
- Upstash Redis est **optionnel** et se configure en Phase 16, après le staging de base et avant les paiements.
- Neon reste la source de vérité. Upstash sert au cache TTL, au rate limiting distribué et aux états temporaires.
- Ne jamais mettre `UPSTASH_REDIS_REST_TOKEN` dans une variable `NEXT_PUBLIC_*`, dans Git ou dans le chat.
- Si Upstash n’est pas utilisé, marquer la Phase 16 `skipped`; le SaaS doit continuer à fonctionner directement avec Neon.
- Si Upstash est activé, valider `npm run upstash:check:online` et `/api/readyz` avant production.


# Règle prioritaire — Cloudflare optionnel
- Cloudflare n’est jamais obligatoire pour construire ou déployer un SaaS avec le kit.
- Le proposer seulement en **Phase 18**, après le staging et après la décision paiements.
- La Phase 18 concerne domaine/DNS/proxy éventuel, pas Cloudflare R2.
- Si Cloudflare n’est pas utilisé, marquer la Phase 18 `skipped` et continuer vers la production.
- Ne jamais demander un token API Cloudflare pour une configuration DNS manuelle guidée.

# Règle prioritaire — paiements optionnels

Les providers de paiement ne sont **jamais obligatoires** pour utiliser, construire ou déployer un SaaS avec ce kit.

- Ne demander aucun provider pendant le setup initial.
- Ne configurer les paiements qu’en **Phase 17**, juste avant la mise en ligne, si le produit en a besoin.
- Si le SaaS n’a pas besoin de paiement, marquer la Phase 17 `skipped` et continuer.
- Ne jamais considérer l’absence de provider comme une erreur de configuration.
- `npm run payments:setup` est la commande officielle de configuration tardive des paiements.

# /setup-saas — point d’entrée officiel du kit

Quand l’utilisateur écrit exactement `/setup-saas` dans Antigravity/Codex :
1. Lire `.agents/skills/setup-saas/SKILL.md`.
2. Exécuter `npm run setup-saas`.
3. Lire `generated/setup-saas-report.md` et `generated/setup-saas-report.json`.
4. Présenter la roadmap complète des **21 phases** avec 🟢 / 🟡 / 🔴 / ⚪ et une courte explication du rôle de chaque phase.
5. Détailler ensuite uniquement la première phase non verte : objectif, étapes exactes, emplacement des paramètres, commandes, résultat attendu et validation.
6. Après chaque correction, relancer `npm run setup-saas` avant de passer à la phase suivante.
7. Ne jamais demander de secret dans le chat : indiquer où le saisir localement puis demander seulement confirmation.
8. Distinguer toujours CONFIGURÉ, TESTÉ et NON VÉRIFIÉ.

# Instructions IA — Africa SaaS Kit

## Explication pédagogique obligatoire des phases
Avant toute action dans une phase `/setup-saas`, expliquer en langage simple :
1. à quoi sert le service ou la phase ;
2. ce qu'il apporte concrètement au SaaS ;
3. s'il est obligatoire ou optionnel ;
4. le résultat attendu à la fin ;
5. puis seulement les étapes à exécuter.

À la fin de la Phase 20, lancer `npm run conformity:check`, lire `generated/conformity-report.md` et corriger tout FAIL avant de considérer le SaaS Web conforme. La Phase 21 Mobile App est ensuite optionnelle et ne doit jamais remettre en cause un Web-only valide.


## Banani / Design
Pour connecter Banani dans Codex/Antigravity :
1. Exécute `npm run banani:prepare`. Cette commande doit seulement créer `.codex/config.toml` vide s’il manque et ne jamais écraser une configuration existante.
2. Demande à l’utilisateur d’ouvrir `.codex/config.toml` et d’y coller lui-même la configuration MCP fournie par Banani.
3. Ne demande jamais le token Banani dans le chat et ne l’écris jamais automatiquement dans un fichier.
4. Exécute `npm run banani:check` après configuration. Le contrôle ne doit jamais afficher la valeur du token.
5. `.codex/config.toml` doit rester ignoré par Git. Si le fichier est suivi par Git ou si un token a été exposé, demander une rotation/révocation du token avant de continuer.

Quand des écrans Banani, Figma ou captures sont importés :
1. Ne code pas immédiatement tout le SaaS.
2. Mets à jour `design/banani/screens.json` avec les écrans réellement observés.
3. Lis `DESIGN.md` et `docs/design/implementation-planner.md`.
4. Lance `npm run design:plan`.
5. Lis `generated/implementation-plan.md`.
6. Présente le plan d'implémentation à l'utilisateur et avance phase par phase.
7. À la fin de chaque phase, exécute les tests/gates demandés avant de continuer.
8. N'invente jamais une règle métier, un endpoint de paiement ou une permission non démontrée.


## /import-banani — import design complet puis comparaison
Quand l’utilisateur saisit `/import-banani` après avoir connecté Banani :
1. Lire `.agents/skills/import-banani/SKILL.md`.
2. Exécuter `npm run banani:check`.
3. Utiliser les outils MCP Banani réellement disponibles pour parcourir le projet et observer **tous les écrans accessibles** ; ne jamais inventer un nom d’outil MCP.
4. Écrire le snapshot sans secret dans `design/banani/imported-design.json` selon `design/banani/import-schema.json`.
5. Exécuter `npm run import-banani:check` puis `npm run import-banani:analyze`.
6. Lire `generated/banani-gap-analysis.md` et `generated/implementation-plan.md`.
7. Présenter d’abord RÉUTILISER / ADAPTER / CRÉER / À CONFIRMER.
8. Ne coder qu’après validation du plan par l’utilisateur.
9. Avant toute nouvelle feature transversale, lire `config/features.json` pour éviter les doublons.
10. Toute donnée non observable depuis Banani reste `NON VÉRIFIÉ` ou `À CONFIRMER`.

## Mobile-First obligatoire
Africa SaaS Kit cible une vraie application mobile-first et responsive.
1. Construis chaque écran d'abord pour 320–430 px, puis tablette/desktop.
2. Valide au minimum 320, 360, 390, 430, 768, 1024 et 1440 px.
3. Aucun écran n'est terminé s'il provoque un scroll horizontal global, des boutons tronqués ou des cibles tactiles trop petites.
4. Préserve la safe area sur mobile et une navigation fluide utilisable au pouce.
5. Les formulaires sont une colonne par défaut et doivent rester utilisables avec le clavier mobile.
6. Les tableaux doivent rester lisibles : cartes/listes mobiles si pertinent, sinon scroll horizontal localisé.
7. Exécute `npm run mobile:check` à chaque phase UI importante.
8. Lis `docs/mobile/mobile-first-delivery.md` avant d'implémenter les écrans.
9. Ne déclare jamais le responsive validé sans avoir réellement vérifié les viewports demandés ; sinon marque `NON VÉRIFIÉ`.

## Paiements locaux / ngrok
Quand l'utilisateur veut tester les paiements en local :
1. Lis `docs/payments/local-payment-lab.md`.
2. Vérifie que les clés utilisées sont SANDBOX/TEST.
3. Guide l'utilisateur terminal par terminal : `npm run dev`, `npm run payments:ngrok`, puis `npm run payments:local`.
4. Utilise `npm run payments:local:apply` uniquement pour écrire `PAYMENT_WEBHOOK_BASE_URL` dans `.env.local`, puis demande de redémarrer Next.js.
5. Donne l'URL webhook exacte du provider générée par `generated/local-payment-lab.md`.
6. Ne considère jamais ngrok comme une vérification de paiement : signature/IPN + relecture API fournisseur + idempotence restent obligatoires.
7. Le test n'est terminé qu'après succès, échec/annulation, pending/retard et duplicate/replay.
8. Vérifie dans la base qu'un webhook rejoué n'accorde jamais deux fois l'abonnement ou les crédits.
9. À la fin, arrête le tunnel et rappelle de remplacer les URLs sandbox/ngrok par le vrai domaine HTTPS en staging/production.

## Sécurité
- L'UI ne remplace jamais les contrôles serveur.
- Une Server Action est un endpoint public : auth + permission + validation obligatoires.
- Les paiements ne sont crédités qu'après vérification fournisseur + idempotence.
- Les secrets ne vont jamais dans `NEXT_PUBLIC_*`.
- Avant production : `npm run security:audit` puis `npm run doctor:production`.

## Skeleton Loader Gate — obligatoire

Pour toute page ou zone qui attend des données :
- créer un `loading.tsx` App Router ou un `Suspense` avec fallback dédié ;
- utiliser les primitives de `components/ui/skeleton.tsx` ;
- faire correspondre le skeleton à la géométrie du contenu final pour limiter le layout shift ;
- concevoir d'abord à 320/360/390/430 px puis étendre tablette/desktop ;
- ne jamais ajouter de délai artificiel ;
- si des sous-zones ont des temps de chargement différents, préférer le streaming par `Suspense` afin que le contenu déjà prêt reste interactif ;
- respecter `prefers-reduced-motion` : aucun shimmer obligatoire lorsque l'utilisateur réduit les animations ;
- conserver des états distincts pour empty/error/unauthorized/offline.

Gate de livraison : une page data-driven sans skeleton approprié est INCOMPLÈTE.

## SEO Gate — obligatoire pour chaque page publique
Africa SaaS Kit doit être indexable proprement et partageable avec une image riche.
1. Lis `docs/seo/google-seo.md` avant d'ajouter une page marketing/public.
2. Chaque page publique doit avoir un title unique, une description, une canonical et une décision explicite index/noindex via `buildMetadata()` ou `generateMetadata()`.
3. Toute page indexable doit être ajoutée au sitemap ; aucune route privée ou technique ne doit y apparaître.
4. Les routes auth, dashboard, admin, setup et API restent `noindex` et hors sitemap.
5. Toute page importante doit avoir une image Open Graph pertinente ; le fallback global 1200×630 est acceptable uniquement tant qu'une image spécifique n'est pas nécessaire.
6. Vérifie l'aperçu de partage (Open Graph/Twitter) et ne déclare pas WhatsApp/Facebook/LinkedIn validés sans test réel sur une URL HTTPS publique.
7. Ajoute JSON-LD uniquement lorsque le type Schema.org correspond réellement au contenu visible ; ne fabrique jamais de notes, prix, avis ou données structurées trompeuses.
8. Préserve une hiérarchie sémantique H1/H2, des liens internes utiles et des `alt` descriptifs pour les images porteuses d'information.
9. N'essaie jamais de manipuler Google par bourrage de mots-clés, pages doorway ou contenu caché.
10. Exécute `npm run seo:check` après chaque phase publique importante.
11. Après déploiement : soumets le sitemap et inspecte les URLs stratégiques dans Google Search Console. Tant que cela n'est pas fait, marque l'indexation `NON VÉRIFIÉE`.

Gate de livraison : une page publique sans metadata/canonical/social preview appropriés est INCOMPLÈTE.

## Deployment Handoff Gate — GitHub → Vercel obligatoire
Quand l'utilisateur demande de mettre le SaaS en ligne, de connecter GitHub/Vercel, ou de préparer la production :
1. Lis `docs/deployment/vercel-github-handoff.md`.
2. Lance `npm run deploy:handoff` et lis `generated/deployment-handoff.md`.
3. Ne donne pas une liste générique inventée : utilise la configuration et les providers réellement présents dans le projet; s’il n’y en a aucun, ne rien inventer et indiquer que les paiements sont désactivés.
4. Guide l'utilisateur **gate par gate** : GitHub → Vercel → domaine → variables → Neon → Google/Resend → paiements/webhooks → cron → SEO → validation finale.
5. Présente les variables **par groupe**, avec nom exact, rôle, où récupérer la valeur, destination Vercel et état CONFIGURÉ/MANQUANT.
6. Ne demande jamais à l'utilisateur de coller une clé secrète dans le chat. Demande-lui de la saisir directement dans Vercel ou son terminal, puis de confirmer seulement « configuré ».
7. Ne révèle jamais les valeurs présentes dans `.env.local`, même si tu peux lire le fichier.
8. Les variables `NEXT_PUBLIC_*` sont publiques ; refuse d'y mettre une clé secrète.
9. Distingue Production / Preview : les clés live ne doivent pas être copiées automatiquement en Preview. Utilise sandbox/test lorsque nécessaire.
10. Après choix du domaine final, donne les URLs exactes : Google OAuth callback, webhooks de chaque provider actif, cron, sitemap et robots.
11. Ne réutilise jamais l'URL ngrok en production ; `PAYMENT_WEBHOOK_BASE_URL` doit devenir le vrai domaine HTTPS.
12. Ne déclare jamais un service PASS parce qu'une variable existe : le test réel sur le domaine final reste requis.
13. Termine seulement après `npm run verify:production` et `npm run doctor:production:online`, plus les tests manuels demandés.

Gate de livraison : une mise en ligne sans `generated/deployment-handoff.md` actualisé est INCOMPLÈTE.



## Computer Use / Browser Tools — vérification continue obligatoire dans Antigravity

- Dans Antigravity, la capacité navigateur est fournie par le **Browser Subagent / Browser Tools**; ne jamais inventer un package npm `computer-use`.
- La Phase 2 doit vérifier cette capacité par une vraie action navigateur avant de poursuivre. Utiliser `npm run computer-use:check`, puis marquer une preuve réelle avec `npm run computer-use:mark`.
- Si Browser Tools sont désactivés : guider vers **Settings → Browser → Browser Tools** et demander leur activation.
- Pour les actions sensibles, recommander **Request Review** et respecter l’Allowlist/Denylist; ne jamais désactiver les garde-fous pour gagner du temps.
- Pendant toutes les phases suivantes, utiliser Computer Use lorsqu’une surface web/visuelle doit être vérifiée : pages Banani, responsive, loading/empty/error, auth/OAuth, uploads, checkout sandbox, health/readiness, Vercel Preview, domaine final, SEO et Search Console.
- Une observation navigateur ne remplace jamais `test`, `typecheck`, `build`, `security:audit`, signature webhook ou `conformity:check`.
- L’utilisateur garde le contrôle des identifiants, MFA, achats, DNS critiques et passage sandbox → live.
- Si Computer Use est indisponible hors Antigravity, marquer la vérification `NON VÉRIFIÉE` ou `skipped` avec justification et fournir un test manuel équivalent.

## Mémoire de progression locale
Après un **vrai test réussi** (connexion DB, paiement sandbox, build, staging, etc.), l’agent peut mémoriser la phase avec :

`npm run setup-saas:mark -- --phase=N --status=passed --note="preuve/test effectué"`

Puis relancer `npm run setup-saas`. Ne jamais marquer une phase passée sur simple supposition ou présence d’une variable.


## Cloudinary optionnel
- Ne proposer Cloudinary qu’en **Phase 19**, si le SaaS a besoin d’uploads d’images.
- Sans upload : phase 18 `skipped`.
- Avec upload : utiliser `npm run cloudinary:setup`, tester réellement un upload et des refus de sécurité, puis seulement marquer la phase `passed`.
- `CLOUDINARY_API_SECRET` reste serveur-only et ne doit jamais être exposé via `NEXT_PUBLIC_`.

## Gate qualité backend — Phase 13

Avant le staging, l'agent doit aussi valider :
- `GET /api/health` répond 200 ;
- `GET /api/readyz` répond 200 lorsque Neon et les dépendances configurées sont disponibles ;
- `npm run format:check` ;
- `npm run lint` ;
- `npm run test` ;
- `npm run typecheck` ;
- `npm run build` ;
- `npm run audit:prod`.

Les migrations sont Drizzle et doivent être versionnées dans `db/migrations/`. Utiliser `DATABASE_URL_DIRECT` pour les migrations si une connexion Neon directe est configurée, sans remplacer `DATABASE_URL` côté application.


## Commande provider — obligatoire

Quand l'utilisateur saisit `/provider`, utilise `.agents/skills/provider/SKILL.md` comme workflow officiel.

- `/provider` ou `/provider list` : énumérer tous les providers, la commande à utiliser, le statut du skill et la maturité de l'adaptateur.
- `/provider <nom>` : lire `config/provider-skills.json`, puis charger uniquement les fichiers indiqués pour ce provider.
- Ne jamais prétendre qu'un skill dédié existe lorsqu'il n'est pas présent dans le registre.
- Les providers et leurs skills restent optionnels ; ne jamais forcer leur configuration avant la phase de monétisation.

## Feature ownership / anti-doublons

Avant d'ajouter une fonctionnalité transversale (auth, paiement, upload, SEO, cron, observabilité, API client), lire `config/features.json` et exécuter `npm run features:list`. Ne jamais créer une deuxième route, un deuxième helper ou un deuxième provider couvrant le même rôle sans raison documentée. Après ajout ou suppression d'une feature, mettre à jour `config/features.json` puis exécuter `npm run features:check`.

## Runtime API

Toutes les routes `app/api/**/route.ts` doivent déclarer `export const runtime = "nodejs"`. Le gate `npm run runtime:check` doit rester vert. Ne pas passer une route du starter en Edge sans audit de compatibilité Neon/Better Auth/crypto/providers.

## Client HTTP

Pour les nouveaux appels JSON côté client, préférer `lib/api/client.ts`. Les retries automatiques sont réservés à GET/HEAD. Ne jamais retry automatiquement POST/PUT/PATCH/DELETE après une erreur réseau ambiguë.

## Suppression sûre des features

Avant de supprimer une feature optionnelle, lire `config/features.json`. Vérifier `dependsOn`, `disableBehavior` et `removalComplexity`. Ne jamais supprimer un fichier simplement parce que l’écran qui l’utilisait a disparu. Préférer une désactivation par configuration pour les briques réutilisables. Après toute suppression ou refactorisation structurelle, exécuter `npm run features:check && npm run verify:code`.


## Premium Icon Gate — obligatoire et permanent

- Avant toute livraison et après chaque ajout/refactorisation de page, exécuter `npm run ui:icons-check`.
- Ne jamais utiliser `Sparkle`, `Sparkles`, `WandSparkles`, `WandSparkle`, `✨`, `✦`, `✧`, `★` ou des variantes décoratives équivalentes pour donner un aspect « IA » à l’interface.
- Ne pas remplacer ces icônes par des glyphes Unicode génériques (`⌂`, `◫`, `◉`, `◇`, etc.).
- Choisir une icône selon la fonction réelle. Pour le starter, préférer `components/ui/premium-icon.tsx`; toute bibliothèque externe doit conserver un style cohérent et accessible.
- Ce contrôle concerne toutes les pages existantes **et les futures pages** : une occurrence interdite sous `app/` ou `components/` bloque `verify:code`, `verify:production` et la CI.
- Après modification visuelle importante, compléter le contrôle statique par une vérification navigateur responsive lorsqu’un Browser Tool est disponible.

Gate de livraison : une page contenant une icône Sparkle/Sparklet ou un substitut décoratif interdit est INCOMPLÈTE.


## Security Baseline Gate (obligatoire)

Après toute création/modification d’une route API, table Drizzle, auth, upload, paiement ou fonctionnalité sensible :

1. exécuter `npm run security:baseline`;
2. toute nouvelle route `app/api/**/route.ts` doit être classifiée dans `config/security-routes.json` (auth + validation serveur + rate limiting/exemption justifiée);
3. toute nouvelle table doit être classifiée dans `config/security-rls.json`; préférer RLS pour toute donnée utilisateur/tenant/privée/financière;
4. ne jamais retirer `.env.local` du `.gitignore`, la vérification email production, le proxy auth ou le rate limiting;
5. avant livraison, exécuter `npm run security:release` et `npm run verify:production`;
6. sur une base Neon accessible, exécuter aussi `npm run security:db-check` pour vérifier réellement RLS + policies.

Une erreur du Security Baseline Gate est bloquante : ne pas contourner le contrôle par suppression du script, de la règle ou par exemption sans justification de sécurité.


## Zod Validation Gate — obligatoire et permanent

- Toute entrée non fiable structurée de première partie doit être validée par Zod.
- Le front-end peut valider avec `safeParse` pour l’UX, mais **le serveur doit toujours revalider** : ne jamais faire confiance au navigateur.
- Toute Server Action doit valider son `FormData`/payload avec Zod avant mutation.
- Toute nouvelle route API `POST`, `PUT`, `PATCH` ou `DELETE` doit utiliser Zod ou avoir une exemption explicite et justifiée dans `config/zod-validation.json`.
- Partager les schémas dans `lib/validation/` lorsqu’un contrat sert au client et au serveur.
- Après validation, utiliser uniquement `parsed.data`; éviter `z.any()` aux frontières de confiance et poser des bornes (`min`, `max`, `enum`, `regex`, `url`).
- Après toute nouvelle page/formulaire/API/Server Action, exécuter `npm run validation:zod-check`. Le gate fait partie de `verify:code`, `verify:production`, `ci:check` et `security:release`.

Une modification qui contourne ce gate est INCOMPLÈTE.


## General Refactor Gate — obligatoire

Après toute création ou modification importante de page, route API, Server Action, paiement, upload, authentification ou workflow CI, exécuter `npm run refactor:check`. Ne jamais contourner ce gate. Les pages `/dashboard/*` doivent hériter d'une validation serveur réelle via `requireUser()` et `/admin/*` via `requireAdmin()`. Ne jamais renvoyer le champ `raw` d’un provider de paiement au navigateur. Pour les endpoints mutateurs authentifiés de première partie, conserver les gardes d’origine/cross-site, de Content-Type et de taille avant parsing. Utiliser `node:crypto` et non `Math.random()` pour les identifiants ou tokens.


### Dependency security floor
`npm run security:versions` bloque les régressions sous les versions minimales de sécurité revues pour Next.js, React, Drizzle ORM et Better Auth. Ce contrôle complète `npm audit`; il ne le remplace pas.


### Commande `/security-saas`
- `/security-saas` est l'audit de sécurité à la demande officiel du kit.
- L'équivalent terminal est `npm run security-saas`; utiliser `npm run security-saas:online` quand Neon/Postgres est accessible pour confirmer réellement RLS + policies.
- Le rapport doit garder les contrôles impossibles en `À VÉRIFIER` plutôt que les déclarer PASS.
- Ne jamais afficher les valeurs de `.env.local`, les URL de base, tokens ou clés pendant l'audit.
- Après toute correction de sécurité importante, relancer `/security-saas` et vérifier le nouveau score/rang.

## CRUD Clients post-Banani

Le module `Client` Prisma et les routes `/api/clients/*` sont une brique complémentaire. Toujours importer/analyser les écrans Banani avant de brancher ces routes à l’UI. Conserver Zod côté serveur, Better Auth, rate limiting, request guards et RLS. Ne pas migrer les autres modules Drizzle vers Prisma sans demande explicite.


## Règle permanente — branchement de toutes les pages propriétaire ↔ base ↔ client

Toutes les pages métier du tableau de bord du propriétaire du SaaS et toutes les pages correspondantes du tableau de bord client doivent être reliées à la base de données. Cette règle couvre les pages actuelles et futures, notamment les crédits et tarifs, styles musicaux, occasions, collections, langues, fournisseurs IA, concours, utilisateurs, générations, paiements, notifications et autres catalogues configurables.

1. **Inventaire obligatoire** : avant toute nouvelle phase métier, inventorier les pages propriétaire, les tables ou vues utilisées, les actions disponibles et les pages clientes qui consomment ces données. Toute page sans source de données ou sans destination cliente doit être signalée et corrigée, ou être explicitement documentée comme page strictement administrative.
2. **Source de vérité unique** : Neon/Postgres est la source de vérité. Une liste statique, des fixtures, un état React, `localStorage` ou une maquette ne peuvent pas servir de source aux comptes réels.
3. **Schéma et migrations** : créer ou étendre le schéma Drizzle et ajouter une migration versionnée dans `db/migrations/`. Toute nouvelle table doit être enregistrée dans `config/security-rls.json`. Les exemples de catalogue sont des valeurs initiales explicites; ils ne doivent jamais créer de fausses données personnelles, commandes, paiements ou générations dans les comptes réels.
4. **CRUD complet** : chaque page de gestion propriétaire doit fournir, selon le besoin métier, la création, la lecture/liste et le détail, la modification et la suppression. Ajouter aussi activation/désactivation, brouillon/publication, recherche, filtres, pagination et ordre d’affichage lorsque ces actions ont un sens.
5. **Suppression sûre** : vérifier les dépendances avant suppression. Utiliser l’archivage ou la suppression logique pour une donnée déjà référencée; réserver la suppression définitive aux éléments sans dépendance ou dont la suppression en cascade est explicitement prévue et testée.
6. **Synchronisation propriétaire-client** : le tableau propriétaire, le tableau client réel et `/demo` doivent consommer des repositories/helpers serveur partagés. Toute création, modification, activation, désactivation, suppression ou réorganisation validée par le propriétaire doit être reflétée côté client après revalidation ou actualisation. Les clients ne reçoivent que les données actives, publiées et autorisées.
7. **Ordre partagé** : lorsqu’un ordre est visible côté client, utiliser le composant commun de glisser-déposer du projet. Le déplacement doit fonctionner uniquement depuis la poignée, être persisté en base et produire le même ordre dans les interfaces propriétaire, client réel et démo.
8. **Sécurité serveur** : toute mutation propriétaire passe par une Server Action ou une route serveur protégée par `requireAdmin()`, validée avec Zod et exécutée via la couche de données prévue par le projet. Les lectures et mutations clientes doivent appliquer `requireUser()` et les contrôles de propriété nécessaires. Utiliser `node:crypto` pour les identifiants, journaliser les mutations sensibles et revalider les routes concernées après succès.
9. **Aucune page orpheline** : aucun formulaire ne doit conserver un bouton factice ou désactivé faute de branchement, et aucune liste métier ne doit rester alimentée uniquement par des données locales. Une page temporairement non branchée doit afficher clairement son état INCOMPLET et ne peut pas être déclarée livrée.
10. **Démo fidèle** : `/demo` utilise les mêmes modèles, repositories et composants que le compte réel. Un fallback de démonstration doit être documenté, isolé et incapable d’injecter des données fictives dans un compte réel ou dans les statistiques du propriétaire.
11. **Composants communs** : réutiliser les composants de formulaire, menu déroulant, confirmation, cartes, listes, tableaux, pagination et glisser-déposer. Ne pas créer un deuxième endpoint, repository, helper ou moteur CRUD couvrant le même rôle sans justification dans `config/features.json`.
12. **États d’interface** : toute page connectée doit gérer chargement avec skeleton, données vides, erreur, non autorisé et hors ligne lorsque pertinent. Le rendu doit rester mobile-first, sans débordement horizontal global ni action tronquée.
13. **Registres et gates** : mettre à jour `config/features.json`, `config/security-routes.json`, `config/security-rls.json` et `config/zod-validation.json` selon les fichiers ajoutés. Exécuter au minimum `npm run features:check`, `npm run validation:zod-check`, `npm run security:baseline`, `npm run refactor:check`, `npm run typecheck`, `npm run test`, `npm run mobile:check` et `npm run ui:icons-check`. Lorsque Neon est accessible, appliquer la migration puis exécuter `npm run security:db-check`.
14. **Définition de terminé** : une page métier n’est terminée qu’après une mutation réellement persistée, une relecture depuis la base et une vérification du résultat dans le tableau propriétaire, le tableau client réel et la démo. Une interface seule, un tableau statique, des données uniquement en mémoire ou une mutation non relue depuis la base restent INCOMPLETS.


## Mandatory Staging Gate
- Toujours déployer et valider une Vercel Preview avant Production.
- Ne jamais contourner `npm run deploy:production:check`.
- Séparer les secrets/variables Preview et Production; préférer une base de staging distincte.

## Claude Code — agent officiellement supporté
- Lire `CLAUDE.md` lorsqu’une session est exécutée avec Claude Code.
- Les commandes `.claude/commands/` doivent réutiliser les scripts npm et les skills `.agents/skills/`; ne pas créer une deuxième logique métier.
- Exécuter `npm run claude-code:check` après installation/mise à jour de Claude Code.
- Pour Computer Use/Browser Claude Code, exécuter `npm run computer-use:claude:check`; le voyant ne devient vert qu’après un vrai test enregistré via `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.
- Le statut OpenAI et le statut Claude Code sont indépendants. Ne jamais copier automatiquement la preuve de l’un vers l’autre.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
