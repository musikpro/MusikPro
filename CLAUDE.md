# Africa SaaS Kit — instructions Claude Code

Claude Code est l’unique agent de développement officiellement supporté par ce kit. `CLAUDE.md` est la source de vérité unique des règles ; les skills sont centralisés dans `.claude/skills/` (providers : `.claude/skills/providers/`).

## Langue obligatoire

- Toujours répondre à l’utilisateur en **français**.
- Toutes les explications, analyses, comptes rendus, questions et recommandations doivent être en français.
- Garder les commandes, chemins, identifiants, noms d’API et extraits de code dans leur syntaxe d’origine lorsque nécessaire.
- Ne répondre dans une autre langue que si l’utilisateur le demande explicitement pour une réponse précise.

## Règle obligatoire — refactorisation propre et non régressive

- **Toute modification, correction, mise à jour, migration, intégration ou nouvelle fonctionnalité doit être traitée comme une refactorisation propre, professionnelle et non régressive.**
- Inspecter d’abord l’architecture, les dépendances et les fonctionnalités déjà présentes avant de modifier le code.
- Préserver les comportements existants, routes, contrats API, modèles de données, variables d’environnement, règles de sécurité, skills et workflows, sauf demande explicite nécessitant leur évolution.
- Préférer des changements additifs, isolés, réversibles et rétrocompatibles plutôt qu’une réécriture destructive.
- Ne jamais supprimer ou casser une fonctionnalité existante pour en ajouter une nouvelle ; si une évolution incompatible est réellement nécessaire, prévoir une migration claire et documentée.
- Après chaque refactorisation, exécuter les contrôles pertinents du kit (`npm run kit:integrity`, `npm run kit:audit`, `/security-saas`, gates Zod et tests de la fonctionnalité concernée) et corriger toute régression avant de considérer le travail terminé.

## Règle obligatoire — traduction multilingue (i18n)

- **Toute nouvelle fonctionnalité visible côté client doit rester traduisible automatiquement dans les langues actives (FR = source, EN/ES/PT aujourd'hui) via l'IA déjà connectée — jamais de texte français figé qui ne suit pas le changement de langue.**
- Deux mécanismes existent selon la nature du texte ; ne pas en inventer un troisième :
  1. **Texte fixe de l'interface** (libellés, boutons, titres, messages codés en dur dans les composants) → l'envelopper avec `translate`/`t` (ou `translateTemplate` pour du texte avec valeurs dynamiques du type `{param}` — ne jamais interpoler la valeur dans le template literal avant l'appel, sinon la clé du dictionnaire ne correspond plus) depuis `lib/i18n/translate.ts`. Après ajout, lancer `npm run i18n:manifest` (obligatoire : régénère `lib/i18n/manifest.json` ; `npm run i18n:check`, déjà dans `ci:check`, échoue si le manifeste est périmé). `npm run i18n:sync` reste optionnel en local : les textes absents de `lib/i18n/locales/{en,es,pt}.json` se traduisent depuis `/admin/languages` (bouton « Actualiser les traductions » : traduit les textes du manifeste manquants, les stocke dans la table `ui_translations` lue par `/api/i18n/overlay`, ne retraduit jamais un texte déjà traduit ; voyant « N textes d'interface non traduits »).
     - Un texte français accentué écrit en dur dans les composants du périmètre client échoue au lint (règle `eslint/i18n-client-text.mjs`, niveau `error`) ; pour une valeur canonique légitime, désactiver la ligne avec `// eslint-disable-next-line no-restricted-syntax -- <raison>`.
     - `t()` ne doit jamais s'évaluer au chargement d'un module (tableaux/constantes de module) : l'appeler au rendu.
     - Composants serveur : `resolvePageLocale` (pages publiques) ou `resolveDashboardLocale` (dashboard) + `translateForLocale` + `primeOverlay`.
  2. **Contenu géré par l'admin en base et affiché tel quel côté client** (occasions, styles musicaux, relations destinataire, offres de crédits, et toute future table catalogue du même type) → ajouter une colonne jsonb `translations` sur la table (migration Drizzle), ajouter la table comme entrée `CatalogSource` dans `lib/i18n/refresh-translations.ts` (champs à traduire + enregistrement), puis afficher avec `localizeField()` (ou `demo.displayName()` dans `DemoProvider`) — ne jamais remplacer la valeur française stockée, qui reste la clé canonique de sélection/comparaison/paiement envoyée en génération ; seul l'affichage change de langue.
  3. Si une nouvelle table catalogue de ce type est ajoutée, l'intégrer au bouton existant **« Actualiser les traductions »** (`/admin/languages`) plutôt que de créer un nouveau mécanisme ou un nouveau bouton ; ce bouton ne traduit que les champs nouveaux ou modifiés (empreintes `_src` par langue dans le jsonb `translations`).
- Langue d'une page : résolue par `resolvePageLocale()` (préfixe d'URL > cookie `musikpro_lang` > `Accept-Language` > `fr` ; `/admin` toujours en `fr`) et sert `<html lang>` ; `translate()` renvoie le français jusqu'à la fin de l'hydratation (pas de décalage serveur/client). Choix du résolveur : pages publiques, auth et métadonnées → `resolvePageLocale()` ; dashboard → `resolveDashboardLocale()` ; `resolveLocaleFromAcceptLanguage` n'est qu'une brique interne, jamais appelée directement par une page.
- Pages légales (`/terms`, `/privacy`) : chaque texte passe par `translateForLocale` ; sur une langue non française, `LegalPage` affiche un bandeau « traduction automatique » (la version française fait foi) avec un lien `?lang=fr` qui force le français (`pickLegalLocale`). Les modifier = modifier les textes français sources puis cliquer sur « Actualiser les traductions ».
- Textes hors composants (messages Zod, messages d'API, constantes de module) : les marquer avec `i18nKey("…")` (`lib/i18n/key.ts`, le scanner les met au manifeste) et les traduire à l'affichage (`translateIssue` pour les issues Zod, `translateApiMessage` pour les messages d'API) ; un message avec valeur passe par un modèle `{param}` littéral reconnu par une regex ancrée. Les composants client d'authentification appellent `useI18nOverlay()` pour se re-rendre quand le dictionnaire arrive. Aucun nouveau mécanisme.
- Exception stricte : ne jamais traduire le titre des chansons, ni plus généralement le contenu généré ou saisi librement par l'utilisateur, sauf mécanisme dédié explicitement validé.
- Les traductions proviennent uniquement du fournisseur IA déjà connecté (`lib/ai/provider.ts`) ; ne jamais écrire de traductions statiques à la main.

## Règle obligatoire — aucune icône Sparkle / « étincelles » dans tout le SaaS

- **Aucune icône ni aucun pictogramme d'étincelles (style « IA ») ne doit apparaître nulle part dans le SaaS — côté client comme dans l'admin, dans le code comme dans les données : `Sparkle`, `Sparkles`, `WandSparkles`, `WandSparkle`, le nom d'icône `"sparkles"` (ex. `<Icon i="sparkles" />`, `icon: "sparkles"`), les glyphes `✨ ✦ ✧ ✩ ✪ ✫ ✬ ✭ ✮ ✯ ✰ 🌟 💫`, ni l'étoile décorative `★ ☆`.**
- Choisir à la place un pictogramme sémantique de l'action (ex. assistant IA → `bot`, traductions → `languages`, texte animé → `type`, état vide → `inbox`/`layout-grid`), via `components/banani/Icon.tsx` ou `components/ui/premium-icon.tsx`. Ne jamais contourner la règle en écrivant le nom de l'icône dans une variable ou un tableau de configuration.
- Garde-fous déjà en place, à ne pas affaiblir : `npm run ui:icons-check` (`scripts/premium-icon-check.mjs`, dans `verify:production`) scanne `app/`, `components/`, `lib/` et `db/migrations/` (noms d'icônes compris) ; le formulaire des champs d'occasion refuse ces pictogrammes (`lib/occasion-fields/forbidden-glyphs.ts`) et nettoie les propositions de l'IA ; le prompt de suggestion de champs l'interdit.
- Données : un emoji d'étincelles ne doit jamais être écrit dans un seed ni une migration (la 0062 est l'unique exception historique, corrigée par `db/migrations/0064_remove_sparkle_glyphs.sql`). Toute nouvelle migration qui insère des emojis choisit un emoji qui illustre le sens.
- Toute page ou tout composant qui contient un de ces éléments est **incomplet** : le retirer avant de considérer le travail terminé, même si l'utilisateur ne l'a pas signalé.

## État production dans le dashboard propriétaire

- Toujours conserver/ajouter le menu **État production** dans le tableau de bord propriétaire ou administrateur du SaaS, même sans demande explicite.
- Conserver la route rétrocompatible `/admin/production-doctor` et le texte « Diagnostic local de préparation à la production. Le rapport CLI reste la source de vérité. ».
- Utiliser les voyants vert/orange/rouge pour prêt, à vérifier et bloquant.
- Le rapport CLI généré par `npm run doctor:production` reste la source de vérité; l'interface ne doit pas fabriquer un statut indépendant.
- L'absence de ce menu/page est une régression bloquante pour `npm run kit:integrity`.

## Règle obligatoire — notification toast sur toute action d'enregistrement/validation (dashboard propriétaire)

- **Tout bouton du dashboard propriétaire/admin qui enregistre, valide, active/désactive ou supprime quelque chose doit rendre compte du résultat via la notification toast globale en haut à droite — jamais de crash silencieux vers `app/admin/error.tsx`, jamais d'absence de retour.**
- Mécanisme commun unique, ne jamais en recréer un autre :
  1. Le formulaire utilise `<AdminActionForm action={maFonction}>` (`components/admin/AdminActionForm.tsx`) à la place d'un `<form action={fn}>` brut. Pour un bouton isolé sans champs (ex. bouton supprimer dans une grille triable où l'état de pending doit être exposé localement), reproduire le pattern déjà en place dans `components/admin/AdminMusicStyleSortableGrid.tsx` (un `useActionState` local + `useAdminActionToast`).
  2. La Server Action correspondante suit impérativement la signature `(previous: AdminActionState, formData: FormData) => Promise<AdminActionState>` (type `AdminActionState` exporté par `components/admin/useAdminActionToast.ts`), avec tout le corps dans un `try/catch` : succès → `{ ok: true, message: "..." }` (message court et spécifique à l'action, en français) ; échec → `{ ok: false, message: actionErrorMessage(error, "...") }` (`lib/admin/action-state.ts`, gère proprement les erreurs Zod).
  3. Cas particulier redirection (ex. création avec retour sur une autre page) : utiliser `redirect(withAdminNotice(path, message, tone?))` (`lib/admin/notice-redirect.ts`) plutôt qu'un `redirect()` nu, sinon aucun toast de succès ne s'affiche.
  4. Pour un même `<article>`/ligne avec plusieurs boutons (ex. Modifier + Supprimer), scinder en plusieurs `<AdminActionForm id="...">` distincts et relier les boutons avec l'attribut HTML standard `form={id}` plutôt que d'imbriquer des formulaires ou d'inventer un mécanisme ad hoc (voir `app/admin/payment-providers/chariow/page.tsx`).
- Toute nouvelle page, panneau ou bouton d'action ajouté au dashboard propriétaire doit suivre ce même mécanisme et le même style de toast dès sa création — ce n'est pas un chantier ponctuel mais une règle permanente, au même titre que l'i18n ou la validation Zod.

## Règle obligatoire — onglets horizontaux (dashboard propriétaire)

- **Toute page/panneau du dashboard propriétaire/admin qui regroupe plusieurs boîtes/sections dans un même écran doit les présenter via le composant partagé `AdminTabs`/`AdminTabPanel` (`components/admin/AdminTabs.tsx`) — jamais un nouvel accordéon, une nouvelle mécanique d'onglets ou un système de classes CSS ad hoc.**
- Mécanisme commun unique, ne jamais en recréer un autre :
  1. Envelopper les boîtes avec `<AdminTabs ariaLabel="..." tabs={[{ id, label }, ...]}>` et donner à chaque boîte un `<AdminTabPanel id="...">` correspondant (voir `app/admin/languages/page.tsx` et `components/admin/AdminMusicfulProviderForm.tsx` pour des exemples déjà en place).
  2. Le style (carte avec fond/bordure/ombre autour de la barre d'onglets, changement de contenu **sans aucune animation/transition** au clic) est déjà porté par les classes globales `.admin-tabs`, `.admin-tabs-list`, `.admin-tabs-trigger`, `.admin-tabs-panel` dans `app/admin/admin.css` — ne pas dupliquer ce CSS ailleurs ni en surcharger le comportement par page ; toute évolution du style des onglets se fait une seule fois dans ces classes partagées pour bénéficier à toutes les pages qui utilisent `AdminTabs`.
  3. Les panneaux restent montés (masqués via l'attribut `hidden`, pas démontés) : un `<AdminActionForm>` qui englobe `AdminTabs` continue donc de soumettre les champs de tous les onglets, pas seulement celui visible.
- Toute nouvelle page ou nouveau panneau du dashboard propriétaire qui a besoin d'onglets horizontaux doit réutiliser ce même composant dès sa création — ce n'est pas un chantier ponctuel mais une règle permanente, au même titre que l'i18n ou la notification toast.

## Sources de vérité

- Lire `README.md`, `SECURITY.md`, `DESIGN.md` avant une refactorisation importante.
- Réutiliser les workflows de `.claude/skills/` au lieu de créer une deuxième logique divergente.
- Les commandes Claude Code dans `.claude/commands/` pointent vers les mêmes scripts npm que le reste du kit.

## Règles de travail

- Inspecter les fichiers avant de les modifier; ne pas supposer leur contenu.
- Préserver les fonctionnalités existantes et préférer les changements additifs/réversibles.
- Ne jamais révéler ou déplacer des secrets dans le code client, les logs, les captures ou Git.
- Toute entrée non fiable doit être validée côté serveur avec Zod.
- Avant production: `npm run kit:verify`, `npm run security-saas`, staging Vercel approuvé, puis `npm run deploy:production:check`.
- Pour le CRUD Clients, respecter l’ordre Banani → plan → Prisma Client → `/api/clients/*`.
- La partie Android/iOS reste optionnelle et suit `.claude/skills/mobile-app-pwa-capacitor/SKILL.md` : **Next.js serveur + PWA + Capacitor**. Le mode WebView simple est déprécié et `output: export` est interdit.

## Computer Use / Browser

- Pour Claude Code, exécuter `npm run computer-use:claude:check`. Après un vrai test navigateur/computer réussi, enregistrer la preuve avec `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.
- Ne jamais afficher le voyant vert sur simple présence d’un fichier de configuration: un test réel doit avoir été marqué `verified`.
- Computer Use complète les tests de code; il ne remplace pas lint, typecheck, tests, build, sécurité, Zod ou staging.

## Commandes essentielles

- `/setup-saas` : parcours guidé 21 phases.
- `/security-saas` : audit de sécurité.
- `/import-banani` : import et analyse des écrans Banani.
- `/computer-use-claude` : vérification Computer Use / Browser pour Claude Code.

# Règle prioritaire — langue de réponse

- **Toujours répondre à l’utilisateur en français.**
- Les explications, diagnostics, résumés, demandes de confirmation et recommandations doivent être rédigés en français, quel que soit l’agent utilisé (Claude Code).
- Les commandes, noms de fichiers, identifiants de code, noms d’API et messages techniques peuvent rester dans leur forme originale quand cela évite de casser ou d’altérer le code.
- Ne changer de langue que si l’utilisateur demande explicitement une autre langue pour une réponse précise.

# Règle obligatoire — refactorisation propre et non régressive

- **Toute modification, correction, mise à jour, migration, intégration ou nouvelle fonctionnalité doit être traitée comme une refactorisation propre, professionnelle et non régressive.**
- Inspecter d’abord l’architecture, les dépendances et les fonctionnalités déjà présentes avant de modifier le code.
- Préserver les comportements existants, routes, contrats API, modèles de données, variables d’environnement, règles de sécurité, skills et workflows, sauf demande explicite nécessitant leur évolution.
- Préférer des changements additifs, isolés, réversibles et rétrocompatibles plutôt qu’une réécriture destructive.
- Ne jamais supprimer ou casser une fonctionnalité existante pour en ajouter une nouvelle ; si une évolution incompatible est réellement nécessaire, prévoir une migration claire et documentée.
- Après chaque refactorisation, exécuter les contrôles pertinents du kit (`npm run kit:integrity`, `npm run kit:audit`, `/security-saas`, gates Zod et tests de la fonctionnalité concernée) et corriger toute régression avant de considérer le travail terminé.

# Règle prioritaire — Mobile App Pipeline PWA + Capacitor

- `.claude/skills/mobile-app-pwa-capacitor/SKILL.md` est la source de vérité permanente pour toute création, migration, mise à jour ou réparation mobile.
- L’architecture officielle et unique est **Next.js serveur + PWA + Capacitor → Android + iOS**. L’ancienne stratégie WebView mobile est supprimée et ne doit pas être réintroduite.
- Ne jamais ajouter `output: 'export'` ni déplacer le backend, Neon/Prisma/Drizzle, auth, paiements, webhooks, IA ou secrets dans l’app.
- La Phase 21 native est optionnelle. `mobileAppEnabled=false` reste valide; la PWA Web peut rester disponible sans projets Android/iOS.
- `mobile:check` valide le responsive Web, `mobile:pwa:check` valide la couche PWA et `mobile:app:*` gère le wrapper natif.
- Isoler `web-desktop`, `web-mobile/PWA`, `android` et `ios`; ne jamais afficher les composants natifs sur desktop.
- Aucune stratégie mobile legacy ne doit être reconnue, proposée ou réintroduite; seule `pwa-capacitor` est valide.
- Aucun build Android/iOS ni voyant store ne peut être déclaré PASS sans exécution réelle dans l’environnement correspondant.

# Règle prioritaire — intégrité, CSP et installation
- Conserver une **CSP à nonce pour `script-src`, sans `unsafe-inline`** ; `style-src` garde volontairement `'unsafe-inline'` dans MusikPro (usage généralisé de `style={{}}` React, voir `lib/security/headers.ts`). Toute évolution de script/style tiers doit passer `npm run security:csp-check`.
- Ne jamais présenter lint/typecheck/tests/build/npm audit comme réussis si les dépendances ne sont pas réellement installées. Utiliser `PENDING` lorsque l’environnement ne permet pas leur exécution.
- Avant `npm install`, `npm run first-run:install` doit vérifier l’accès au registre npm et fournir un diagnostic clair en cas de problème réseau.
- Les exemples de providers dans `.claude/skills/providers/**/examples/**` sont de la documentation/intégration et ne doivent pas polluer le typecheck du runtime principal.

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

Quand l’utilisateur écrit exactement `/setup-saas` dans Claude Code :

1. Lire `.claude/skills/setup-saas/SKILL.md`.
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

Pour connecter Banani dans Claude Code (scope local uniquement) :

1. Exécute `npm run banani:prepare` : il affiche la commande `claude mcp add --transport http banani --scope local ...` sans écrire de secret.
2. Demande à l’utilisateur d’exécuter lui-même cette commande dans son terminal avec son token Banani.
3. Ne demande jamais le token Banani dans le chat et ne l’écris jamais automatiquement dans un fichier.
4. Exécute `npm run banani:check` après configuration. Le contrôle valide `~/.claude.json` pour le projet courant sans jamais afficher la valeur du token.
5. Banani ne doit jamais être configuré dans `.mcp.json` ni dans un fichier suivi par Git. Si un token a été exposé, demander une rotation/révocation du token avant de continuer.

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

1. Lire `.claude/skills/import-banani/SKILL.md`.
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

## Computer Use / Browser Tools — vérification continue obligatoire dans Claude Code

- La capacité navigateur est fournie par Claude Code (Chrome/Computer Use) ou un serveur MCP navigateur explicitement autorisé; ne jamais inventer un package npm `computer-use`.
- La Phase 2 doit vérifier cette capacité par une vraie action navigateur avant de poursuivre. Utiliser `npm run computer-use:claude:check`, puis marquer une preuve réelle avec `npm run computer-use:claude:mark`.
- Pendant toutes les phases suivantes, utiliser Computer Use lorsqu’une surface web/visuelle doit être vérifiée : pages Banani, responsive, loading/empty/error, auth/OAuth, uploads, checkout sandbox, health/readiness, Vercel Preview, domaine final, SEO et Search Console.
- Une observation navigateur ne remplace jamais `test`, `typecheck`, `build`, `security:audit`, signature webhook ou `conformity:check`.
- L’utilisateur garde le contrôle des identifiants, MFA, achats, DNS critiques et passage sandbox → live.
- Si Computer Use est indisponible, marquer la vérification `NON VÉRIFIÉE` ou `skipped` avec justification et fournir un test manuel équivalent.

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

Quand l'utilisateur saisit `/provider`, utilise `.claude/skills/provider/SKILL.md` comme workflow officiel.

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
- Ne jamais utiliser `Sparkle`, `Sparkles`, `Sparklet`, `Sparklets`, `Spartlet`, `Spartlette`, `WandSparkles`, `WandSparkle`, leurs variantes `*Icon`, `✨`, `✦`, `✧`, `★`, `☆` ou des variantes décoratives équivalentes pour donner un aspect « IA » à l’interface.
- Ne pas remplacer ces icônes par des glyphes Unicode génériques (`⌂`, `◫`, `◉`, `◇`, etc.).
- Choisir une icône selon la fonction réelle. Pour le starter, préférer `components/ui/premium-icon.tsx`; toute bibliothèque externe doit conserver un style cohérent et accessible.
- Ce contrôle concerne toutes les pages existantes **et les futures pages** : une occurrence interdite sous `app/` ou `components/` bloque `verify:code`, `verify:production` et la CI.
- Après modification visuelle importante, compléter le contrôle statique par une vérification navigateur responsive lorsqu’un Browser Tool est disponible.

- Le tableau **État de préparation** et **État production** doit conserver une carte avec voyant dédiée à cette règle afin qu’elle reste visible en permanence.
Gate de livraison : une page contenant une icône Sparkle/Sparklet/Spartlet ou un substitut décoratif interdit est INCOMPLÈTE.

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
- Les commandes `.claude/commands/` doivent réutiliser les scripts npm et les skills `.claude/skills/`; ne pas créer une deuxième logique métier.
- Exécuter `npm run claude-code:check` après installation/mise à jour de Claude Code.
- Pour Computer Use/Browser Claude Code, exécuter `npm run computer-use:claude:check`; le voyant ne devient vert qu’après un vrai test enregistré via `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.

## État production propriétaire — obligatoire et permanent

- Chaque SaaS construit ou refactorisé avec Africa SaaS Kit doit conserver un accès **État production** dans le tableau de bord du propriétaire/administrateur du SaaS, même si l'utilisateur ne le demande pas explicitement.
- La route de référence du starter reste `/admin/production-doctor` afin de préserver la rétrocompatibilité; le libellé visible est **État production**.
- L'écran doit afficher exactement l'intention suivante : **« Diagnostic local de préparation à la production. Le rapport CLI reste la source de vérité. »**
- Chaque contrôle doit être représenté par un voyant visuel : vert = installé/prêt, orange = à compléter/à vérifier, rouge = absent/bloquant.
- Le menu lui-même doit disposer d'un voyant vert lorsqu'il est correctement installé. L'absence du menu ou de la page est une régression et doit faire échouer `npm run kit:integrity`.
- Le tableau de bord n'invente jamais son propre état : il lit le dernier rapport produit par `npm run doctor:production` ou `npm run doctor:production:online`; le CLI demeure la source de vérité.
- Après toute modification du dashboard propriétaire, vérifier que le menu **État production** est toujours présent, puis exécuter `npm run kit:integrity` et `npm run doctor:production`.

## Source de vérité unique — CLAUDE.md

- `CLAUDE.md` est la seule source de vérité des règles de l’agent. Aucun `AGENTS.md`, `.codex/`, `.agents/` ni dossier racine `skills/` ne doit être réintroduit : `claude-code:check` le refuse.
- Les skills officiels vivent dans `.claude/skills/` ; les skills providers dans `.claude/skills/providers/`.

## Mobile Store Safety
Pour PWA + Capacitor, ne jamais déclarer une application prête Play Store/App Store tant que `npm run mobile:store-check` ne passe pas. `server.url`/`allowNavigation` sont réservés au développement distant et ne constituent pas une configuration native de production. MusikPro utilise volontairement ce mode distant (wrapper vers `musikpro.net`) : `mobile:store-check` y échoue tant qu’un shell bundlé n’existe pas, ce qui est le comportement attendu et n’est pas une régression.

## AI Development Quality Gate — PLAN → SPEC → TEST → CODE

- Pour toute nouvelle fonctionnalité importante (API, base/migration, auth, permissions, paiement, upload, sécurité, multi-tenant, fournisseur, mobile ou changement transversal), **ne pas commencer directement par le code**.
- Suivre le workflow permanent **PLAN → SPEC → TEST → CODE → VERIFY**.
- Avant l'implémentation, lire `config/features.json` pour réutiliser l'existant et éviter les doublons, puis créer/compléter un plan avec `npm run feature:plan -- nom-feature`.
- Le plan doit couvrir au minimum : objectif, périmètre/hors périmètre, données/migrations, API/contrats, auth/rôles/tenant, entrées non fiables, sécurité/rate limiting, tests prévus, critères d'acceptation et rollback.
- Les petits correctifs locaux peuvent rester légers, mais ne dispensent jamais des gates/tests existants.
- Exécuter `npm run feature:plan-check` avant de considérer un chantier majeur prêt à coder ou à livrer.

## Documentation Freshness Gate — documentation officielle/version réelle

- Ne jamais coder une intégration importante à partir d'une documentation supposée ou mémorisée lorsqu'une version précise est installée.
- `config/documentation-sources.json` relie les dépendances structurantes à leur documentation officielle, à la version revue et à la date de revue.
- Après toute montée de version de Next.js, Better Auth, Drizzle, Zod, Capacitor ou autre brique structurante enregistrée, revoir la documentation correspondante puis mettre à jour le registre.
- Exécuter `npm run docs:freshness-check`; une version différente de celle revue ou une documentation devenue trop ancienne bloque le gate.
- Ne jamais remplacer une API actuelle par une ancienne syntaxe simplement parce qu'un agent la connaît de mémoire.

## Project Handoff — continuité de contexte entre sessions/agents

- `CLAUDE.md` conserve les règles permanentes ; `generated/project-handoff.md` conserve l'état courant du travail sans secret.
- Au début d'une reprise de projet, lire `generated/project-handoff.md` s'il existe avant de proposer une architecture ou une nouvelle dépendance.
- Après une modification importante, avant de changer d'agent/session ou avant un handoff, exécuter `npm run context:handoff`.
- Le handoff doit rappeler version, feature en cours, plan, dernier état des tests, fichiers modifiés et prochaines actions sans lire ni afficher les valeurs de `.env.local`.
- Ne jamais introduire un second ORM, un second système d'auth, une seconde couche de paiement ou une convention contradictoire parce qu'une nouvelle session a oublié les choix précédents.

## Agent Safety Gate — commandes/modifications dangereuses

- Une capacité terminal, Git, base de données ou dashboard **n'est jamais une autorisation implicite** pour effectuer une opération destructive.
- Avant toute opération difficilement réversible : inspecter, expliquer l'impact, faire un dry-run/sauvegarde lorsque possible, demander l'accord explicite de l'utilisateur, puis vérifier le résultat.
- Sans accord explicite, ne jamais exécuter `git reset --hard`, `git clean -f*`, `git push --force`, `rm -rf /`, `DROP DATABASE`, `DROP TABLE`, `TRUNCATE TABLE`, reset destructif de migrations/base, suppression de projet Vercel/Neon, modification DNS critique, rotation/suppression de secrets, passage sandbox → live ou déploiement production déclenché par l'agent.
- Ne jamais supprimer une migration existante, une table ou des fichiers en masse pour « résoudre » un bug.
- Ne jamais désactiver Zod, RBAC, RLS, CSP, rate limiting, vérification de signature, tests ou autres protections pour obtenir un build vert.
- Ne jamais éditer `.env.local` de façon ad hoc. Seuls les scripts de setup dédiés peuvent écrire des clés attendues après action explicite de l'utilisateur, sans afficher les secrets.
- Exécuter `npm run agent:safety-check` avant toute livraison importante.

## Untrusted Input / HTML Safety Gate

- Toute entrée utilisateur ou externe est non fiable : nom, email, recherche, URL, ID, texte libre, JSON API, paramètres URL, fichiers uploadés et payloads fournisseurs.
- Zod côté serveur reste obligatoire pour les entrées structurées first-party ; la validation client ne remplace jamais la validation serveur.
- Ne jamais construire une requête SQL par concaténation de données utilisateur et ne jamais utiliser `$queryRawUnsafe`, `$executeRawUnsafe` ou équivalent dans le runtime du starter.
- Le HTML utilisateur est interdit par défaut. `dangerouslySetInnerHTML` n'est permis que pour une exception sûre, documentée et contrôlée ; le starter n'autorise actuellement que le JSON-LD sérialisé/échappé.
- Les uploads doivent conserver limites de taille/type, auth et rate limiting.
- Exécuter `npm run security:input-check` après toute nouvelle route, formulaire, upload ou traitement de contenu utilisateur.

## Critical Flow Tests — sécurité fonctionnelle avant production

- Le fait qu'une page « fonctionne » visuellement n'est jamais une preuve suffisante.
- Les parcours critiques doivent rester couverts : validation API, auth/session, reset/vérification email, routes privées/admin, RBAC, isolation multi-tenant, rate limiting, mutations cross-site, paiements et uploads.
- `config/critical-flows.json` est le registre de couverture ; exécuter `npm run critical-flows:check` après toute évolution sensible.
- Quand `node_modules` est disponible, exécuter aussi `npm run critical-flows:test`; les scénarios nécessitant navigateur, base Neon réelle ou fournisseur sandbox restent NON VÉRIFIÉS tant qu'ils n'ont pas été réellement testés.
- Ne jamais transformer un test non exécuté en PASS.

## Accessibility & UX Quality Gate

- Une interface fonctionnelle mais inaccessible ou générique n'est pas considérée terminée.
- Conserver les règles Mobile First, SEO, Design System et Premium Icon Gate, puis compléter avec `npm run accessibility:check`.
- Interdire les images sans texte alternatif, les `tabIndex` positifs, les éléments non interactifs cliquables sans rôle/clavier, la suppression du focus sans `focus-visible`, et le HTML direct non contrôlé.
- Vérifier au navigateur, lorsque disponible : navigation clavier, focus visible, contraste, cibles tactiles, reflow/zoom, modales, `prefers-reduced-motion` et viewports 320/360/390/430/768/1024/1440.
- Si le navigateur n'a pas été utilisé, marquer les contrôles visuels **NON VÉRIFIÉS** plutôt que PASS.

## Intégrations optionnelles — jamais de faux rouge

- Un service explicitement optionnel et non sélectionné (ex. Upstash, Banani MCP, Playwright, Cloudflare, paiements, mobile natif) doit être signalé `SKIPPED`/orange et **jamais FAIL/rouge**. Une configuration partielle ou un service explicitement activé mais incomplet reste FAIL.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
