# Textes français du parcours client dans `t()` — Sous-projet 2

Date : 2026-10-02 · Statut : conception validée en conversation, spec à relire

## Contexte et objectif

Le moteur incrémental (sous-projet 1) traduit en un clic tout texte déjà écrit `t("…")` ou `translateTemplate("…")`. Un texte français écrit en dur, sans `t()`, est invisible pour lui. Ce sous-projet enveloppe dans `t()` les textes français encore en dur dans le parcours client **déjà servi dans la bonne langue** (dashboard, landing, pages de partage), et met en place une garde pour qu'aucun texte en dur ne revienne.

Mesure (exploration du 2026-10-02, ±15 %) : le périmètre est déjà couvert à près de 90 % (~587 appels dans `components/banani`). Il reste ~200 textes distincts :

| Catégorie | Textes |
|---|---|
| Libellés et attributs simples | ~75 |
| Messages `notify(` (57 appels, 29 distincts) | ~29 |
| Cas difficiles (pluriels, textes à valeurs, listes de données) | ~70 |
| Pages rendues côté serveur | ~15–20 |

## Décisions prises avec le responsable

- **i18n:check ne bloque plus les textes sans traduction** (option A) : il n'échoue que si le manifeste est périmé. Les traductions manquantes sont remplies depuis l'admin (bouton « Actualiser les traductions »), sans redéploiement.
- **Pages d'authentification, double authentification, mot de passe oublié/réinitialisé : sous-projet 3**, avec la résolution de la langue (cookie `musikpro_lang`, `<html lang>`). Les envelopper ici n'aurait aucun effet visible.
- **Garde** : scanner élargi + règle ESLint en erreur (option A).

## Hors périmètre

- Sous-projet 3 : pages d'authentification, langue des pages hors préfixe d'URL, messages d'erreur d'API (dont `error.message` renvoyé au client par `notify`), e-mails, métadonnées statiques (`app/page.tsx`, `app/layout.tsx`), messages Zod affichés dans les formulaires (`lib/validation/musikpro-demo.ts`).
- Sous-projet 4 : pages légales.
- Admin (reste en français), contenus de catalogue (déjà couverts par la colonne `translations`), prompts IA, `lib/setup/kit-dashboard.ts`, données de `lib/demo/musikpro-data.ts`.
- Aucun changement des valeurs canoniques envoyées au serveur ou comparées : `Clair/Sombre/Auto`, clés de navigation (`items[].key`), occasions et styles stockés en français. Seul leur **affichage** est traduit.

## Conception

### 1. Enveloppement des textes

- **Libellés et attributs simples** : `t("…")` dans le JSX et dans les attributs `placeholder`, `aria-label`, `title`, `alt`, `label`.
- **Messages `notify(`** : chaque texte distinct est enveloppé une seule fois ; les copies répétées dans `UserDashboardMobile`, `UserDashboardDesktop`, `MySongsGeneratedScreen`, `SongPlayerScreen` utilisent le même littéral.
- **Textes avec valeurs** : la vingtaine de modèles `\`… ${x} …\`` passent en `translateTemplate("… {x} …", { x })`. La valeur (titre de chanson, nom, nombre) n'est jamais traduite et ne figure jamais dans la clé.
- **Pluriels** : chaque condition `"s"` devient deux appels `translateTemplate` à texte littéral, singulier et pluriel, par exemple `n > 1 ? translateTemplate("{count} crédits", { count: n }) : translateTemplate("{count} crédit", { count: n })`. Pas de nouvel utilitaire (le scanner ne lit que les littéraux). Les seuils actuels (`n > 1` ou `n !== 1`) sont conservés site par site.
- **Listes de données** (FAQ `HelpFAQScreen`, `NotificationCenterScreen`, messages de `StepGeneratingSong`, historique de `CreditsPurchaseScreen`, tendances de `UserDashboardMobile/Desktop`) : les textes passent par `t()` **au rendu**, jamais dans un tableau évalué au chargement du module.
- **Libellés de menus évalués au chargement du module** (`SongCreationGenreSelection`, `DesktopSidebar`, `MobileBottomNav`, `MobileMenuDrawer`, `UserMenuMobile`, 27 libellés) : transformés en fonctions appelées dans le composant (ou construits dans le corps du composant), car `t()` évalué à l'import ne peut pas connaître la langue. Les clés (`key`) restent inchangées.
- **Plus de clés interpolées** : aucune clé `t(\`…${}…\`)` ; le scanner continue de les signaler.

### 2. Le test de démonstration dans `notify`

`notify` (`components/banani/DemoProvider.tsx`) remplace aujourd'hui un message contenant « démonstration » par un texte non-démo, via une expression régulière sur un mot français. Une fois les messages traduits, ce test ne fonctionne plus. Il est remplacé par un marqueur explicite : `notifyDemo(demoMessage, liveMessage)` côté `DemoProvider`, qui choisit le texte selon `isDemo` et traduit l'un ou l'autre ; les ~14 appels identiques « Action de démonstration : aucune opération réelle effectuée. » l'utilisent. Le comportement visible en français ne change pas. Le détail (autres messages concernés par l'expression régulière) est fixé dans le plan après lecture du code.

### 3. Pages rendues côté serveur

`app/not-found.tsx`, `app/loading.tsx`, `app/dashboard/billing/page.tsx`, `app/dashboard/layout.tsx` (« Visite guidée MusikPro », « Compte MusikPro »), `app/dashboard/*/loading.tsx` et `components/dashboard-nav.tsx` ne peuvent pas utiliser le `t()` basé sur `document`. Elles suivent le modèle déjà en place dans `app/s/[slug]/page.tsx` : `resolveLocaleFromAcceptLanguage` + `translateForLocale`/`translateTemplateForLocale` + `await primeOverlay(locale)`. Le passage de la langue du navigateur au cookie `musikpro_lang` est le sous-projet 3. La métadonnée de `not-found` est localisée via `generateMetadata`. `components/ui/skeleton.tsx` et `inline-notice.tsx` (utilisés côté serveur et client) reçoivent leur libellé par paramètre ou utilisent le mécanisme adapté, à fixer dans le plan.

### 4. Garde contre les textes en dur

- **Scanner** (`scripts/i18n-sync.mts`) : `SCAN_DIRS` gagne `app/not-found.tsx`, `app/loading.tsx`, `components/dashboard-nav.tsx`, `components/ui`, `components/checkout-button.tsx`, `components/mobile`, `components/pwa`. Le manifeste inclut les nouvelles clés.
- **`i18n:check`** : échoue si le manifeste est périmé. Les textes sans traduction ne bloquent plus ; la commande affiche leur nombre. Le message d'aide renvoie vers « Actualiser les traductions ».
- **ESLint** (`eslint.config.mjs`) : un bloc `files:` limité aux dossiers du périmètre applique `no-restricted-syntax` en **erreur** avec trois sélecteurs : texte JSX accentué hors `t()`, littéral accentué dans les attributs `placeholder|aria-label|title|alt|label`, littéral passé à `notify(`. Limite connue : les mots français sans accent échappent à la règle. Les cas légitimes se désactivent ligne par ligne avec une raison. Le dépôt doit passer le lint sans nouvelle erreur.

### 5. Voyant dans l'admin

Une fonction serveur calcule le nombre de textes du manifeste absents des JSON et de `ui_translations` (même logique que `missingUiTexts`, par langue). La carte « Traductions du catalogue » (`/admin/languages`) affiche « N textes non traduits » (en orange) ou « Tout est à jour » (en vert). Le texte de la carte est ajusté.

### 6. Livraison

Aucune migration. Après déploiement, un clic sur « Actualiser les traductions » traduit les ~200 nouveaux textes ; en attendant, ils s'affichent en français.

## Gestion des erreurs et risques

- Un texte non traduit retombe sur le français : aucune régression visible.
- Les fonctions de menus déplacées dans les composants ne changent pas les `key` : la navigation et la sélection ne sont pas touchées.
- Les chaînes comparées ou stockées en français (valeurs canoniques) ne sont jamais enveloppées : une relecture le vérifie explicitement.
- L'ESLint peut produire de faux positifs : prévoir des exemptions ligne par ligne, jamais une désactivation globale.

## Tests

- Unitaires (Vitest) : comptage des textes non traduits ; nouveau comportement de `i18n-sync --check` (manifeste périmé échoue, texte sans traduction ne bloque pas) si extrait en fonction pure ; règle ESLint sur exemples bons/mauvais (classe `ESLint` avec configuration en ligne).
- Contrôles du kit : `i18n:check`, `lint`, `typecheck`, `test`, `ui:hydration-check`, `kit:integrity`.
- Vérification navigateur : en anglais, menus (barre latérale, menu mobile), messages `notify`, FAQ, centre de notifications et pluriels s'affichent traduits après un clic sur le bouton ; en français rien ne change.
