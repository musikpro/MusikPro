# Textes français du parcours client dans `t()` — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envelopper dans `t()` / `translateTemplate()` les ~200 textes français encore en dur du parcours client (dashboard, landing, partage), et mettre en place la garde (scanner élargi + règle ESLint) pour qu'aucun texte en dur ne revienne.

**Architecture:** On pose d'abord la garde (règle ESLint en avertissement + scanner élargi avec manifeste régénérable sans IA) : elle liste objectivement ce qui reste. Des tâches par groupe de fichiers font tomber les avertissements à zéro sans changer le comportement visible en français. La dernière tâche passe la règle en erreur. Un voyant dans l'admin montre le nombre de textes non traduits.

**Tech Stack:** Next.js 16 (App Router), React 19, ESLint flat config (`no-restricted-syntax`), Vitest, `lib/i18n/translate.ts`, `scripts/i18n-sync.mts`, moteur incrémental du sous-projet 1.

**Spec:** `docs/superpowers/specs/2026-10-02-i18n-wrap-client-texts-design.md`

## Global Constraints

- Réponses, commits et messages d'interface en français ; commits terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Ne pas committer `next-env.d.ts`.
- **Aucun changement visible en français.** Le texte français de chaque `t()` doit être **identique, au caractère près**, au texte actuel : une reformulation change la clé et perd la traduction existante des fichiers `lib/i18n/locales/*.json`. Conserver apostrophes (`’` vs `'`), guillemets français et espaces insécables tels quels.
- Mécanismes autorisés uniquement : `t("…")` (client), `translateTemplate("… {param} …", { param })` (valeurs dynamiques : ne jamais interpoler avant l'appel), `translateForLocale` / `translateTemplateForLocale` avec `resolveLocaleFromAcceptLanguage` + `await primeOverlay(locale)` (composants serveur, modèle `app/s/[slug]/page.tsx`). Pas de nouvel utilitaire de traduction.
- Le scanner ne lit que les littéraux : `t("…")` avec un texte littéral, jamais `t(variable)`, jamais de clé construite avec `${}`.
- **Pluriels** : deux appels à texte littéral, `n > 1 ? translateTemplate("{count} crédits", { count: n }) : translateTemplate("{count} crédit", { count: n })`. Conserver le seuil actuel de chaque site (`n > 1` ou `n !== 1`).
- **Jamais traduire** les valeurs canoniques stockées/comparées/envoyées : `demo.choices.theme` (`"Clair" | "Sombre" | "Auto"`), `item.label === "Version"`, `items[].key` de navigation, valeurs d'occasion/style/relation (`song.occasion` etc.), titres de chansons, contenu saisi par l'utilisateur. Seul l'**affichage** peut être enveloppé.
- Les `t()` ne doivent jamais être évalués au chargement d'un module (hors fonction ou composant) : ils ne peuvent pas connaître la langue.
- Périmètre : `app/dashboard/**`, `app/s/**`, `app/page.tsx`, `app/not-found.tsx`, `app/loading.tsx`, `components/banani/**`, `components/mobile/**`, `components/mobile-bottom-nav.tsx`, `components/dashboard-nav.tsx`, `components/checkout-button.tsx`, `components/ui/**`, `components/pwa/**`. Hors périmètre : admin, `app/(auth)`, `components/auth*`, `auth-form`, `two-factor-*`, `forgot-password-form`, `reset-password-form`, pages `privacy`/`terms`/`legal-page`, `lib/**`, e-mails, métadonnées statiques de `app/page.tsx` et `app/layout.tsx`.
- Commandes : lint `npx eslint <fichiers>` ; manifeste `npm run i18n:manifest` (créé à la tâche 2) ; tests `npx vitest run <fichier>` ; contrôles finaux `npm run typecheck && npm run lint && npm run test && npm run i18n:check && npm run ui:hydration-check && npm run kit:integrity`.
- Après chaque tâche d'enveloppement : `npm run i18n:manifest`, committer `lib/i18n/manifest.json` avec la tâche. **Ne pas lancer `npm run i18n:sync`** (il appellerait l'IA et modifierait les JSON : les traductions des nouveaux textes viennent du bouton admin).

## Review Focus

1. Une valeur canonique (thème, clé de navigation, occasion stockée) a été enveloppée par erreur : comparaison cassée ou valeur envoyée traduite.
2. Un texte français existant a été reformulé en l'enveloppant (clé différente, traduction existante perdue, ou affichage français modifié).
3. Un libellé de menu déplacé hors du niveau module change de `key`, est recréé à chaque rendu au point de casser un effet, ou n'est plus traduit.
4. `notify` : un utilisateur non-démo voit encore « Cette fonctionnalité sera bientôt disponible… » (traduit) à la place d'un message de démonstration ; un utilisateur démo voit le message de démonstration inchangé.
5. Pluriel : le français est identique avant/après pour 0, 1, 2 (même seuil), et aucune clé n'est construite avec `${}`.
6. Composant serveur : appel à `t()` basé sur `document` ou oubli de `await primeOverlay(locale)` ; `generateMetadata` mal typé ; page devenue statique/dynamique différemment.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `eslint/i18n-client-text.mjs` (créer) | sélecteurs `no-restricted-syntax` + globs du périmètre |
| `eslint.config.mjs` (modif) | applique la règle (avertissement, puis erreur à la tâche 9) |
| `tests/eslint-i18n-client-text.test.ts` (créer) | cas bons/mauvais de la règle |
| `scripts/i18n-sync.mts` (modif), `package.json` (modif) | périmètre élargi, `--manifest-only`, `--check` ne bloque plus sur les traductions |
| `lib/i18n/manifest.json` (régénéré) | clés |
| `components/banani/DemoProvider.tsx` (modif) | `notify(message, { demoOnly })` + ses propres textes |
| fichiers `components/banani/*` (modif) | enveloppement par groupe |
| `app/not-found.tsx`, `app/loading.tsx`, `app/dashboard/**`, `components/dashboard-nav.tsx`, `components/ui/*` (modif) | textes serveur/partagés |
| `lib/i18n/untranslated.ts` (créer), `lib/i18n/untranslated-server.ts` (créer), `tests/i18n-untranslated.test.ts` (créer) | comptage |
| `app/admin/languages/page.tsx`, `components/admin/*` (modif) | voyant |
| `CLAUDE.md` (modif) | règle i18n mise à jour |

---

### Task 1: Règle ESLint contre les textes français en dur (avertissement)

**Files:**
- Create: `eslint/i18n-client-text.mjs`, `tests/eslint-i18n-client-text.test.ts`
- Modify: `eslint.config.mjs`

**Interfaces:**
- Produces (`eslint/i18n-client-text.mjs`) : `export const i18nClientFiles: string[]` (globs du périmètre) et `export const i18nClientTextSelectors: Array<{ selector: string; message: string }>` ; `eslint.config.mjs` les consomme avec un niveau `"warn"` (Task 9 le passe à `"error"`).

- [ ] **Step 1: Écrire le module des sélecteurs**

`eslint/i18n-client-text.mjs` :

```js
/**
 * Garde i18n : signale tout texte français (accentué) écrit en dur dans les composants client,
 * au lieu de t("…") / translateTemplate("…", {…}). Limite connue : un texte français sans accent
 * n'est pas détecté. Cas légitime (valeur canonique stockée en français, etc.) : désactiver la
 * ligne avec `// eslint-disable-next-line no-restricted-syntax -- <raison>`.
 */
export const i18nClientFiles = [
  "app/dashboard/**/*.{ts,tsx}",
  "app/s/**/*.{ts,tsx}",
  "app/page.tsx",
  "app/not-found.tsx",
  "app/loading.tsx",
  "components/banani/**/*.{ts,tsx}",
  "components/mobile/**/*.{ts,tsx}",
  "components/mobile-bottom-nav.tsx",
  "components/dashboard-nav.tsx",
  "components/checkout-button.tsx",
  "components/ui/**/*.{ts,tsx}",
  "components/pwa/**/*.{ts,tsx}",
];

const ACCENT = "[àâäçéèêëîïôöùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŒ]";
const ATTRS = "/^(placeholder|aria-label|title|alt|label)$/";
const message =
  "Texte français en dur : l'envelopper avec t(\"…\") ou translateTemplate(\"…{param}…\", { param }) (lib/i18n/translate.ts).";

export const i18nClientTextSelectors = [
  { selector: `JSXText[value=/${ACCENT}/]`, message },
  { selector: `JSXAttribute[name.name=${ATTRS}] > Literal[value=/${ACCENT}/]`, message },
  { selector: `JSXAttribute[name.name=${ATTRS}] > JSXExpressionContainer > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.name='notify'] > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.property.name='notify'] > Literal[value=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.name='notify'] > TemplateLiteral > TemplateElement[value.raw=/${ACCENT}/]`, message },
  { selector: `CallExpression[callee.property.name='notify'] > TemplateLiteral > TemplateElement[value.raw=/${ACCENT}/]`, message },
];
```

(Si une expression `esquery` avec classe de caractères accentués n'est pas acceptée telle quelle, utiliser une alternation `(à|â|…)` ; le test de l'étape suivante prouve que le sélecteur fonctionne.)

- [ ] **Step 2: Écrire le test (échoue tant que le module n'est pas branché)**

`tests/eslint-i18n-client-text.test.ts` : utiliser la classe `Linter` d'ESLint (flat config) avec `@typescript-eslint/parser` (déjà installé via `eslint-config-next`), le sélecteur de `i18nClientTextSelectors` sous `"no-restricted-syntax": ["error", ...selectors]`, `languageOptions.parserOptions.ecmaFeatures.jsx = true`, `files: ["**/*.tsx"]`. Cas :

```ts
import { Linter } from "eslint";
import * as tsParser from "@typescript-eslint/parser";
import { describe, expect, it } from "vitest";
import { i18nClientTextSelectors } from "../eslint/i18n-client-text.mjs";

const linter = new Linter({ configType: "flat" });
const lint = (code: string) =>
  linter.verify(code, [
    {
      files: ["**/*.tsx"],
      languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
      rules: { "no-restricted-syntax": ["error", ...i18nClientTextSelectors] },
    },
  ], "x.tsx");

describe("i18n client text rule", () => {
  it.each([
    ["JSX text", "const A = () => <p>Créer une chanson</p>;"],
    ["placeholder literal", 'const A = () => <input placeholder="Entrer ton prénom" />;'],
    ["aria-label expression literal", "const A = () => <button aria-label={\"Créer une chanson\"} />;"],
    ["notify literal", 'notify("Chanson retirée.");'],
    ["demo.notify literal", 'demo.notify("Chanson retirée.");'],
    ["notify template", "notify(`Il faut ${n} crédits pour générer.`);"],
  ])("flags %s", (_name, code) => {
    expect(lint(code).length).toBeGreaterThan(0);
  });

  it.each([
    ["wrapped JSX text", 'const A = () => <p>{t("Créer une chanson")}</p>;'],
    ["wrapped attribute", 'const A = () => <input placeholder={t("Entrer ton prénom")} />;'],
    ["notify with t", 'notify(t("Chanson retirée."));'],
    ["unaccented identifier text", "const A = () => <p>{title}</p>;"],
    ["notify empty string", 'notify("");'],
    ["non-user attribute", 'const A = () => <div className="é" data-x="é" />;'],
  ])("accepts %s", (_name, code) => {
    expect(lint(code)).toHaveLength(0);
  });
});
```

Run: `npx vitest run tests/eslint-i18n-client-text.test.ts` — attendu : si le fichier `.mjs` existe, certains cas peuvent déjà passer ; corriger les sélecteurs jusqu'à ce que **tous** les cas passent (ne jamais affaiblir un cas).

- [ ] **Step 3: Brancher la règle dans `eslint.config.mjs`**

```js
import { i18nClientFiles, i18nClientTextSelectors } from "./eslint/i18n-client-text.mjs";
// … dans le tableau défini par defineConfig, après les configs next et avant globalIgnores :
  {
    files: i18nClientFiles,
    ignores: ["**/*.test.{ts,tsx}"],
    rules: { "no-restricted-syntax": ["warn", ...i18nClientTextSelectors] },
  },
```

- [ ] **Step 4: Mesurer la base de départ**

Run: `npx eslint app components --format json | node -e "…"` (ou `npx eslint app components -f unix | grep -c no-restricted-syntax`) et noter dans le rapport le nombre d'avertissements `no-restricted-syntax` et leur répartition par fichier (`npx eslint … -f unix | grep no-restricted-syntax | cut -d: -f1 | sort | uniq -c | sort -rn`). Attendu : ordre de grandeur de ~150–250. Enregistrer la liste dans `.superpowers/sdd/<workspace>/baseline-warnings.txt` (non committé) pour les tâches suivantes.

- [ ] **Step 5: Vérifier et commiter**

Run: `npx vitest run tests/eslint-i18n-client-text.test.ts && npm run lint` — Expected: tests verts, 0 erreur de lint (les nouveaux avertissements sont attendus).

```bash
git add eslint/i18n-client-text.mjs eslint.config.mjs tests/eslint-i18n-client-text.test.ts
git commit -m "feat(i18n): règle ESLint contre les textes français en dur (avertissement)"
```

---

### Task 2: Scanner élargi, manifeste sans IA, `i18n:check` non bloquant sur les traductions

**Files:**
- Modify: `scripts/i18n-sync.mts`, `package.json`
- Modify: `lib/i18n/manifest.json` (régénéré)

**Interfaces:**
- Produces : `npm run i18n:manifest` (= `tsx scripts/i18n-sync.mts --manifest-only`, n'écrit que `lib/i18n/manifest.json`, sans variable d'environnement ni IA) ; `i18n:check` échoue **uniquement** si le manifeste est périmé et affiche le nombre de textes sans traduction par langue ; `i18n:sync` garde son comportement (remplit les JSON via l'IA, écrit aussi le manifeste).

- [ ] **Step 1: Élargir le périmètre du scanner**

Dans `scripts/i18n-sync.mts`, remplacer `SCAN_DIRS` par :

```ts
const SCAN_DIRS = [
  "app/dashboard",
  "app/s",
  "app/page.tsx",
  "app/not-found.tsx",
  "app/loading.tsx",
  "components/banani",
  "components/mobile",
  "components/mobile-bottom-nav.tsx",
  "components/dashboard-nav.tsx",
  "components/checkout-button.tsx",
  "components/ui",
  "components/pwa",
];
```

(vérifier que chaque chemin existe ; `walk` lève sur un chemin absent : retirer ceux qui n'existent pas et le dire dans le rapport.) Le scanner doit aussi reconnaître `translateForLocale(` et `translateTemplateForLocale(` — mais **pas** leurs usages à clé variable : étendre `T_CALL` à `\b(?:t|translateTemplate)\(`, et ajouter une seconde expression `T_FOR_LOCALE = /\b(?:translateForLocale|translateTemplateForLocale)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g` appliquée de la même façon (première argument littéral) ; les composants serveur de la tâche 7 s'en servent via un petit alias local `const t = (text: string) => translateForLocale(text, locale)` : le scanner doit donc aussi reconnaître `t(` dans ces fichiers (c'est déjà le cas avec `T_CALL`).

- [ ] **Step 2: Mode `--manifest-only` et contrôle non bloquant**

Ajouter `const MANIFEST_ONLY = process.argv.includes("--manifest-only");`. Comportement :
- `--manifest-only` : après le scan, écrire le manifeste s'il est périmé, afficher « manifest: written/up to date », puis `return` (aucun import de `ai-translate`, aucun accès aux JSON, aucune variable d'environnement).
- `--check` : le manifeste périmé fait échouer (exit 1, comportement actuel). Les clés manquantes dans un JSON **n'échouent plus** : ne plus positionner `anyMissing`; afficher `  <locale>: N texte(s) sans traduction (à traduire depuis /admin/languages ou avec npm run i18n:sync).` et lister jusqu'à 10 exemples. Le message final d'échec devient : « Le manifeste lib/i18n/manifest.json est périmé. Lancez `npm run i18n:manifest`. »
- Défaut (`i18n:sync`) : inchangé (traduit les clés manquantes dans les JSON via l'IA, écrit le manifeste). Corriger au passage le message final « nothing to do » quand seul le manifeste a été réécrit (variable `manifestWritten`).
- Mettre à jour le commentaire d'en-tête du fichier (décision : l'admin remplit les traductions ; `i18n:sync` reste optionnel en local).

`package.json` : ajouter `"i18n:manifest": "tsx scripts/i18n-sync.mts --manifest-only"`.

- [ ] **Step 3: Régénérer et vérifier**

Run: `npm run i18n:manifest` puis `npm run i18n:check` (exit 0 ; il peut annoncer des textes sans traduction pour les clés des composants nouvellement scannés). Vérifications manuelles à consigner : (a) éditer une ligne de `lib/i18n/manifest.json` → `i18n:check` exit 1 ; restaurer ; (b) retirer temporairement une clé de `lib/i18n/locales/en.json` → `i18n:check` exit 0 avec « 1 texte sans traduction » ; restaurer (`git checkout lib/i18n/locales/en.json`) ; (c) `npm run i18n:manifest` n'a besoin d'aucune variable d'environnement (la lancer avec `env -i PATH="$PATH" npm run i18n:manifest`).

- [ ] **Step 4: Commit**

```bash
git add scripts/i18n-sync.mts package.json lib/i18n/manifest.json
git commit -m "feat(i18n): scanner élargi, i18n:manifest sans IA, i18n:check ne bloque plus sur les traductions manquantes"
```

---

### Task 3: `DemoProvider` — `notify(message, { demoOnly })` et ses propres textes

**Files:**
- Modify: `components/banani/DemoProvider.tsx`
- Modify: les composants qui appellent `notify(` avec un message contenant « démonstration » (liste : `grep -rn "démonstration" components/banani app/dashboard | grep -i notify` ; exploration : ~16 sites hors `DemoProvider`)

**Interfaces:**
- Produces : `notify(message: string, options?: { demoOnly?: boolean }): void`. Avec `demoOnly: true` et `!isDemo`, le message affiché est `t("Cette fonctionnalité sera bientôt disponible dans votre espace MusikPro.")`. Sans option, le message est affiché tel quel. Le type `DemoState` (ou équivalent exposé par `useDemo()`) est mis à jour.

- [ ] **Step 1: Lire et lister**

Lire `components/banani/DemoProvider.tsx` (autour de `const notify =` ligne ~117, et de tous les `notify(`) et lister avec `grep` chaque appel `notify(` du dépôt (composants + `DemoProvider`) dont le message contient « démonstration » (insensible à la casse). Ce sont exactement les sites que l'ancienne expression régulière `/démonstration/i` transformait pour un utilisateur non-démo. Noter la liste dans le rapport.

- [ ] **Step 2: Remplacer l'expression régulière par un drapeau explicite**

Dans `DemoProvider.tsx` :

```ts
const notify = (nextMessage: string, options?: { demoOnly?: boolean }) =>
  setMessage(
    options?.demoOnly && !isDemo
      ? t("Cette fonctionnalité sera bientôt disponible dans votre espace MusikPro.")
      : nextMessage,
  );
```

Passer `{ demoOnly: true }` à **chaque** site de la liste de l'étape 1 (le message reste enveloppé : `notify(t("Action de démonstration : aucune opération réelle effectuée."), { demoOnly: true })`). Mettre à jour la signature exposée (`notify: (message: string, options?: { demoOnly?: boolean }) => void` dans le type de l'état) et tout composant qui la redéclare. Comportement attendu en français : identique à avant, pour démo et non-démo.

- [ ] **Step 3: Envelopper les autres textes de `DemoProvider.tsx`**

Envelopper dans `t()` / `translateTemplate()` tous les textes français affichés que signale la règle ESLint dans ce fichier (`npx eslint components/banani/DemoProvider.tsx`), dont : les `notify(` à littéral (lignes ~401, 403, 565, 781, 905, 911, 924, 942…), les messages sur plusieurs lignes (`notify(\n …\n)` lignes ~766, 817, 915, 934), le modèle à valeur ligne ~743 → `translateTemplate("Il faut {credits} crédits pour lancer une génération musicale.", { credits: CREDITS_PER_GENERATION })`. Ne pas traduire `error.message` provenant de l'API (sous-projet 3), ni les valeurs d'état par défaut qui sont des valeurs canoniques (`"support.category": "Problème technique"` reste tel quel : c'est une valeur de champ). Le texte `"Hors ligne — …"` de l'indicateur hors ligne est enveloppé s'il ne l'est pas.

- [ ] **Step 4: Vérifier**

Run: `npx eslint components/banani/DemoProvider.tsx` (0 avertissement `no-restricted-syntax` dans ce fichier), `npm run typecheck`, `npm run i18n:manifest`, `npm run lint`. Vérifier en lisant `git diff` que **aucun** texte français existant n'a changé d'un caractère.

- [ ] **Step 5: Commit**

```bash
git add components/banani lib/i18n/manifest.json
git commit -m "feat(i18n): notify avec drapeau demoOnly, textes de DemoProvider dans t()"
```

---

### Task 4: Écrans à messages, pluriels et textes avec valeurs

**Files (modifier ; chaque fichier appartient à cette tâche seulement) :**
`components/banani/UserDashboardMobile.tsx`, `UserDashboardDesktop.tsx`, `UserMenuMobile.tsx`, `WorkspaceBalanceCard.tsx`, `MySongsGeneratedScreen.tsx`, `DiscoverLibraryScreen.tsx`, `MyLyricsScreen.tsx`, `MyFavoritesSongsScreen.tsx`, `SongCard.tsx`, `SongPlayerScreen.tsx`, `CreditsPurchaseScreen.tsx`, `PaymentRedirectChariowScreen.tsx`.

**Interfaces:**
- Consumes : `notify(message, { demoOnly })` (Task 3).

- [ ] **Step 1: Cartographier**

Pour chaque fichier : `npx eslint <fichier>` (avertissements) + `grep -n '\${' <fichier>` + recherche des pluriels (`> 1 ?`, `!== 1 ?`, `"s" :`). Consigner dans le rapport le nombre de sites traités par fichier.

- [ ] **Step 2: Envelopper**

Appliquer les règles des Global Constraints :
- `notify("…")` → `notify(t("…"))` (un seul texte par message distinct ; les messages de démonstration gardent `{ demoOnly: true }` ajouté en tâche 3).
- Modèles `\`… ${x} …\`` → `translateTemplate("… {x} …", { x })` (exemples : `MyLyricsScreen.tsx:31` `Paroles de « {title} » copiées.`, `MySongsGeneratedScreen.tsx:541` `window.confirm(translateTemplate("Supprimer « {title} » et ses versions ? …", { title: song.title }))`, `SongCard.tsx:72,83`, `MyFavoritesSongsScreen.tsx:112`, `PaymentRedirectChariowScreen.tsx:151`). Les cas déjà mixtes `${t("Écouter")} ${title}` (`SongPlayerScreen.tsx:383`) deviennent `translateTemplate("Écouter {title}", { title })`.
- Pluriels : deux appels littéraux (Global Constraints) ; sites connus : `UserDashboardMobile.tsx:162`, `UserDashboardDesktop.tsx:164` (`crédit${n>1?"s":""}`), `UserMenuMobile.tsx:96` (double pluriel : « {count} crédit(s) disponible(s) » → deux textes littéraux complets, singulier et pluriel), `WorkspaceBalanceCard.tsx:34`, `MySongsGeneratedScreen.tsx:282-283`, `DiscoverLibraryScreen.tsx:37-38`, `MyLyricsScreen.tsx:42,51` (texte JSX concaténé avec `{n !== 1 ? "s" : ""}`), `CreditsPurchaseScreen.tsx:96,277`.
- JSX/attributs restants signalés par la règle dans ces fichiers.
- Interdit : traduire `song.title`, `song.occasion`, valeurs d'état.

- [ ] **Step 3: Vérifier**

Run: `npx eslint <les 12 fichiers>` → 0 avertissement `no-restricted-syntax` ; `npm run typecheck && npm run i18n:manifest && npm run lint`. Relire `git diff` : pour chaque pluriel, vérifier à la main que le français produit pour 0, 1 et 2 est identique à l'ancien code.

- [ ] **Step 4: Commit**

```bash
git add components/banani lib/i18n/manifest.json
git commit -m "feat(i18n): messages, pluriels et textes à valeurs des écrans dans t()"
```

---

### Task 5: Écrans à libellés et listes de données

**Files (modifier ; exclusifs à cette tâche) :**
`components/banani/ContactSupportScreen.tsx`, `SecurityAccountScreen.tsx`, `NotificationCenterScreen.tsx`, `NotificationsSettingsScreen.tsx`, `HelpFAQScreen.tsx`, `StepGeneratingSong.tsx`, `MobileTopBar.tsx`, `SearchField.tsx`, `UserDashboardMobile.tsx`/`UserDashboardDesktop.tsx` **uniquement pour leurs listes de données** (« tendances » lignes ~23/24) **si la tâche 4 ne les a pas déjà traitées** (vérifier avec `git log`/eslint avant), et tout autre fichier de `components/banani` encore signalé par la règle **après** les tâches 3, 4 et 6.

- [ ] **Step 1: Listes de données**

Pour `HelpFAQScreen.tsx` (6 entrées, paragraphes longs), `NotificationCenterScreen.tsx` (~10 textes dont « Il y a 2h »), `StepGeneratingSong.tsx` (3 messages), `CreditsPurchaseScreen.tsx` (historique de démonstration : **ne pas toucher à ce fichier**, il est à la tâche 4 ; si des textes de données y restent, les signaler au rapport) : le tableau défini au niveau module est remplacé par une fonction appelée dans le composant (`const getFaq = () => [{ question: t("…"), answer: t("…") }, …]`, `const faq = getFaq()` dans le rendu) afin que `t()` s'exécute au rendu avec la bonne langue. Apostrophes et guillemets échappés conservés tels quels dans la clé (le scanner déséchappe).

- [ ] **Step 2: JSX et attributs**

Envelopper tous les textes JSX et attributs signalés par `npx eslint` dans ces fichiers (`ContactSupportScreen.tsx:67-173`, `SecurityAccountScreen.tsx:31-111`, `NotificationsSettingsScreen.tsx:39-91` (`<DemoToggle label="…">`), `MobileTopBar.tsx:27,49`, `SearchField.tsx:33`, etc.). Cas particulier : valeurs de `<select>`/options qui sont des valeurs canoniques envoyées au serveur (ex. catégories de support) → traduire le libellé affiché seulement, garder `value` français ; documenter chaque cas dans le rapport.

- [ ] **Step 3: Vérifier et commiter**

Run : `npx eslint <fichiers>` (0 avertissement), `npm run typecheck && npm run i18n:manifest && npm run lint`.

```bash
git add components/banani lib/i18n/manifest.json
git commit -m "feat(i18n): libellés et listes de données des écrans dans t()"
```

---

### Task 6: Libellés de menus évalués au chargement du module

**Files (modifier) :** `components/banani/SongCreationGenreSelection.tsx` (lignes ~13-29), `DesktopSidebar.tsx` (~9), `MobileBottomNav.tsx` (~15), `MobileMenuDrawer.tsx` (~12), `UserMenuMobile.tsx` (~14), `components/mobile-bottom-nav.tsx` si concerné.

- [ ] **Step 1: Déplacer dans le composant**

Pour chacun de ces fichiers : le tableau (constante de module) dont les entrées appellent `t("…")` est transformé en fonction `getItems()` (ou construit dans le corps du composant), appelée à chaque rendu. **Les propriétés `key`/`id`/`href`/`icon` restent identiques** ; seuls les `label`/`title` passent par `t()` évalué au rendu. Conserver les types exportés si d'autres fichiers importent le tableau (`grep -rn "<nom du tableau>" components app` : adapter les importeurs pour appeler la fonction). Ne pas créer d'objets recréés au point de déclencher une boucle d'effets : si le tableau est dépendance d'un `useEffect`/`useMemo`, calculer une clé stable ou conserver la liste hors des dépendances (le dire dans le rapport).

- [ ] **Step 2: Vérifier**

Run : `npx eslint <fichiers>`, `npm run typecheck`, `npm run i18n:manifest`, `npm run lint`, `npm run ui:hydration-check`. Vérifier par `git diff` que le nombre d'éléments de chaque menu et leurs `key` sont inchangés.

- [ ] **Step 3: Commit**

```bash
git add components lib/i18n/manifest.json
git commit -m "fix(i18n): libellés de menus évalués au rendu pour suivre la langue"
```

---

### Task 7: Pages serveur et composants partagés

**Files (modifier) :** `app/not-found.tsx`, `app/loading.tsx`, `app/dashboard/billing/page.tsx`, `app/dashboard/layout.tsx`, `app/dashboard/error.tsx` (client), `app/dashboard/*/loading.tsx`, `components/dashboard-nav.tsx`, `components/ui/skeleton.tsx`, `components/ui/inline-notice.tsx`.

**Interfaces:**
- Consumes : `resolveLocaleFromAcceptLanguage` (`lib/i18n/request-locale.ts`), `translateForLocale`/`translateTemplateForLocale` (`lib/i18n/translate.ts`), `primeOverlay` (`lib/i18n/overlay-server.ts`) — modèle exact : `app/s/[slug]/page.tsx`.

- [ ] **Step 1: Composants serveur**

Pour chaque composant serveur de la liste (`not-found`, `loading`, `billing/page`, `dashboard/layout`, `*/loading`, `dashboard-nav`) : résoudre `const locale = resolveLocaleFromAcceptLanguage((await headers()).get("accept-language"));`, `await primeOverlay(locale);`, `const t = (text: string) => translateForLocale(text, locale);`, puis envelopper les textes (`app/not-found.tsx` : « Erreur 404 », « Page introuvable », « Cette page n’existe pas… », « Retour à l’accueil », « Connexion » ; `app/dashboard/layout.tsx:133` « Visite guidée MusikPro », « Compte MusikPro » ; `app/dashboard/billing/page.tsx:34` `<th>Référence</th>` et les autres en-têtes ; `aria-label="Chargement"` et « Chargement… »). Le composant doit être `async` (vérifier qu'il l'est ou que `headers()` est déjà utilisé ; pour `loading.tsx`, qui est synchrone, **ne pas** le rendre `async` si Next l'interdit : dans ce cas utiliser un texte neutre sans mot (`aria-busy`) ou garder le texte et le signaler au rapport). La métadonnée de `not-found` passe par `generateMetadata` localisé comme dans `app/s/[slug]/page.tsx`. S'assurer que la page ne change pas de mode statique/dynamique (elle utilise déjà `headers()` ou `force-dynamic` : l'exploration indique que `not-found` est `force-dynamic`).

- [ ] **Step 2: Composants clients et partagés**

`app/dashboard/error.tsx` (client) : `t("…")` classique. `components/ui/skeleton.tsx` et `components/ui/inline-notice.tsx`, utilisés des deux côtés : passer le libellé en **paramètre** (`label`/`closeLabel`) avec le français actuel comme valeur par défaut, et faire appeler `t()` par les composants appelants clients (ou `translateForLocale` par les appelants serveur) ; `grep -rn "Skeleton\|InlineNotice" components app` pour adapter les appelants **qui affichent ce libellé**. Aucun changement de rendu en français.

- [ ] **Step 3: Vérifier**

Run : `npx eslint <fichiers>` (0 avertissement), `npm run typecheck && npm run i18n:manifest && npm run lint && npm run ui:hydration-check`. Vérifier `npm run build` n'est pas nécessaire ici ; vérifier à la main qu'aucun de ces fichiers n'accède à `document`/`window`.

- [ ] **Step 4: Commit**

```bash
git add app components lib/i18n/manifest.json
git commit -m "feat(i18n): pages serveur et composants partagés traduisibles selon la langue du navigateur"
```

---

### Task 8: Voyant « textes non traduits » dans l'admin

**Files:**
- Create: `lib/i18n/untranslated.ts`, `lib/i18n/untranslated-server.ts`, `tests/i18n-untranslated.test.ts`
- Modify: `app/admin/languages/page.tsx`

**Interfaces:**
- Produces : `summarizeUntranslated(input: { manifest: readonly string[]; json: Record<"en"|"es"|"pt", Record<string,string>>; stored: Record<"en"|"es"|"pt", ReadonlySet<string>> }): { perLocale: Record<"en"|"es"|"pt", number>; total: number }` (pur, utilise `missingUiTexts`) ; `getUntranslatedSummary(): Promise<{ perLocale: …; total: number }>` (serveur : lit `uiTranslations` par langue et le manifeste/JSON, appelle `summarizeUntranslated`).

- [ ] **Step 1: Test (échoue)**

`tests/i18n-untranslated.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { summarizeUntranslated } from "@/lib/i18n/untranslated";

const none = { en: new Set<string>(), es: new Set<string>(), pt: new Set<string>() };

describe("summarizeUntranslated", () => {
  it("counts per locale the manifest texts absent from both the JSON and the table", () => {
    const result = summarizeUntranslated({
      manifest: ["A", "B", "C"],
      json: { en: { A: "a" }, es: { A: "a", B: "b" }, pt: {} },
      stored: { en: new Set(["B"]), es: new Set(), pt: new Set(["C"]) },
    });
    expect(result.perLocale).toEqual({ en: 1, es: 1, pt: 2 });
    expect(result.total).toBe(4);
  });

  it("is zero when everything is translated", () => {
    const result = summarizeUntranslated({
      manifest: ["A"],
      json: { en: { A: "a" }, es: { A: "a" }, pt: { A: "a" } },
      stored: none,
    });
    expect(result).toEqual({ perLocale: { en: 0, es: 0, pt: 0 }, total: 0 });
  });
});
```

Run `npx vitest run tests/i18n-untranslated.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implémenter**

`lib/i18n/untranslated.ts` :

```ts
import { TRANSLATION_LOCALES, missingUiTexts, type TranslationLocale } from "./incremental";

export type UntranslatedSummary = { perLocale: Record<TranslationLocale, number>; total: number };

export function summarizeUntranslated(input: {
  manifest: readonly string[];
  json: Record<TranslationLocale, Record<string, string>>;
  stored: Record<TranslationLocale, ReadonlySet<string>>;
}): UntranslatedSummary {
  const perLocale = Object.fromEntries(
    TRANSLATION_LOCALES.map((locale) => [locale, missingUiTexts(input.manifest, input.json[locale], input.stored[locale]).length]),
  ) as Record<TranslationLocale, number>;
  return { perLocale, total: TRANSLATION_LOCALES.reduce((sum, locale) => sum + perLocale[locale], 0) };
}
```

`lib/i18n/untranslated-server.ts` (`import "server-only"`) : charge, comme `lib/i18n/refresh-translations.ts` le fait, `stored` par langue depuis `uiTranslations` avec `getServiceDb()`, importe `en/es/pt` JSON et `manifest.json`, retourne `summarizeUntranslated(...)`. Réutiliser le code de chargement de `stored` de `refresh-translations.ts` en l'extrayant dans une fonction partagée si c'est trivial (sinon dupliquer ces 6 lignes et le dire).

- [ ] **Step 3: Afficher dans la carte**

Dans `app/admin/languages/page.tsx` (composant serveur) : `const untranslated = await getUntranslatedSummary();` ; dans la carte « Traductions du catalogue », au-dessus du bouton, afficher une ligne d'état utilisant les classes existantes (`admin-language-detection-hint` ou le badge/voyant déjà utilisé sur la page) : orange « {total} textes d'interface non traduits ({en} en anglais, {es} en espagnol, {pt} en portugais). » (singulier « 1 texte »), vert « Tous les textes de l'interface sont traduits. » si `total === 0`. Compléter le texte de la carte : le bouton traduit aussi les nouveaux textes ajoutés au code. Pas de nouveau CSS global : réutiliser les classes admin partagées (règles du projet).

- [ ] **Step 4: Vérifier et commiter**

Run : `npx vitest run tests/i18n-untranslated.test.ts`, `npm run typecheck`, `npm run lint`, `npm run security:baseline`, `npm run features:check`.

```bash
git add lib/i18n/untranslated.ts lib/i18n/untranslated-server.ts tests/i18n-untranslated.test.ts app/admin/languages/page.tsx
git commit -m "feat(i18n): voyant du nombre de textes d'interface non traduits dans l'admin"
```

---

### Task 9: Balayage final, règle en erreur, documentation, vérification navigateur

**Files:**
- Modify: `eslint.config.mjs` (niveau `"error"`), tout fichier du périmètre encore signalé, `CLAUDE.md`

- [ ] **Step 1: Balayage**

Run `npx eslint app components -f unix | grep no-restricted-syntax`. Pour chaque site restant : l'envelopper (mêmes règles), ou, si c'est une valeur canonique légitime, ajouter `// eslint-disable-next-line no-restricted-syntax -- valeur canonique stockée en français` (raison obligatoire). Faire aussi un balayage **manuel** des textes sans accent que la règle ne voit pas : `grep -rnE ">\s*(Chargement|Retour|Suivant|Annuler|Valider|Fermer|Envoyer|Supprimer|Modifier|Ajouter|Télécharger|Partager)[^<{]*<" app components` et corriger les cas du périmètre.

- [ ] **Step 2: Règle en erreur**

Dans `eslint.config.mjs`, passer `"warn"` à `"error"`. Run `npm run lint` — Expected : 0 erreur. Mettre à jour `i18n/…` commentaire d'en-tête du module si besoin.

- [ ] **Step 3: Documentation**

`CLAUDE.md`, section « Règle obligatoire — traduction multilingue », point 1 : préciser que (a) `npm run i18n:manifest` régénère `lib/i18n/manifest.json` (obligatoire après ajout d'un `t()` ; `i18n:check` échoue s'il est périmé), (b) `npm run i18n:sync` reste optionnel en local, (c) les textes absents des JSON se traduisent depuis `/admin/languages` (voyant « textes non traduits »), (d) un texte français accentué écrit en dur dans les composants du périmètre client échoue au lint (règle `eslint/i18n-client-text.mjs` ; désactivation ligne par ligne avec raison pour les valeurs canoniques), (e) `t()` ne doit jamais s'évaluer au chargement d'un module. Édition minimale, style existant.

- [ ] **Step 4: Contrôles complets**

Run : `npm run typecheck && npm run lint && npm run test && npm run i18n:manifest && npm run i18n:check && npm run security:baseline && npm run validation:zod-check && npm run features:check && npm run refactor:check && npm run security:csp-check && npm run ui:hydration-check && npm run kit:integrity` — Expected : tout passe (échec connu et sans lien : `kit:audit` « Imports locaux » à cause de `.next/types` absent).

- [ ] **Step 5: Vérification navigateur (base de développement)**

Serveur de dev, session admin déjà connectée (si impossible d'obtenir une session authentifiée, ne pas se connecter avec des identifiants : s'arrêter et le consigner). 1) `/admin/languages` : le voyant annonce « N textes d'interface non traduits » ; cliquer sur « Actualiser les traductions » jusqu'à la fin ; le voyant passe au vert. 2) `/dashboard` en anglais (`/en/dashboard`) : barre latérale, menu mobile (largeur téléphone), page d'aide (FAQ), centre de notifications, pluriels de crédits, messages `notify` (ex. action de démonstration) affichés en anglais ; en français rien ne change ; aucune erreur #418 en console (un avertissement `bis_skin_checked` d'extension navigateur est sans lien). 3) Une page `/s/…` et la 404 (`/page-inexistante`) avec `Accept-Language` anglais si possible.

- [ ] **Step 6: Commit**

```bash
git add -A -- eslint.config.mjs app components lib CLAUDE.md
git commit -m "feat(i18n): garde ESLint en erreur, balayage final et règle documentée"
```

(Ne pas inclure `next-env.d.ts`.)

---

## Self-Review

**Couverture de la spec :**
- §1 enveloppement (libellés, notify, valeurs, pluriels, listes de données, menus, clés) : tâches 3, 4, 5, 6.
- §2 `notify` / test « démonstration » : tâche 3.
- §3 pages serveur : tâche 7.
- §4 garde : scanner (tâche 2), ESLint (tâches 1 et 9), `i18n:check` non bloquant (tâche 2).
- §5 voyant admin : tâche 8.
- §6 livraison (sans migration, un clic) : notée en contraintes ; vérification navigateur tâche 9.
- Tests : tâches 1 (règle), 8 (comptage), contrôles du kit (tâche 9).
- Hors périmètre respecté dans les contraintes globales.

**Placeholders :** les tâches d'enveloppement sont guidées par la règle ESLint (liste objective de ce qui reste) et par des listes de fichiers/lignes issues de l'exploration, car les ~200 textes ne peuvent pas être énumérés ici sans copier le code des composants ; chaque tâche exige zéro avertissement sur ses fichiers et la relecture du `git diff` pour garantir l'identité du français.

**Cohérence des types :** `notify(message, { demoOnly })`, `i18nClientFiles`, `i18nClientTextSelectors`, `summarizeUntranslated`, `getUntranslatedSummary`, `npm run i18n:manifest` sont définis dans la tâche productrice et réutilisés avec les mêmes noms.
