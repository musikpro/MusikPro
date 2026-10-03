# Pages légales traduisibles — Sous-projet 4

Date : 2026-10-03 · Statut : conception validée en conversation, spec à relire

## Contexte et objectif

Les sous-projets 1 à 3 ont livré le moteur de traduction incrémental, l'enveloppement des textes client, le résolveur de langue unique (`resolvePageLocale()`), les écrans d'authentification, les erreurs d'API, les e-mails et les métadonnées. Il reste le **corps** des deux pages légales, `app/terms/page.tsx` (conditions d'utilisation) et `app/privacy/page.tsx` (politique de confidentialité), rendu en français quelle que soit la langue du client, ainsi que le cadre de `components/legal-page.tsx` (« Dernière mise à jour : … », pied de page).

Mesure : environ 30 phrases ou paragraphes (7 sections pour chaque page) plus 6 libellés du cadre. Deux paragraphes contiennent un lien `mailto:`.

## Décisions prises avec le responsable

- **Traduction par le mécanisme existant** (phrases françaises comme clés, bouton « Actualiser les traductions »), sans nouveau mécanisme.
- **Bandeau « traduction automatique »** sur les pages légales non françaises : il indique que la traduction est automatique et que la version française fait foi, avec un lien vers la version française.

## Hors périmètre

- Toute modification du contenu juridique français (textes, date de mise à jour) : seul l'habillage de traduction change.
- Relecture juridique des traductions : le bandeau en tient lieu ; une relecture humaine éventuelle se fait hors code.
- Préfixe d'URL par langue pour `/terms` et `/privacy` (nouvelle architecture de routes) : non retenu ; la langue vient du résolveur existant.

## Conception

### 1. Langue de la page et version française forcée

- `lib/i18n/legal-locale.ts` : fonction pure `pickLegalLocale(pageLocale, langParam)` : si `langParam === "fr"`, renvoie `fr` ; sinon la langue de la page. Les pages lisent `searchParams.lang` (Next 16, `searchParams` est une promesse) et appellent `resolvePageLocale()` pour la langue de la page. `generateMetadata` utilise le même calcul, pour que le titre et le corps restent cohérents.
- Quand la version française est forcée, le contenu de `<main>` porte `lang="fr"` pour que `<html lang>` (qui suit le cookie) ne contredise pas le contenu, ce qui évite la proposition de traduction automatique du navigateur et les lecteurs d'écran mal réglés.
- Le canonical, `robots` et le sitemap restent inchangés (le paramètre `lang` n'entre jamais dans le canonical).

### 2. Enveloppement des textes

- Chaque titre de section, introduction et paragraphe passe par `translateForLocale(texte, locale)` avec `await primeOverlay(locale)` (modèle de `app/s/[slug]/page.tsx` et de `generateMetadata`), via un alias local `t`. Clés littérales : jamais d'interpolation avant l'appel.
- Les deux paragraphes avec e-mail deviennent des modèles littéraux contenant `{email}` ; un petit utilitaire du composant remplace `{email}` par le lien `mailto:` (découpe de la chaîne traduite autour du marqueur). Si une traduction perd le marqueur, le lien est ajouté à la fin du paragraphe : l'adresse n'est jamais perdue.
- La date « 19 septembre 2026 » est une constante canonique unique, formatée avec `Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })` et insérée via `translateTemplateForLocale("Dernière mise à jour : {date}", { date })`. En français, le rendu reste identique à aujourd'hui.
- `LegalPage` reçoit `locale` et un indicateur `forcedFrench`; il traduit son cadre (libellés, pied de page) de la même façon. Aucun changement de balisage ou de CSS pour le français.

### 3. Bandeau de traduction automatique

- Affiché si `locale !== "fr"` : « Traduction automatique : en cas de divergence, la version française fait foi. » + lien « Lire la version française » vers `?lang=fr` de la même page. Textes littéraux traduits par le mécanisme existant. Aucun bandeau en français ni quand la version française est forcée.
- Style : réutilise les classes de `app/globals.css` des pages légales ; une seule classe ajoutée si nécessaire (pas de nouveau système de composants).

### 4. Garde-fous

- `SCAN_DIRS` : `components/legal-page.tsx` s'ajoute (`app/terms` et `app/privacy` y sont déjà) ; `npm run i18n:manifest` régénère le manifeste.
- Règle ESLint `eslint/i18n-client-text.mjs` : `app/terms`, `app/privacy` et `components/legal-page.tsx` rejoignent le périmètre au niveau `error` (le texte français accentué hors `t()` échoue au lint).
- `CLAUDE.md` : une phrase dans la section i18n indiquant que les pages légales se traduisent par ce mécanisme et que la version française fait foi (bandeau, `?lang=fr`).
- `kit:integrity`, `security:baseline`, `features:check`, `seo-check` restent verts ; les pages restent `force-dynamic`.

### 5. Livraison

Aucune migration. Après déploiement, un clic sur « Actualiser les traductions » traduit les ~40 nouveaux textes ; en attendant, les pages légales s'affichent en français (avec le bandeau si la langue n'est pas le français).

## Gestion des erreurs et risques

- Un texte non traduit retombe sur le français : le bandeau s'affiche alors au-dessus d'un contenu français (acceptable, le lien ramène à la version française).
- Une traduction IA qui altère le sens juridique : atténué par le bandeau (la version française fait foi) ; hors périmètre technique.
- Changer un paragraphe français change sa clé : sa traduction est perdue jusqu'au prochain clic (comportement incrémental voulu).
- `searchParams.lang` est une entrée non fiable : seule la valeur exacte `fr` est reconnue ; toute autre valeur est ignorée.

## Tests

- Unitaires (Vitest) : `pickLegalLocale` (`fr` forcé, valeur inconnue ignorée, langue de page conservée) ; utilitaire de remplacement `{email}` (marqueur présent, marqueur perdu → lien en fin) ; format de date (fr identique à « 19 septembre 2026 », en/es/pt formatés).
- Contrôles : `i18n:check`, `lint`, `typecheck`, `test`, `ui:hydration-check`, `kit:integrity`, `security:baseline`, `features:check`, `seo-check`.
- Vérification navigateur : `/terms` et `/privacy` en français sans changement ni bandeau ; avec le cookie `musikpro_lang=en` : bandeau et titres de cadre ; après « Actualiser les traductions », corps en anglais ; `?lang=fr` : contenu français avec `lang="fr"` sur `<main>` et sans bandeau.
