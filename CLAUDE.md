# Africa SaaS Kit — instructions Claude Code

Claude Code est un agent officiellement supporté par ce kit, au même titre que Codex/Antigravity.

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
  1. **Texte fixe de l'interface** (libellés, boutons, titres, messages codés en dur dans les composants) → l'envelopper avec `translate`/`t` (ou `translateTemplate` pour du texte avec valeurs dynamiques du type `{param}` — ne jamais interpoler la valeur dans le template literal avant l'appel, sinon la clé du dictionnaire ne correspond plus) depuis `lib/i18n/translate.ts`. Après ajout, lancer `npm run i18n:sync` pour que l'IA connectée remplisse `lib/i18n/locales/{en,es,pt}.json` ; `npm run i18n:check` (déjà dans `ci:check`) vérifie qu'aucune clé n'est oubliée.
  2. **Contenu géré par l'admin en base et affiché tel quel côté client** (occasions, styles musicaux, relations destinataire, offres de crédits, et toute future table catalogue du même type) → ajouter une colonne jsonb `translations` sur la table (migration Drizzle), inclure la table dans `refreshCatalogTranslations()` (`app/admin/languages/actions.ts`, via `translateCatalogTable()` de `lib/i18n/catalog-translate.ts`), puis afficher avec `localizeField()` (ou `demo.displayName()` dans `DemoProvider`) — ne jamais remplacer la valeur française stockée, qui reste la clé canonique de sélection/comparaison/paiement envoyée en génération ; seul l'affichage change de langue.
  3. Si une nouvelle table catalogue de ce type est ajoutée, l'intégrer au bouton existant **« Actualiser les traductions »** (`/admin/languages`) plutôt que de créer un nouveau mécanisme ou un nouveau bouton.
- Exception stricte : ne jamais traduire le titre des chansons, ni plus généralement le contenu généré ou saisi librement par l'utilisateur, sauf mécanisme dédié explicitement validé.
- Les traductions proviennent uniquement du fournisseur IA déjà connecté (`lib/ai/provider.ts`) ; ne jamais écrire de traductions statiques à la main.

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

## Sources de vérité

- Lire `AGENTS.md`, `README.md`, `SECURITY.md`, `DESIGN.md` avant une refactorisation importante.
- Réutiliser les workflows de `.agents/skills/` au lieu de créer une deuxième logique divergente.
- Les commandes Claude Code dans `.claude/commands/` pointent vers les mêmes scripts npm que le reste du kit.

## Règles de travail

- Inspecter les fichiers avant de les modifier; ne pas supposer leur contenu.
- Préserver les fonctionnalités existantes et préférer les changements additifs/réversibles.
- Ne jamais révéler ou déplacer des secrets dans le code client, les logs, les captures ou Git.
- Toute entrée non fiable doit être validée côté serveur avec Zod.
- Avant production: `npm run kit:verify`, `npm run security-saas`, staging Vercel approuvé, puis `npm run deploy:production:check`.
- Pour le CRUD Clients, respecter l’ordre Banani → plan → Prisma Client → `/api/clients/*`.
- La partie Android/iOS reste optionnelle et utilise Capacitor WebView vers le SaaS HTTPS en ligne.

## Computer Use / Browser

- Vérifier séparément OpenAI et Claude Code sur la page État de préparation.
- Pour Claude Code, exécuter `npm run computer-use:claude:check`. Après un vrai test navigateur/computer réussi, enregistrer la preuve avec `npm run computer-use:claude:mark -- --status=verified --evidence="..."`.
- Ne jamais afficher le voyant vert sur simple présence d’un fichier de configuration: un test réel doit avoir été marqué `verified`.
- Computer Use complète les tests de code; il ne remplace pas lint, typecheck, tests, build, sécurité, Zod ou staging.

## Commandes essentielles

- `/setup-saas` : parcours guidé 21 phases.
- `/security-saas` : audit de sécurité.
- `/import-banani` : import et analyse des écrans Banani.
- `/computer-use` : vérification Computer Use OpenAI/Antigravity.
- `/computer-use-claude` : vérification Computer Use / Browser pour Claude Code.
