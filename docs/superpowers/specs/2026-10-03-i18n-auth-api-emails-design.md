# Authentification, erreurs d'API, e-mails et titres de pages traduisibles — Sous-projet 3

Date : 2026-10-03 · Statut : conception validée en conversation, spec à relire

## Contexte et objectif

Les sous-projets 1 et 2 ont livré le moteur de traduction incrémental (bouton « Actualiser les traductions », table `ui_translations`, manifeste, garde ESLint) et enveloppé les textes du dashboard, de la landing et des pages de partage. Ce sous-projet étend la traduction aux écrans qui n'ont pas de préfixe d'URL par langue et à ce que le client reçoit hors des composants : écrans d'authentification, erreurs d'API, e-mails de compte, titres de pages, messages de validation.

Mesure (exploration du 2026-10-03, ±15 %) : environ 185 textes français distincts.

| Catégorie | Textes |
|---|---|
| A. Écrans d'authentification (6 composants clients + erreurs OAuth) | ~115 |
| B. Erreurs d'API affichées au client | ~40 français + ~17 anglais (paiement, coupon, clients) |
| C. E-mails visant le client (vérification, réinitialisation) | ~8 |
| D. Titres de pages et image de partage | ~10 |
| E. Messages Zod visibles dans les formulaires | ~12 |

Faits structurants : `<html lang>` vaut toujours `fr` (`app/layout.tsx`) ; `translate()` côté client lit `document.documentElement.lang` ; la bibliothèque d'authentification renvoie ses erreurs en anglais (avec un code d'erreur stable) ; aucune langue n'est enregistrée par utilisateur ; aucun e-mail de reçu n'existe ; aucune de ces zones n'est dans le périmètre du scanner ni de la règle ESLint.

## Décisions prises avec le responsable

- **Résolveur de langue unique** appliqué par le layout racine à toutes les pages (option A).
- **E-mails dans la langue de la requête du client**, sans nouvelle colonne en base (option A).
- **Erreurs d'API traduites à l'affichage, côté client**, via un point d'entrée commun (option A).

## Hors périmètre

- Corps des pages légales (`privacy`, `terms`) : sous-projet 4 (seules leurs métadonnées sont traitées ici).
- E-mail du propriétaire (code à deux facteurs) et e-mail du support interne : restent en français.
- Colonne `user.locale` : à ajouter le jour où un e-mail partira sans requête du client (reçus, relances).
- Routes `app/api/clients/**` (API de gestion du kit) : inchangées.
- `app/setup` (outil de développement), admin (reste en français), prompts IA, `lib/ai/errors.ts` (messages destinés au propriétaire).
- Détection de langue par IP dans le layout racine (voir §1).

## Conception

### 1. Résolveur de langue unique et `<html lang>`

- `resolvePageLocale()` (serveur, nouveau module sous `lib/i18n/`) : préfixe d'URL (`LOCALE_HEADER` posé par `proxy.ts`) si c'est une langue supportée, sinon cookie `musikpro_lang`, sinon `Accept-Language`, sinon `fr`. Résultat : `fr | en | es | pt`. Code présent mais non supporté : `fr`. Partie pure testée séparément.
- La détection par IP et la requête du catalogue de langues ne sont **pas** appelées dans le layout racine (appel réseau et requêtes en base à chaque page) ; elles restent sur la landing, qui redirige déjà vers le bon préfixe.
- `app/layout.tsx` : `<html lang={locale}>`. Pour un chemin `/admin…` (`REQUEST_PATH_HEADER`), la langue est forcée à `fr`.
- Les résolveurs existants (`resolveDashboardLocale`, `resolveLocaleFromAcceptLanguage` dans les pages publiques) restent ; ils sont alignés sur `resolvePageLocale()` quand c'est sans risque, sinon laissés tels quels.
- **Hydratation sans mismatch** : côté serveur, `t()` rend du français (pas de `document`). Si le client lisait immédiatement `<html lang="en">`, il rendrait de l'anglais et ne correspondrait plus au HTML serveur (erreur React #418). `translate()` renvoie donc le français tant qu'un indicateur « hydratation terminée » n'est pas posé. Un petit composant client monté dans le layout racine (`I18nBootstrap`) pose cet indicateur après l'hydratation, charge le dictionnaire de la base (`useI18nOverlay`, jusqu'ici monté seulement dans `DemoProvider`) et déclenche le rendu traduit. Le comportement du dashboard (qui pose déjà `lang` après deux animations) reste valide et est vérifié par `ui:hydration-check` et un test navigateur.
- Limite connue : une page d'authentification s'affiche en français une fraction de seconde avant de passer dans la langue du client, comme le dashboard aujourd'hui.

### 2. Écrans d'authentification (A)

- Composants concernés : `components/auth-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, `two-factor-challenge.tsx`, `two-factor-setup.tsx`, `components/auth/auth-ui.tsx`, les écrans de chargement (`reset-password/page.tsx`, `auth/continue/loading.tsx`), `lib/auth/oauth-error.ts`. Tous les textes visibles passent par `t()`/`translateTemplate` (littéraux) ; les valeurs canoniques ne sont jamais traduites.
- Erreurs de la bibliothèque d'authentification : une table `code → texte français enveloppé dans t()` (nouveau fichier de messages d'authentification) remplace l'affichage du message anglais brut ; un code inconnu retombe sur un message générique français. Le code d'erreur renvoyé par la bibliothèque est la clé de correspondance.
- Messages de validation d'authentification (`lib/validation/auth.ts`) : messages français explicites (au lieu des messages anglais par défaut de Zod), traduits à l'affichage.
- Composants serveur de ces pages (`page.tsx`, `layout.tsx`) : textes via `translateForLocale` + `primeOverlay` avec `resolvePageLocale()`.

### 3. Erreurs d'API traduites à l'affichage (B)

- `apiFetch` (`lib/api/client.ts`) passe le message dans `translate()` avant de créer l'`ApiClientError`. Les appels directs à `fetch` qui affichent un message d'API (support, double authentification) utilisent la même fonction utilitaire.
- Un fichier central (`lib/api/error-messages.ts`) liste chaque message utilisateur en `t("…")` littéral, pour que le scanner les place dans le manifeste ; les routes continuent de renvoyer le même texte français (contrat d'API inchangé).
- Les 4 messages avec valeurs (« Il faut {n} crédits… », « …supprimée : {usages} », cause de génération, « Maximum {n} caractères ») renvoient déjà ou reçoivent un `code` et des paramètres ; le client construit le texte avec `translateTemplate`. Le détail route par route est fixé dans le plan après lecture du code.
- Les ~17 messages anglais des routes de paiement et de coupon visibles par le client passent en français (source) pour devenir traduisibles. `clients/**` est inchangé.

### 4. E-mails (C)

- `sendResetPassword` et `sendVerificationEmail` (`lib/auth/index.ts`, `lib/email/index.ts`) : la langue vient de la requête (cookie `musikpro_lang`, puis `Accept-Language`, puis `fr`) ; sans requête disponible, `fr`. L'objet, le titre, le bouton et les deux phrases fixes passent par `translateForLocale` avec le dictionnaire de la base (`primeOverlay`).
- Les e-mails du propriétaire (deux facteurs) et du support interne ne changent pas.
- Aucune colonne, aucune migration.

### 5. Titres de pages (D)

- `privatePageMetadata` (`lib/seo/metadata.ts`), les titres/descriptions de `terms` et `privacy`, et l'`alt`/slogan de `opengraph-image.tsx` passent par une génération de métadonnées dépendante de la langue (`generateMetadata` ou équivalent), avec `resolvePageLocale()`.
- Le nom et la description du site (variables d'environnement) ne changent pas. Le titre de la landing par langue est hors périmètre.

### 6. Messages Zod visibles (E)

- Les messages français de `lib/validation/musikpro-demo.ts` et `lib/validation/coupons.ts` sont traduits à l'affichage dans les écrans qui les affichent, par une fonction commune `translateIssue(issue)` ; les deux messages « Maximum N caractères. » deviennent un modèle `translateTemplate("Maximum {max} caractères.", { max })`.
- Les valeurs canoniques (catégories de support envoyées au serveur) ne sont pas traduites.

### 7. Garde-fous

- `SCAN_DIRS` (`scripts/i18n-sync.mts`) gagne : `components/auth`, les composants d'authentification listés ci-dessus, `app/(auth)`, `lib/api/error-messages.ts`, le fichier de messages d'authentification, `lib/email`, `lib/seo/metadata.ts`, `app/terms`, `app/privacy`, `app/opengraph-image.tsx`.
- Le périmètre de la règle `eslint/i18n-client-text.mjs` (`eslint.config.mjs`) est élargi aux fichiers client de cette liste, au niveau `error`.
- `CLAUDE.md` : la section i18n cite le résolveur unique (`resolvePageLocale`) et les messages d'erreur d'API.
- `kit:integrity`, `security:baseline`, `validation:zod-check`, `features:check` restent verts ; l'ajout de fichiers ne doit pas créer de route non classée.

### 8. Livraison

Aucune migration. Après déploiement, un clic sur « Actualiser les traductions » traduit les ~185 nouveaux textes ; en attendant, ils s'affichent en français.

## Gestion des erreurs et risques

- Un texte non traduit ou un code d'erreur inconnu retombe sur le français (ou sur un message générique français) : aucune régression visible.
- Risque d'hydratation (#418) sur les pages d'authentification : mitigé par l'indicateur « hydratation terminée » ; vérifié par `ui:hydration-check` et un test navigateur.
- Changer `<html lang>` côté serveur ne doit pas altérer `/admin` (forcé en `fr`) ni la landing et les pages `/s/…` (langue déjà résolue de leur côté).
- Les erreurs d'authentification affichées en anglais aujourd'hui passent en français : changement visible voulu.
- La table des codes d'erreur doit être revue contre la liste réelle des codes de la bibliothèque installée.

## Tests

- Unitaires (Vitest) : partie pure de `resolvePageLocale` (préfixe supporté/non supporté, cookie, `Accept-Language`, repli `fr`) ; table des codes d'erreur d'authentification (code connu/inconnu) ; `translateIssue` ; choix de la langue de l'e-mail à partir de la requête ; `apiFetch` traduit un message connu et laisse un message inconnu.
- Contrôles : `i18n:check`, `lint`, `typecheck`, `test`, `ui:hydration-check`, `kit:integrity`, `security:baseline`, `validation:zod-check`, `features:check`.
- Vérification navigateur : `/en/login` et `/login` avec cookie `en` (textes anglais après hydratation, aucun message d'hydratation, `<html lang>` correct), erreur de connexion traduite, 404 en anglais, `/admin` en français.
