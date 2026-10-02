# Moteur de traduction incrémental — Sous-projet 1

Date : 2026-10-02 · Statut : conception validée en conversation, spec à relire

## Contexte et objectif

Le bouton « Actualiser les traductions » (`/admin/languages`) doit, en un clic, traduire avec l'IA connectée **uniquement ce qui n'est pas déjà traduit** : un texte déjà traduit n'est jamais retraduit.

Aujourd'hui :

- Les textes fixes (`t("…")`) sont traduits dans `lib/i18n/locales/{en,es,pt}.json`. Ces fichiers ne sont remplis que par la commande locale `npm run i18n:sync`. Le bouton admin ne les touche pas, et il ne peut pas le faire en production (disque Vercel en lecture seule).
- Les tables catalogue (colonne `translations` jsonb) sont retraduites **entièrement** à chaque clic (`translateCatalogTable`, `lib/i18n/catalog-translate.ts`).

Ce sous-projet est le **moteur**. Il ne rend pas de nouveaux textes traduisibles : il traduit les ~434 textes déjà dans `t()` et rend le catalogue incrémental. L'ajout de nouveaux `t()` (authentification, navigation native…), le serveur (erreurs d'API, e-mails, `<html lang>`) et les pages légales sont les sous-projets 2, 3 et 4, hors périmètre.

## Hors périmètre

- Envelopper du texte français dans `t()` (sous-projet 2).
- Pages sans préfixe d'URL, erreurs d'API, e-mails, titres de pages (sous-projet 3).
- Pages légales (sous-projet 4).
- Ajouter une langue : la liste de langues reste `fr/en/es/pt` (`Locale` codé en dur), non modifiée ici.
- Modifier ou supprimer les clés existantes des fichiers JSON.

## Conception

### 1. Stockage et lecture des textes fixes

- Nouvelle table `ui_translations` : `locale` (text), `source_text` (text, le français), `translation` (text), `updated_at`. Clé primaire `(locale, source_text)`. Migration Drizzle écrite à la main, idempotente (`0063_ui_translations.sql`, entrée dans le journal), droits `musikpro_runtime` SELECT, `musikpro_service` CRUD, entrée dans `config/security-rls.json` (catalogue global : aucune donnée utilisateur).
- Les fichiers JSON restent la base. La table s'y ajoute. Si un texte est dans les deux, la valeur du JSON l'emporte.
- Point de lecture `GET /api/i18n/overlay?locale=en|es|pt` : renvoie `{ [source_text]: translation }` pour la langue demandée. Locale validée avec Zod (`fr` ou valeur inconnue → 400). Réponse publique et mise en cache ; le cache est invalidé par `revalidateTag` à la fin de chaque actualisation. Aucune donnée sensible (ce sont des libellés d'interface déjà visibles par tout client).
- `lib/i18n/translate.ts` : `translateForLocale` consulte le JSON, puis un dictionnaire en mémoire (`overlay`), puis renvoie le français. Un module `lib/i18n/overlay.ts` expose `setOverlay(locale, dict)` et `getOverlayVersion()`. `translate()` et `translateTemplate()` restent synchrones ; les fichiers qui appellent `t()` ne changent pas.
- Le chargement est déclenché côté client quand la langue n'est pas le français, au montage et à chaque changement de langue (là où `DemoProvider` pose déjà `document.documentElement.lang`). Un compteur de version force le nouveau rendu une fois le dictionnaire reçu. Une erreur réseau laisse le français ou le JSON (aucune régression).
- Les pages rendues serveur (`/s/[slug]`, landing) passent par `translateForLocale` : elles lisent le même dictionnaire côté serveur via une fonction `loadOverlay(locale)` partagée par le point de lecture.

### 2. Manifeste des textes français

- `scripts/i18n-sync.mts` écrit en plus `lib/i18n/manifest.json` : la liste triée des clés trouvées dans le code (même scan, mêmes dossiers, mêmes `MANUAL_KEYS`).
- `npm run i18n:check` (déjà dans `ci:check`) échoue si le manifeste n'est pas à jour, en plus du contrôle actuel des JSON. Le manifeste, comme les JSON, est versionné.
- À l'exécution : textes à traduire pour une langue = manifeste − clés du JSON − clés de `ui_translations` pour cette langue.
- Si le texte français d'un `t("…")` change, sa clé change : il devient « non traduit » sans mécanisme supplémentaire. Les anciennes lignes de `ui_translations` ne sont plus utilisées (nettoyage hors périmètre).

### 3. Catalogue incrémental

- Dans la colonne `translations` de chaque ligne, ajout d'une clé de premier niveau `_src` : `{ [champ]: empreinte }` (SHA-256 tronqué du texte source nettoyé). Le type `CatalogTranslations` gagne un champ optionnel `_src`. `localizeField` ne lit que `translations[locale][field]` : aucun changement d'affichage.
- `translateCatalogTable` ne traduit un champ, pour une langue, que s'il n'y a pas de traduction ou si l'empreinte stockée diffère de celle du texte actuel. Les champs inchangés sont recopiés tels quels.
- Les lignes existantes n'ont pas d'empreinte : au premier clic suivant le déploiement, tout est retraduit une dernière fois et les empreintes sont posées. Ensuite seuls les textes nouveaux ou modifiés le sont.
- Les règles existantes restent : le texte français stocké n'est jamais remplacé ; `occasion_fields` remet déjà `translations` à `null` quand son texte change (conforme : `_src` disparaît avec).
- Les écritures par table restent celles de `runCatalogTranslationsRefresh` (aucune table ajoutée ni retirée).

### 4. Bouton, lots et compte rendu

- Une action serveur `refreshAllTranslations` (au même emplacement, `app/admin/languages/actions.ts`) :
  1. calcule ce qui manque (textes fixes par langue, catalogue par champ) ;
  2. traduit au plus **5 lots de 40** par appel (`translateBatch`, déjà existant), écrit immédiatement dans `ui_translations` (upsert) ou dans `translations` ;
  3. renvoie `{ translated, alreadyUpToDate, remaining, details }`.
- Le bouton (`RefreshCatalogTranslationsButton`) rappelle l'action tant que `remaining > 0` et affiche la progression. Si l'IA échoue, ce qui est déjà écrit reste ; le clic suivant reprend.
- Compte rendu en toast (règle admin) : « N textes traduits, M déjà à jour » avec le détail catalogue/interface. Action protégée par `requireAdmin`, limite de fréquence, entrée `writeAuditLog` (`translations.refreshed`).
- Le texte de la carte « Traductions du catalogue » est complété : elle traduit aussi les textes de l'interface, et ne retraduit pas ce qui l'est déjà. L'ancienne action `refreshCatalogTranslations` est conservée, elle appelle la même logique (rétrocompatible).
- Aucune traduction écrite à la main : tout vient du fournisseur IA connecté.

## Gestion des erreurs

- Fournisseur IA absent : message déjà existant (« Aucun fournisseur IA n'est configuré… »).
- Réponse IA invalide ou clé omise : le texte reste non traduit (retombe sur le français) et sera repris au clic suivant ; il est compté dans `remaining`.
- Échec d'écriture en base : erreur lisible via `actionErrorMessage`, rien de partiel signalé comme succès.
- Échec du chargement du dictionnaire côté client : repli sur les JSON puis le français.

## Tests

- Unitaires (Vitest) : calcul des textes manquants (manifeste, JSON, table) ; empreinte et décision « à traduire » du catalogue ; fusion JSON > table > français dans `translateForLocale` ; validation Zod du paramètre `locale` ; plafond de lots par appel et `remaining`.
- `i18n:check` couvre le manifeste ; contrôles du kit : `kit:integrity`, `security:baseline` (RLS), gate Zod, typecheck, lint.
- Vérification navigateur : après un clic, changer de langue sans recharger affiche les textes ajoutés ; un second clic indique 0 texte à traduire.

## Risques et réserves

- Le dictionnaire est récupéré après le premier rendu : un bref affichage en français est possible avant la traduction des textes qui ne sont que dans la table. Les ~518 textes du JSON s'affichent immédiatement.
- Le premier clic après déploiement retraduit tout le catalogue (empreintes absentes) : coût IA ponctuel, comme aujourd'hui.
- La migration `0063` doit être appliquée en production avant le déploiement (règle du projet).
