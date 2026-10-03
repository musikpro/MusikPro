# Authentification, erreurs d'API, e-mails et titres de pages traduisibles — Plan d'implémentation

> **Pour les agents d'exécution :** SOUS-COMPÉTENCE REQUISE : utiliser superpowers:subagent-driven-development (recommandé) ou superpowers:executing-plans pour exécuter ce plan tâche par tâche. Les étapes utilisent la syntaxe à cases (`- [ ]`).

**Objectif :** rendre traduisibles (via le bouton « Actualiser les traductions ») les écrans d'authentification, les erreurs d'API affichées au client, les e-mails de compte, les titres de pages et les messages de validation, grâce à un résolveur de langue unique appliqué par le layout racine.

**Architecture :** un résolveur pur `pickPageLocale` (préfixe d'URL, cookie, `Accept-Language`, `fr`; `/admin` forcé en `fr`) alimente `<html lang>` dans le layout racine. `translate()` côté client reste synchrone mais renvoie le français jusqu'à ce qu'un indicateur « hydratation terminée » soit posé (pas d'erreur React #418). Les textes des composants passent par `t()`/`translateTemplate` ; les textes qui vivent hors des composants (messages de validation, messages d'API, codes d'erreur) sont marqués par `i18nKey("…")` (fonction identité que le scanner extrait) et traduits à l'affichage.

**Pile technique :** Next.js 16 (App Router, Server Components), better-auth, Zod 4, Resend, Vitest, ESLint flat config.

**Spec :** `docs/superpowers/specs/2026-10-03-i18n-auth-api-emails-design.md` (le plan en découle ; la spec fait foi).

## Contraintes globales

Chaque tâche les respecte implicitement.

- **Aucun changement visible en français** : le texte français de chaque `t()` / `translateTemplate` / `i18nKey` est IDENTIQUE au caractère près au texte actuel (apostrophes ’ vs ', « », —, …, espaces insécables). La clé du dictionnaire est la chaîne française ; une retouche perdrait la traduction existante. Vérifier avec `git diff` : chaque chaîne retirée doit se retrouver à l'identique parmi les ajouts (hors `${x}` → `{x}`).
- **Mécanismes autorisés uniquement** : `t("…")` (littéral), `translateTemplate("… {param} …", { param })` pour les valeurs dynamiques (jamais d'interpolation avant l'appel, jamais de clé construite avec `${}`), et `i18nKey("…")` pour marquer une chaîne dont la traduction se fait ailleurs. Pas de quatrième mécanisme.
- **Jamais traduire les valeurs canoniques** (valeurs envoyées au serveur, clés d'état, catégories de support, noms de champs, titres de chansons, contenu saisi par l'utilisateur).
- **`t()` / `translateTemplate` jamais évalués au chargement d'un module** (constantes de module) : uniquement dans une fonction ou un composant. `i18nKey(…)` en constante de module est permis (il ne traduit rien).
- **Après chaque tâche qui ajoute des textes** : `npm run i18n:manifest` et commit de `lib/i18n/manifest.json`. Ne PAS lancer `npm run i18n:sync` (il appelle l'IA et modifie les dictionnaires ; les traductions viennent du bouton de l'admin).
- **L'admin reste en français** : aucun texte d'admin enveloppé dans `t()`.
- **Contrats d'API inchangés** : les routes renvoient le même texte français, sauf les messages anglais de paiement/coupon (tâche 5).
- **Contrôles de fin de tâche** (ceux qui s'appliquent) : `npm run typecheck`, `npm run lint` (0 erreur), `npm run test`, `npm run i18n:check`, `npm run ui:hydration-check`, `npm run security:baseline`, `npm run validation:zod-check`, `npm run features:check`. Échec connu sans rapport : `kit:audit` « Imports locaux » (dossier `.next/types` absent).
- Messages de commit en français, terminés par la ligne `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Ne jamais committer `next-env.d.ts`.

## Points de vigilance de la revue (Review Focus)

1. **Hydratation** : une page rendue en `/en/…` ne doit produire ni erreur React #418 ni texte anglais avant la fin de l'hydratation ; `<html lang>` est correct dès le HTML serveur.
2. **`/admin` reste en français** ; la landing, `/s/…` et le dashboard gardent leur langue (déjà résolue de leur côté).
3. **Valeur canonique traduite par erreur** (catégories de support, valeurs d'état, clés) : à vérifier explicitement.
4. **Code d'erreur inconnu / texte inconnu** : retombe sur le français (ou un message générique français), jamais sur de l'anglais brut ni une erreur.
5. **E-mail** : langue de la requête ; sans requête, français ; jamais d'échec d'envoi à cause de la traduction.
6. **Clé `constructor` / `__proto__`** : aucun dictionnaire ne doit retourner une fonction héritée du prototype.

## Structure des fichiers

Créés :
- `lib/i18n/page-locale.ts` — résolveur pur `pickPageLocale`, `readCookieValue`.
- `lib/i18n/page-locale-server.ts` — `resolvePageLocale()` (lit les en-têtes et le cookie).
- `components/i18n-bootstrap.tsx` — composant client monté dans le layout racine.
- `lib/i18n/key.ts` — `i18nKey` (identité).
- `lib/validation/translate-issue.ts` — `translateIssue`.
- `lib/api/error-messages.ts` — liste des messages d'API + `translateApiMessage`.
- `lib/auth/auth-error-messages.ts` — `authErrorMessage(code, fallback)`.
- `lib/email/auth-email-text.ts` — textes des e-mails de compte par langue.
- Tests : `tests/page-locale.test.ts`, `tests/i18n-ready-gate.test.ts`, `tests/translate-issue.test.ts`, `tests/api-error-messages.test.ts`, `tests/auth-error-messages.test.ts`, `tests/auth-email-text.test.ts`.

Modifiés (principaux) : `app/layout.tsx`, `lib/i18n/overlay.ts`, `lib/i18n/translate.ts`, `scripts/i18n-sync.mts`, `eslint/i18n-client-text.mjs`, `lib/api/client.ts`, `lib/validation/{auth,musikpro-demo,coupons}.ts`, composants d'authentification, `lib/auth/index.ts`, `lib/email/index.ts`, `lib/seo/metadata.ts`, `app/(auth)/**`, `app/terms`, `app/privacy`, `app/opengraph-image.tsx`, `CLAUDE.md`.

Ordre d'exécution : 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11.

---

### Task 1: résolveur de langue pur et serveur

**Fichiers :**
- Créer : `lib/i18n/page-locale.ts`, `lib/i18n/page-locale-server.ts`, `tests/page-locale.test.ts`

**Interfaces :**
- Consomme : `resolveLocaleFromAcceptLanguage(acceptLanguage: string | null): Locale` (`lib/i18n/request-locale.ts`) ; `LOCALE_HEADER`, `REQUEST_PATH_HEADER` (`lib/languages/locale-path.ts`) ; `LANDING_LANGUAGE_COOKIE` (`lib/languages/landing-language-cookie.ts`) ; type `Locale` (`lib/i18n/translate.ts`).
- Produit : `pickPageLocale(input): Locale`, `readCookieValue(cookieHeader, name): string | undefined`, `isSupportedLocale(value): value is Locale`, `resolvePageLocale(): Promise<Locale>` — consommés par les tâches 2, 9 et 10.

- [ ] **Étape 1 : écrire les tests**

```ts
// tests/page-locale.test.ts
import { describe, expect, it } from "vitest";
import { isSupportedLocale, pickPageLocale, readCookieValue } from "@/lib/i18n/page-locale";

describe("pickPageLocale", () => {
  it("le préfixe d'URL gagne sur le cookie et Accept-Language", () => {
    expect(pickPageLocale({ urlCode: "en", cookie: "es", acceptLanguage: "pt-BR" })).toBe("en");
  });
  it("un préfixe d'URL non supporté donne fr (langue ajoutée par l'admin)", () => {
    expect(pickPageLocale({ urlCode: "de", cookie: "es", acceptLanguage: "pt" })).toBe("fr");
  });
  it("sans préfixe, le cookie supporté gagne sur Accept-Language", () => {
    expect(pickPageLocale({ cookie: "es", acceptLanguage: "en-US" })).toBe("es");
  });
  it("un cookie inconnu est ignoré et Accept-Language prend le relais", () => {
    expect(pickPageLocale({ cookie: "de", acceptLanguage: "pt-BR,pt;q=0.9" })).toBe("pt");
  });
  it("sans rien, retombe sur fr", () => {
    expect(pickPageLocale({})).toBe("fr");
    expect(pickPageLocale({ acceptLanguage: "ja" })).toBe("fr");
  });
  it("force fr sur /admin, même avec un cookie anglais", () => {
    expect(pickPageLocale({ pathname: "/admin/languages", cookie: "en", acceptLanguage: "en" })).toBe("fr");
    expect(pickPageLocale({ pathname: "/admin", cookie: "en" })).toBe("fr");
    expect(pickPageLocale({ pathname: "/admin?x=1", cookie: "en" })).toBe("fr");
  });
  it("ne confond pas /administration ou /adminx avec /admin", () => {
    expect(pickPageLocale({ pathname: "/administration", cookie: "en" })).toBe("en");
  });
  it("ne prend jamais une clé héritée du prototype pour une langue", () => {
    expect(isSupportedLocale("constructor")).toBe(false);
    expect(isSupportedLocale("__proto__")).toBe(false);
    expect(pickPageLocale({ urlCode: "constructor" })).toBe("fr");
    expect(pickPageLocale({ cookie: "toString", acceptLanguage: "es" })).toBe("es");
  });
});

describe("readCookieValue", () => {
  it("lit une valeur parmi plusieurs cookies", () => {
    expect(readCookieValue("a=1; musikpro_lang=en; b=2", "musikpro_lang")).toBe("en");
  });
  it("renvoie undefined si absent ou en-tête vide", () => {
    expect(readCookieValue("a=1", "musikpro_lang")).toBeUndefined();
    expect(readCookieValue(null, "musikpro_lang")).toBeUndefined();
    expect(readCookieValue("", "musikpro_lang")).toBeUndefined();
  });
  it("ne se laisse pas tromper par un nom qui se termine pareil", () => {
    expect(readCookieValue("x_musikpro_lang=fr", "musikpro_lang")).toBeUndefined();
  });
});
```

- [ ] **Étape 2 : lancer les tests, vérifier l'échec** — `npx vitest run tests/page-locale.test.ts` → échec (module absent).

- [ ] **Étape 3 : implémenter**

```ts
// lib/i18n/page-locale.ts
import { resolveLocaleFromAcceptLanguage } from "./request-locale";
import type { Locale } from "./translate";

const LOCALES: readonly Locale[] = ["fr", "en", "es", "pt"];

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && LOCALES.some((locale) => locale === value);
}

/** Valeur d'un cookie dans un en-tête `Cookie` brut (utile hors Server Component, ex. callback e-mail). */
export function readCookieValue(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

/**
 * Langue d'une page : préfixe d'URL (supporté, sinon fr) > cookie `musikpro_lang` > Accept-Language > fr.
 * `/admin` est toujours en français (l'admin est hors du périmètre de traduction).
 * La détection par IP n'est PAS appelée ici (appel réseau à chaque page) : elle reste sur la landing.
 */
export function pickPageLocale(input: {
  pathname?: string | null;
  urlCode?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (input.pathname && /^\/admin(?:[/?#]|$)/.test(input.pathname)) return "fr";
  if (input.urlCode) return isSupportedLocale(input.urlCode) ? input.urlCode : "fr";
  if (isSupportedLocale(input.cookie)) return input.cookie;
  return resolveLocaleFromAcceptLanguage(input.acceptLanguage ?? null);
}
```

```ts
// lib/i18n/page-locale-server.ts
import "server-only";
import { cookies, headers } from "next/headers";
import { LANDING_LANGUAGE_COOKIE } from "@/lib/languages/landing-language-cookie";
import { LOCALE_HEADER, REQUEST_PATH_HEADER } from "@/lib/languages/locale-path";
import { pickPageLocale } from "./page-locale";
import type { Locale } from "./translate";

/** Langue de la page en cours, lue depuis la requête (même règle partout : layout racine, métadonnées, e-mails…). */
export async function resolvePageLocale(): Promise<Locale> {
  const [requestHeaders, cookieStore] = await Promise.all([headers(), cookies()]);
  return pickPageLocale({
    pathname: requestHeaders.get(REQUEST_PATH_HEADER),
    urlCode: requestHeaders.get(LOCALE_HEADER),
    cookie: cookieStore.get(LANDING_LANGUAGE_COOKIE)?.value,
    acceptLanguage: requestHeaders.get("accept-language"),
  });
}
```

Si `resolveLocaleFromAcceptLanguage` n'est pas à l'épreuve d'une valeur inconnue (ex. `"ja"`), le test le révélera : ne pas affaiblir le test, corriger l'implémentation.

- [ ] **Étape 4 : tests au vert** — `npx vitest run tests/page-locale.test.ts` ; `npm run typecheck`.
- [ ] **Étape 5 : commit** — `feat(i18n): résolveur de langue unique pour toutes les pages`.

---

### Task 2: indicateur d'hydratation, bootstrap client et layout racine

**Fichiers :**
- Modifier : `lib/i18n/overlay.ts`, `lib/i18n/translate.ts`, `app/layout.tsx`
- Créer : `components/i18n-bootstrap.tsx`, `tests/i18n-ready-gate.test.ts`
- Adapter si nécessaire : les tests existants qui simulent `document.documentElement.lang` (chercher `documentElement` dans `tests/`)

**Interfaces :**
- Consomme : `resolvePageLocale()` (tâche 1), `useI18nOverlay()` (`lib/i18n/use-overlay.ts`), `primeOverlay(locale)` (`lib/i18n/overlay-server.ts`).
- Produit : `isI18nReady(): boolean`, `markI18nReady(): void`, `resetI18nReadyForTests(): void` ; `translate`, `translateTemplate`, `localizeField` (document) renvoient le français tant que `isI18nReady()` est faux ; composant `I18nBootstrap`.

Contexte : côté serveur `t()` rend du français (pas de `document`). Si le client lisait tout de suite `<html lang="en">`, son premier rendu serait anglais, différent du HTML serveur (erreur #418). Le commentaire de `components/banani/DemoProvider.tsx` (deux `requestAnimationFrame`) explique le même risque : lire la langue après le premier rendu peint.

- [ ] **Étape 1 : écrire les tests**

```ts
// tests/i18n-ready-gate.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isI18nReady,
  markI18nReady,
  resetI18nReadyForTests,
  resetOverlayForTests,
  setOverlay,
  getOverlayVersion,
} from "@/lib/i18n/overlay";
import { localizeField, translate, translateTemplate } from "@/lib/i18n/translate";

function fakeDocument(lang: string) {
  (globalThis as unknown as { document: unknown }).document = { documentElement: { lang } };
}

describe("indicateur d'hydratation", () => {
  beforeEach(() => {
    resetOverlayForTests();
    resetI18nReadyForTests();
    fakeDocument("en");
  });
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("renvoie le français tant que l'hydratation n'est pas terminée, même si <html lang> est en", () => {
    setOverlay("en", { "Se connecter": "Sign in" });
    expect(translate("Se connecter")).toBe("Se connecter");
    expect(translateTemplate("Bonjour {name}", { name: "Awa" })).toBe("Bonjour Awa");
    expect(localizeField("Anniversaire", { en: { name: "Birthday" } }, "name")).toBe("Anniversaire");
  });

  it("traduit une fois l'indicateur posé", () => {
    setOverlay("en", { "Se connecter": "Sign in" });
    markI18nReady();
    expect(isI18nReady()).toBe(true);
    expect(translate("Se connecter")).toBe("Sign in");
    expect(localizeField("Anniversaire", { en: { name: "Birthday" } }, "name")).toBe("Birthday");
  });

  it("markI18nReady incrémente la version une seule fois (déclenche le re-rendu des abonnés)", () => {
    const before = getOverlayVersion();
    markI18nReady();
    markI18nReady();
    expect(getOverlayVersion()).toBe(before + 1);
  });

  it("côté serveur (sans document), reste en français", () => {
    delete (globalThis as { document?: unknown }).document;
    markI18nReady();
    expect(translate("Se connecter")).toBe("Se connecter");
  });
});
```

- [ ] **Étape 2 : tests rouges** — `npx vitest run tests/i18n-ready-gate.test.ts`.

- [ ] **Étape 3 : implémenter**

`lib/i18n/overlay.ts` (ajouter après `let version = 0;`) :

```ts
let ready = false;

/** Vrai quand l'hydratation est terminée côté client : avant, translate() reste en français (HTML serveur). */
export function isI18nReady(): boolean {
  return ready;
}

/** Pose l'indicateur et notifie les abonnés (re-rendu traduit). Idempotent. */
export function markI18nReady(): void {
  if (ready) return;
  ready = true;
  version += 1;
  for (const listener of listeners) listener();
}

export function resetI18nReadyForTests(): void {
  ready = false;
}
```

`lib/i18n/translate.ts` : importer `isI18nReady` depuis `./overlay` ; dans `translate`, `translateTemplate` et `localizeField`, remplacer la condition `typeof document === "undefined"` par `typeof document === "undefined" || !isI18nReady()` (mêmes valeurs de retour qu'avant pour le cas « français »). Ne pas toucher aux fonctions `…ForLocale` (serveur, locale explicite).

`components/i18n-bootstrap.tsx` :

```tsx
"use client";

import { useEffect } from "react";
import { markI18nReady } from "@/lib/i18n/overlay";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

/**
 * Monté une fois dans le layout racine. Charge les traductions de la base pour la langue de <html lang>
 * et, une fois la peinture suivante passée (deux requestAnimationFrame, comme DemoProvider), autorise
 * translate() à lire la langue : le premier rendu client reste identique au HTML serveur (pas d'erreur #418).
 */
export function I18nBootstrap() {
  useI18nOverlay();
  useEffect(() => {
    let second: number | null = null;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => markI18nReady());
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second !== null) window.cancelAnimationFrame(second);
    };
  }, []);
  return null;
}
```

`app/layout.tsx` : dans `RootLayout`, ajouter

```tsx
const locale = await resolvePageLocale();
await primeOverlay(locale);
```

(`primeOverlay` avale ses erreurs ; il ne fait rien pour `fr`), remplacer `<html lang={siteConfig.language}>` par `<html lang={locale}>` et placer `<I18nBootstrap />` juste après `<ServiceWorkerRegister />`. Ne rien changer d'autre.

- [ ] **Étape 3 bis : adapter les tests existants** qui simulent `document.documentElement.lang` : y appeler `markI18nReady()` (et `resetI18nReadyForTests()` dans leur nettoyage) ; ne jamais supprimer ni affaiblir une assertion.

- [ ] **Étape 4 : contrôles** — `npx vitest run tests/i18n-ready-gate.test.ts` puis `npm run typecheck`, `npm run lint`, `npm run test`, `npm run ui:hydration-check`.

- [ ] **Étape 5 : vérification navigateur (obligatoire pour cette tâche)** — serveur de développement sur `http://localhost:3000` : ouvrir `/en/dashboard` (session déjà connectée si disponible, sinon `/login` après avoir posé le cookie `musikpro_lang=en` par `document.cookie` dans la console de la page) ; vérifier : `<html lang>` vaut `en` dans le HTML initial (`view-source` ou `fetch` du document), aucun message d'hydratation dans la console (un avertissement `bis_skin_checked` venant d'une extension du navigateur est sans rapport), les textes du dashboard passent en anglais après un court instant, `/admin/…` garde `<html lang="fr">` même avec le cookie `en`. Si aucune session n'est disponible, ne pas se connecter avec des identifiants : le dire dans le rapport.

- [ ] **Étape 6 : commit** — `feat(i18n): <html lang> résolu par le serveur et indicateur d'hydratation côté client`.

---

### Task 3: `i18nKey`, scanner et règle ESLint élargis (avertissement)

**Fichiers :**
- Créer : `lib/i18n/key.ts`
- Modifier : `scripts/i18n-sync.mts`, `eslint/i18n-client-text.mjs`, `tests/eslint-i18n-client-text.test.ts` (seulement pour ajouter un cas), `lib/i18n/manifest.json`

**Interfaces :**
- Produit : `i18nKey(text: string): string` (identité) ; `SCAN_DIRS` élargi ; `i18nClientFiles` élargi (niveau `error` dans la config actuelle : voir étape 3).

- [ ] **Étape 1 : `lib/i18n/key.ts`**

```ts
/**
 * Marque une chaîne française comme clé de traduction SANS la traduire : le scanner (scripts/i18n-sync.mts)
 * l'ajoute au manifeste ; la traduction se fait à l'affichage (translate/translateIssue/translateApiMessage).
 * Sert aux textes qui vivent hors des composants (messages Zod, messages d'API, codes d'erreur).
 */
export function i18nKey(text: string): string {
  return text;
}
```

- [ ] **Étape 2 : scanner** — dans `scripts/i18n-sync.mts`, étendre `T_CALL` pour reconnaître aussi `i18nKey` : `/\b(?:t|translateTemplate|i18nKey)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g` (même traitement des échappements et du garde `${`). Ajouter à `SCAN_DIRS_WANTED` : `"app/(auth)"`, `"components/auth"`, `"components/auth-form.tsx"`, `"components/forgot-password-form.tsx"`, `"components/reset-password-form.tsx"`, `"components/two-factor-challenge.tsx"`, `"components/two-factor-setup.tsx"`, `"lib/api/error-messages.ts"`, `"lib/auth/auth-error-messages.ts"`, `"lib/auth/oauth-error.ts"`, `"lib/email/auth-email-text.ts"`, `"lib/seo/metadata.ts"`, `"lib/validation"`, `"app/terms"`, `"app/privacy"`, `"app/opengraph-image.tsx"`, `"components/i18n-bootstrap.tsx"`. Les chemins qui n'existent pas encore (créés plus loin dans le plan) font échouer `--check` : n'ajouter dans cette tâche QUE ceux qui existent déjà, et ajouter les autres dans la tâche qui les crée. Mettre à jour le commentaire d'en-tête du fichier (`i18nKey`).

- [ ] **Étape 3 : ESLint** — dans `eslint/i18n-client-text.mjs`, ajouter à `i18nClientFiles` : `"app/(auth)/**/*.{ts,tsx}"`, `"components/auth/**/*.{ts,tsx}"`, `"components/auth-form.tsx"`, `"components/forgot-password-form.tsx"`, `"components/reset-password-form.tsx"`, `"components/two-factor-challenge.tsx"`, `"components/two-factor-setup.tsx"`. La config actuelle applique ces fichiers au niveau `error`. Pour ne pas casser le dépôt tant que les tâches 7 et 8 ne sont pas faites, déclarer dans `eslint.config.mjs` un bloc séparé au niveau `"warn"` pour ces fichiers d'authentification (liste exportée à part, ex. `i18nAuthFiles`), à basculer en `error` à la tâche 11. Ajouter un cas au test `tests/eslint-i18n-client-text.test.ts` qui vérifie que le sélecteur signale un texte accentué dans un JSX d'un fichier d'authentification (le test existant montre la forme).

- [ ] **Étape 4 : mesurer** — `npx eslint "app/(auth)" components/auth components/auth-form.tsx components/forgot-password-form.tsx components/reset-password-form.tsx components/two-factor-challenge.tsx components/two-factor-setup.tsx -f json` : enregistrer le nombre d'avertissements par fichier dans `.superpowers/sdd/2026-10-03-i18n-auth-api-emails/baseline-warnings.txt` (non committé) et dans le rapport.
- [ ] **Étape 5 : contrôles** — `npm run i18n:manifest` (le manifeste ne doit pas changer : aucun nouvel appel), `npm run i18n:check`, `npm run lint` (0 erreur), `npm run typecheck`, `npm run test`.
- [ ] **Étape 6 : commit** — `feat(i18n): i18nKey, scanner et garde ESLint élargis aux écrans d'authentification`.

---

### Task 4: messages de validation Zod traduits à l'affichage

**Fichiers :**
- Créer : `lib/validation/translate-issue.ts`, `tests/translate-issue.test.ts`
- Modifier : `lib/validation/auth.ts`, `lib/validation/musikpro-demo.ts`, `lib/validation/coupons.ts`, `scripts/i18n-sync.mts` (ajouter `lib/validation/translate-issue.ts`, `lib/validation/auth.ts`, `lib/validation/musikpro-demo.ts`, `lib/validation/coupons.ts` à `SCAN_DIRS_WANTED`), les écrans qui affichent `issues[0].message` (voir étape 4), `lib/i18n/manifest.json`

**Interfaces :**
- Consomme : `i18nKey` (tâche 3) ; `translate`, `translateTemplate` (`lib/i18n/translate.ts`).
- Produit : `translateIssue(issue: { message: string }): string` — consommé par les tâches 7 et 8 et par les écrans de `components/banani`.

- [ ] **Étape 1 : tests**

```ts
// tests/translate-issue.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markI18nReady, resetI18nReadyForTests, resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";
import { translateIssue } from "@/lib/validation/translate-issue";

describe("translateIssue", () => {
  beforeEach(() => {
    resetOverlayForTests();
    resetI18nReadyForTests();
    (globalThis as unknown as { document: unknown }).document = { documentElement: { lang: "en" } };
    markI18nReady();
  });
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("traduit un message connu", () => {
    setOverlay("en", { "Indicatif téléphonique invalide.": "Invalid phone prefix." });
    expect(translateIssue({ message: "Indicatif téléphonique invalide." })).toBe("Invalid phone prefix.");
  });
  it("traduit « Maximum N caractères. » avec la valeur", () => {
    setOverlay("en", { "Maximum {max} caractères.": "Maximum {max} characters." });
    expect(translateIssue({ message: "Maximum 500 caractères." })).toBe("Maximum 500 characters.");
  });
  it("laisse un message inconnu (ex. message anglais par défaut de Zod) tel quel", () => {
    expect(translateIssue({ message: "Invalid input" })).toBe("Invalid input");
  });
  it("ne prend jamais une clé héritée du prototype pour une traduction", () => {
    expect(translateIssue({ message: "constructor" })).toBe("constructor");
  });
});
```

- [ ] **Étape 2 : implémenter**

```ts
// lib/validation/translate-issue.ts
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

const MAX_CHARS = /^Maximum (\d+) caractères\.$/;

/**
 * Traduit à l'affichage le message d'une issue Zod. Les messages français des schémas sont marqués par
 * i18nKey(…) (le scanner les met au manifeste) ; ceux avec valeur passent par un modèle.
 */
export function translateIssue(issue: { message: string }): string {
  const max = MAX_CHARS.exec(issue.message);
  if (max) return translateTemplate("Maximum {max} caractères.", { max: max[1] });
  return t(issue.message);
}
```

- [ ] **Étape 3 : marquer les messages des schémas** — dans `lib/validation/musikpro-demo.ts` et `lib/validation/coupons.ts` : chaque message français littéral `message: "…"` / `.min(n, "…")` devient `i18nKey("…")` (texte identique). Les messages avec valeur (`` `Maximum ${N} caractères.` ``) restent des gabarits : ne pas les envelopper (`translateIssue` les reconnaît). Dans `lib/validation/auth.ts` (aucun message personnalisé aujourd'hui, Zod affiche donc son anglais par défaut) : ajouter des messages français explicites, via `i18nKey`, pour les contraintes que l'utilisateur peut rencontrer : e-mail invalide, mot de passe trop court (10 caractères minimum, comme `passwordSchema`), nom trop court/long, code à 6 chiffres. Vérifier d'abord que ces schémas n'alimentent pas une réponse d'API renvoyée telle quelle au client (le rapport d'exploration dit que non) ; sinon, le dire dans le rapport.
- [ ] **Étape 4 : afficher avec `translateIssue`** — repérer les écrans qui affichent un message Zod (`issues[0].message`, `error.issues`, `parsed.error`) : `components/banani/EditLyricsScreen.tsx`, `StepAdditionalParams.tsx`, `StepStory.tsx`, `PaymentScreen.tsx`, `EditProfileScreen.tsx`, `ContactSupportScreen.tsx` et les composants d'authentification (ces derniers dans les tâches 7 et 8, pas ici). Remplacer l'affichage par `translateIssue(issue)`. Aucun changement du contrat ni de la validation.
- [ ] **Étape 5 : contrôles** — `npx vitest run tests/translate-issue.test.ts`, `npm run i18n:manifest` (committer le manifeste), `npm run i18n:check`, `npm run validation:zod-check`, typecheck, lint, test.
- [ ] **Étape 6 : commit** — `feat(i18n): messages de validation traduits à l'affichage (translateIssue)`.

---

### Task 5: messages d'erreur d'API traduits côté client

**Fichiers :**
- Créer : `lib/api/error-messages.ts`, `tests/api-error-messages.test.ts`
- Modifier : `lib/api/client.ts`, `scripts/i18n-sync.mts` (ajouter `lib/api/error-messages.ts`), les routes `app/api/payments/checkout/route.ts` et `app/api/payments/coupons/apply/route.ts` (messages anglais → français), les consommateurs qui lisent `error.message` sans passer par `apiFetch` (`components/banani/ContactSupportScreen.tsx`, `components/two-factor-challenge.tsx` : la partie authentification dans la tâche 8), `lib/i18n/manifest.json`

**Interfaces :**
- Consomme : `i18nKey` (tâche 3) ; `translate`, `translateTemplate`.
- Produit : `translateApiMessage(message: string): string`, `API_ERROR_MESSAGES` (liste de clés) ; `apiFetch` renvoie un `ApiClientError` dont `message` est déjà traduit.

Décision de cadrage : les messages avec valeur (« Il faut {n} crédits… », « …supprimée : {usages} », « …({cause}) ») sont reconnus par expression régulière côté client puis passés à `translateTemplate` : le contrat d'API (le texte français renvoyé) ne change pas.

- [ ] **Étape 1 : inventaire** — lister les messages utilisateur français renvoyés par les routes non admin et non `clients/**` (`grep -rn "error:" app/api`) et par les aides qu'elles appellent (`lib/coupons/server.ts`, `lib/credits`, `lib/payments`…). Écarter les messages internes/techniques (cron, webhooks, santé) et ceux destinés au propriétaire (`lib/ai/errors.ts`). Compter ceux qui ont une valeur interpolée. Noter la liste dans le rapport.

- [ ] **Étape 2 : tests** (compléter la liste de l'étape 1 ; les exemples ci-dessous sont des cas réels connus)

```ts
// tests/api-error-messages.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markI18nReady, resetI18nReadyForTests, resetOverlayForTests, setOverlay } from "@/lib/i18n/overlay";
import { API_ERROR_MESSAGES, translateApiMessage } from "@/lib/api/error-messages";

describe("translateApiMessage", () => {
  beforeEach(() => {
    resetOverlayForTests();
    resetI18nReadyForTests();
    (globalThis as unknown as { document: unknown }).document = { documentElement: { lang: "en" } };
    markI18nReady();
  });
  afterEach(() => {
    delete (globalThis as { document?: unknown }).document;
  });

  it("traduit un message connu", () => {
    setOverlay("en", { "Authentification requise.": "Authentication required." });
    expect(translateApiMessage("Authentification requise.")).toBe("Authentication required.");
  });
  it("traduit « Il faut N crédits… » avec la valeur", () => {
    setOverlay("en", {
      "Il faut {credits} crédits pour lancer une génération musicale.": "You need {credits} credits to start a music generation.",
    });
    expect(translateApiMessage("Il faut 3 crédits pour lancer une génération musicale.")).toBe(
      "You need 3 credits to start a music generation.",
    );
  });
  it("laisse un message inconnu ou « HTTP 500 » tel quel", () => {
    expect(translateApiMessage("HTTP 500")).toBe("HTTP 500");
    expect(translateApiMessage("Something else")).toBe("Something else");
  });
  it("ne prend pas une clé héritée du prototype pour une traduction", () => {
    expect(translateApiMessage("constructor")).toBe("constructor");
  });
  it("la liste ne contient que des chaînes uniques non vides", () => {
    expect(new Set(API_ERROR_MESSAGES).size).toBe(API_ERROR_MESSAGES.length);
    expect(API_ERROR_MESSAGES.every((message) => message.trim().length > 0)).toBe(true);
  });
});
```

- [ ] **Étape 3 : implémenter `lib/api/error-messages.ts`** — structure imposée :

```ts
import { i18nKey } from "@/lib/i18n/key";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

/** Messages français renvoyés par les routes d'API et affichés au client (clés de traduction). */
export const API_ERROR_MESSAGES = [
  i18nKey("Authentification requise."),
  // … un i18nKey("…") par message de l'inventaire, texte IDENTIQUE à celui de la route (apostrophes comprises)
] as const;

/** Messages avec valeur : reconnus par motif, puis reconstruits avec translateTemplate (littéral). */
export function translateApiMessage(message: string): string {
  const credits = /^Il faut (\d+) crédits pour lancer une génération musicale\.$/.exec(message);
  if (credits) return translateTemplate("Il faut {credits} crédits pour lancer une génération musicale.", { credits: credits[1] });
  // … un bloc par message à valeur de l'inventaire (même forme)
  return t(message);
}
```

La clé « Il faut {credits} crédits… » existe déjà (`DemoProvider`). Un motif ne doit jamais être plus large que le message exact (ancres `^…$`).

- [ ] **Étape 4 : `apiFetch`** — dans `lib/api/client.ts`, importer `translateApiMessage` et l'appliquer au message avant `new ApiClientError(response.status, message, code)` ; traduire aussi le repli « Service temporairement indisponible » (ajouter ce texte à `API_ERROR_MESSAGES`). `ApiClientError` et la signature d'`apiFetch` ne changent pas.
- [ ] **Étape 5 : appels directs** — repérer les `fetch(` qui affichent un message d'API sans passer par `apiFetch` (`ContactSupportScreen.tsx`, `two-factor-challenge.tsx`, autres : `grep -rn "error.message\|json.error\|data.error" components`) : y appliquer `translateApiMessage`. Ne pas toucher aux messages d'erreur de la bibliothèque d'authentification (tâche 6).
- [ ] **Étape 6 : messages anglais visibles par le client** — dans `app/api/payments/checkout/route.ts` et `app/api/payments/coupons/apply/route.ts` : remplacer les messages anglais destinés au client (« Authentication required », « Too many requests », « Plan unavailable »…) par leur équivalent français, en réutilisant le texte français déjà employé ailleurs dans les routes quand il existe (ex. « Authentification requise. », « Trop de requêtes. Réessaie dans un instant. »). Chercher d'abord dans `tests/` si une assertion dépend de l'anglais ; si oui, adapter ce test et le signaler. `app/api/clients/**` : ne rien changer.
- [ ] **Étape 7 : contrôles** — tests ci-dessus, `npm run i18n:manifest` (committer), `i18n:check`, `security:baseline`, `validation:zod-check`, `features:check`, typecheck, lint, test.
- [ ] **Étape 8 : commit** — `feat(i18n): messages d'erreur d'API traduits à l'affichage`.

---

### Task 6: codes d'erreur d'authentification et erreurs OAuth

**Fichiers :**
- Créer : `lib/auth/auth-error-messages.ts`, `tests/auth-error-messages.test.ts`
- Modifier : `lib/auth/oauth-error.ts`, `scripts/i18n-sync.mts` (ajouter `lib/auth/auth-error-messages.ts`, `lib/auth/oauth-error.ts`), `lib/i18n/manifest.json`

**Interfaces :**
- Consomme : `translate` (`lib/i18n/translate.ts`).
- Produit : `authErrorMessage(code: string | undefined, fallback: string): string` — consommé par les tâches 7 et 8 ; `getOAuthErrorMessage(code)` inchangé de signature mais traduit.

Contexte : la bibliothèque d'authentification renvoie ses erreurs en anglais avec un `code` stable (`INVALID_EMAIL_OR_PASSWORD`…). Les composants affichent aujourd'hui `r.error.message` (anglais) et n'utilisent le français qu'en repli.

- [ ] **Étape 1 : inventaire des codes** — lire la liste réelle des codes de la version installée de better-auth (`node_modules/better-auth/dist` : chercher `BASE_ERROR_CODES` et ceux des plugins `two-factor`, `captcha`, `admin`, `organization` utilisés) et choisir ceux qu'un client peut rencontrer sur les écrans de connexion, d'inscription, de mot de passe oublié/réinitialisation et de double authentification. Noter dans le rapport la liste retenue et celle écartée.
- [ ] **Étape 2 : tests**

```ts
// tests/auth-error-messages.test.ts
import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth/auth-error-messages";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

describe("authErrorMessage", () => {
  it("renvoie le message français d'un code connu", () => {
    expect(authErrorMessage("INVALID_EMAIL_OR_PASSWORD", "Connexion impossible")).toBe("E-mail ou mot de passe incorrect.");
  });
  it("retombe sur le message de repli pour un code inconnu ou absent", () => {
    expect(authErrorMessage("SOMETHING_NEW", "Connexion impossible")).toBe("Connexion impossible");
    expect(authErrorMessage(undefined, "Connexion impossible")).toBe("Connexion impossible");
  });
  it("ne prend pas une clé héritée du prototype pour un code", () => {
    expect(authErrorMessage("constructor", "Repli")).toBe("Repli");
    expect(authErrorMessage("__proto__", "Repli")).toBe("Repli");
  });
});

describe("getOAuthErrorMessage", () => {
  it("garde les messages français existants", () => {
    expect(getOAuthErrorMessage("state_mismatch")).toBe(
      "Cette tentative de connexion Google a expiré ou a déjà été utilisée. Recommencez la connexion.",
    );
    expect(getOAuthErrorMessage(undefined)).toBe("");
    expect(getOAuthErrorMessage("zzz")).toBe("La connexion n’a pas abouti. Veuillez réessayer.");
  });
});
```

(Le texte « E-mail ou mot de passe incorrect. » est le français retenu pour `INVALID_EMAIL_OR_PASSWORD` ; adapter le test si un texte français existant dans les composants dit autrement : le français doit rester celui que l'écran affiche déjà en repli quand il existe.)

- [ ] **Étape 3 : implémenter** — `lib/auth/auth-error-messages.ts` : fonction avec un `switch (code)` (jamais d'objet indexé par une clé externe) dont chaque branche renvoie `t("…")` (import `translate as t`), `default` → `fallback`. `lib/auth/oauth-error.ts` : conserver la table `oauthErrorMessages` mais la transformer en fonction qui renvoie `t("…")` à l'appel (aucun `t()` au niveau du module) ; mêmes textes ; accès par `switch` ou `Object.hasOwn`.
- [ ] **Étape 4 : contrôles** — `npx vitest run tests/auth-error-messages.test.ts`, `npm run i18n:manifest` (committer), `i18n:check`, typecheck, lint, test.
- [ ] **Étape 5 : commit** — `feat(i18n): codes d'erreur d'authentification et erreurs OAuth traduisibles`.

---

### Task 7: formulaire de connexion/inscription et pages `(auth)`

**Fichiers :**
- Modifier : `components/auth-form.tsx`, `components/auth/auth-ui.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/layout.tsx` (texte hors métadonnées), `app/(auth)/auth/continue/loading.tsx`, `scripts/i18n-sync.mts` (les chemins d'authentification déjà listés en tâche 3 sont scannés), `lib/i18n/manifest.json`

**Interfaces :**
- Consomme : `authErrorMessage` (tâche 6), `translateIssue` (tâche 4), `getOAuthErrorMessage` (tâche 6), `useI18nOverlay` (`lib/i18n/use-overlay.ts`), `resolvePageLocale` (tâche 1), `translateForLocale`, `primeOverlay`.
- Produit : écran de connexion/inscription entièrement traduisible.

Règles : voir « Contraintes globales ». Spécifique :
- `auth-form.tsx` (client, ~42 textes) : tous les libellés, placeholders (« votre@email.com », « Votre nom complet »…), `aria-label`, paragraphes légaux (3 fragments + 2 liens : garder la structure, envelopper chaque fragment séparément), « OU », messages d'erreur d'état. Les erreurs renvoyées par la bibliothèque passent par `authErrorMessage(r.error?.code, t("Connexion impossible"))` (le repli est le français actuel enveloppé). Les messages Zod passent par `translateIssue`. Les valeurs canoniques (noms de champs, `callbackURL`, valeurs envoyées) restent intactes.
- Ajouter l'appel `useI18nOverlay()` en tête du composant (il abonne le composant à l'indicateur d'hydratation et au dictionnaire : sans lui, le composant ne se re-rend pas quand `translate()` devient actif).
- `auth-ui.tsx` (compatible serveur, 2 textes) et les pages serveur : si le composant est rendu côté serveur, `const locale = await resolvePageLocale(); await primeOverlay(locale);` puis `const t = (text: string) => translateForLocale(text, locale);` (alias local nommé `t` : le scanner le voit) ; s'il est client, `t()` normal.
- `getOAuthErrorMessage(...)` est appelé dans la page de connexion (serveur) : sa version traduite s'appuie sur `translate()` (client) ; côté serveur il faut la langue explicite. Traiter ainsi : la page serveur passe le **code** d'erreur au composant client (`initialErrorCode`) et c'est le composant client qui appelle `getOAuthErrorMessage(code)` au rendu (après l'hydratation), au lieu de passer le texte déjà calculé. Mettre à jour le composant et la page ; comportement identique en français.
- Écrans de chargement (`loading.tsx`) : même règle (client ou alias serveur).
- Mesure : la règle ESLint (avertissement) sur ces fichiers doit tomber à 0 ; vérifier aussi à la main les textes sans accent (« Connexion », « Inscription », « Mot de passe », « OU », « Continuer »).

- [ ] **Étape 1 :** implémenter pour les fichiers ci-dessus.
- [ ] **Étape 2 :** `npx eslint components/auth-form.tsx components/auth "app/(auth)"` → 0 `no-restricted-syntax` ; `npm run i18n:manifest` (committer) ; typecheck, lint, test, `i18n:check`, `ui:hydration-check`.
- [ ] **Étape 3 : navigateur** — `/login` et `/register` en français (aucun changement visible), puis avec le cookie `musikpro_lang=en` : après un court instant, les textes que les dictionnaires contiennent passent en anglais ; une connexion avec un mauvais mot de passe (compte inexistant de test, JAMAIS d'identifiants réels) affiche le message français ou traduit, pas l'anglais brut de la bibliothèque ; console sans erreur #418.
- [ ] **Étape 4 : commit** — `feat(i18n): connexion et inscription traduisibles`.

---

### Task 8: mot de passe oublié/réinitialisé et double authentification

**Fichiers :**
- Modifier : `components/forgot-password-form.tsx`, `components/reset-password-form.tsx`, `components/two-factor-challenge.tsx`, `components/two-factor-setup.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/page.tsx`, `app/(auth)/two-factor/page.tsx`, `lib/i18n/manifest.json`

**Interfaces :** consomme `authErrorMessage`, `translateIssue`, `translateApiMessage` (pour les appels `apiFetch`/`fetch` de `two-factor-challenge.tsx`), `useI18nOverlay`, `resolvePageLocale`/`translateForLocale`/`primeOverlay` (pages serveur).

Mêmes règles que la tâche 7. Spécifique :
- `two-factor-challenge.tsx` (~25 textes) et `two-factor-setup.tsx` (~10, utilisé par `components/banani/SecurityAccountScreen.tsx` : l'écran hôte est déjà dans `t()`) : le libellé du minuteur (`timerLabel()`) et les messages d'état passent par `translateTemplate` si dynamiques ; les messages d'API par `translateApiMessage` ; les erreurs de la bibliothèque par `authErrorMessage(code, t("…"))`.
- Ajouter `useI18nOverlay()` dans chacun des composants clients de la tâche.
- `reset-password/page.tsx` (lignes ~15 et ~23 : textes d'état) : appliquer la règle serveur/client selon le cas.
- Tous les `scripts` et fichiers listés au scanner restent cohérents (`--check` sans chemin manquant).

- [ ] **Étape 1 :** implémenter. **Étape 2 :** `npx eslint` sur tous les fichiers d'authentification → 0 `no-restricted-syntax` ; `npm run i18n:manifest` ; typecheck, lint, test, `i18n:check`, `ui:hydration-check`. **Étape 3 :** navigateur : `/forgot-password` et `/reset-password` (sans jeton : « Lien invalide ou expiré ») en français puis avec le cookie `en`. **Étape 4 : commit** — `feat(i18n): mot de passe oublié, réinitialisation et double authentification traduisibles`.

---

### Task 9: e-mails de vérification et de réinitialisation

**Fichiers :**
- Créer : `lib/email/auth-email-text.ts`, `tests/auth-email-text.test.ts`
- Modifier : `lib/auth/index.ts`, `lib/email/index.ts`, `scripts/i18n-sync.mts` (ajouter `lib/email/auth-email-text.ts`), `lib/i18n/manifest.json`

**Interfaces :**
- Consomme : `pickPageLocale`, `readCookieValue` (tâche 1), `translateForLocale`/`translateTemplateForLocale` (`lib/i18n/translate.ts`), `primeOverlay`, `LANDING_LANGUAGE_COOKIE`.
- Produit : `authEmailText(kind: "reset" | "verify", locale: Locale): { subject; title; actionLabel; intro; ignore }`, `localeFromRequest(request: Request | undefined): Locale`.

Rappel : seuls ces deux e-mails visent le client. `sendTwoFactorEmail` (propriétaire) et `sendSupportEmail` (support interne) ne changent pas. Aucune colonne en base.

- [ ] **Étape 1 : tests**

```ts
// tests/auth-email-text.test.ts
import { describe, expect, it } from "vitest";
import { authEmailText, localeFromRequest } from "@/lib/email/auth-email-text";

describe("authEmailText", () => {
  it("renvoie le français actuel, mot pour mot, pour fr", () => {
    expect(authEmailText("reset", "fr")).toEqual({
      subject: "Réinitialiser votre mot de passe",
      title: "Réinitialisation du mot de passe",
      actionLabel: "Choisir un nouveau mot de passe",
      intro: "Cette demande concerne votre compte {brand}.",
      ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    });
    expect(authEmailText("verify", "fr").subject).toBe("Vérifiez votre adresse e-mail");
    expect(authEmailText("verify", "fr").actionLabel).toBe("Vérifier mon e-mail");
  });
  it("retombe sur le français quand aucune traduction n'est connue", () => {
    expect(authEmailText("verify", "es").title).toBe("Confirmez votre adresse e-mail");
  });
});

describe("localeFromRequest", () => {
  it("lit le cookie musikpro_lang puis Accept-Language", () => {
    expect(localeFromRequest(new Request("https://x.test", { headers: { cookie: "musikpro_lang=en" } }))).toBe("en");
    expect(localeFromRequest(new Request("https://x.test", { headers: { "accept-language": "pt-BR" } }))).toBe("pt");
  });
  it("renvoie fr sans requête", () => {
    expect(localeFromRequest(undefined)).toBe("fr");
  });
});
```

(`intro` contient `{brand}` : le nom de marque est substitué à l'envoi ; ne jamais interpoler avant la traduction.)

- [ ] **Étape 2 : implémenter** — `lib/email/auth-email-text.ts` : `authEmailText` construit les cinq textes avec un alias local `const t = (text: string) => translateForLocale(text, locale)` (nom `t`, pour le scanner) ; `localeFromRequest` utilise `pickPageLocale({ cookie: readCookieValue(request.headers.get("cookie"), LANDING_LANGUAGE_COOKIE), acceptLanguage: request.headers.get("accept-language") })`. Importer sans `server-only` ni `next/headers` (module testable). Le texte français de `intro` et `ignore` est celui de `sendAuthEmail` actuel (`Cette demande concerne votre compte ${brand}.` → clé `Cette demande concerne votre compte {brand}.` ; `Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.` avec l'apostrophe droite du code actuel).
- [ ] **Étape 3 : brancher** — `lib/email/index.ts` : `sendAuthEmail` reçoit en plus `intro` et `ignore` (déjà traduits ; `{brand}` remplacé par `brandName()` à l'envoi) avec les valeurs françaises actuelles par défaut si absentes (rétrocompatibilité) ; le HTML reste identique, seuls ces deux textes viennent des paramètres ; ajouter `lang` à la balise `<div>` n'est pas nécessaire. `lib/auth/index.ts` : `sendResetPassword: async ({ user, url }, request)` et `sendVerificationEmail: async ({ user, url }, request)` (la bibliothèque passe la requête en second argument ; vérifier le type dans la version installée) calculent `const locale = localeFromRequest(request); await primeOverlay(locale);` (dans un `try/catch` : une panne de traduction ne doit jamais empêcher l'envoi) puis passent `authEmailText(kind, locale)`.
- [ ] **Étape 4 : contrôles** — `npx vitest run tests/auth-email-text.test.ts`, `npm run i18n:manifest` (committer), `i18n:check`, `security:baseline`, typecheck, lint, test.
- [ ] **Étape 5 : commit** — `feat(i18n): e-mails de vérification et de réinitialisation dans la langue de la requête`.

---

### Task 10: titres de pages et image de partage

**Fichiers :**
- Modifier : `lib/seo/metadata.ts`, `app/(auth)/layout.tsx`, `app/dashboard/layout.tsx`, `app/setup/page.tsx` (seulement si elle utilise `privatePageMetadata`), `app/terms/page.tsx`, `app/privacy/page.tsx`, `app/opengraph-image.tsx`, `scripts/i18n-sync.mts` (chemins déjà prévus à la tâche 3), `lib/i18n/manifest.json`

**Interfaces :** consomme `resolvePageLocale` (tâche 1), `translateForLocale`, `primeOverlay`. Produit : `getPrivatePageMetadata(locale): Metadata` ; `privatePageMetadata` (constante actuelle) conservée telle quelle pour compatibilité.

- [ ] **Étape 1 :** `lib/seo/metadata.ts` : ajouter `getPrivatePageMetadata(locale: Locale)` qui construit `buildMetadata({ title: t("Espace privé"), description: t("Espace privé du SaaS."), noIndex: true })` avec l'alias `t` sur `translateForLocale(text, locale)` ; garder `privatePageMetadata` exportée, inchangée. Pas de `t()` au niveau du module.
- [ ] **Étape 2 :** `app/(auth)/layout.tsx` et `app/dashboard/layout.tsx` : remplacer `export const metadata = privatePageMetadata` par `export async function generateMetadata(): Promise<Metadata>` qui résout la langue (`resolvePageLocale()`, après `primeOverlay`) et renvoie `getPrivatePageMetadata(locale)`. Dans `app/dashboard/layout.tsx`, la langue du shell vient déjà de l'URL (`resolveDashboardLocale`) : utiliser `resolveDashboardLocale()` à la place de `resolvePageLocale()` pour rester cohérent avec la tâche 7 du sous-projet 2.
- [ ] **Étape 3 :** `app/terms/page.tsx` et `app/privacy/page.tsx` : seulement titre et description (2 + 2 textes) via `generateMetadata` ; le corps des pages est le sous-projet 4 (ne pas y toucher).
- [ ] **Étape 4 :** `app/opengraph-image.tsx` : `alt` (« — aperçu du site ») et slogan (« Next.js • Afrique • Mobile Money • Sécurité • SEO ») suivent la langue de la requête ; vérifier que `alt` peut être dynamique dans la version de Next installée (sinon, localiser seulement le contenu de l'image et le dire dans le rapport) ; `app/twitter-image.tsx` réexporte la même image.
- [ ] **Étape 5 : contrôles** — `npm run i18n:manifest` (committer), `i18n:check`, typecheck, lint, test, `security:baseline`, `features:check` ; vérifier qu'aucune page n'est devenue statique→dynamique par erreur (le layout racine utilisait déjà `headers()`).
- [ ] **Étape 6 : commit** — `feat(i18n): titres de pages et image de partage selon la langue`.

---

### Task 11: balayage final, garde en erreur, documentation et vérification navigateur

**Fichiers :** `eslint.config.mjs`, `CLAUDE.md`, `scripts/i18n-sync.mts` (vérifier la liste finale), éventuels correctifs du balayage, `lib/i18n/manifest.json`.

- [ ] **Étape 1 : balayage** — `npx eslint app components lib` : 0 `no-restricted-syntax` dans les périmètres (anciens et nouveaux). Chercher à la main les textes français sans accent que la règle ne voit pas dans `app/(auth)`, `components/auth*`, `components/*password*`, `components/two-factor*` (« Connexion », « Inscription », « Mot de passe », « Continuer », « Retour », « Valider », « Envoyer », « Annuler »). Corriger.
- [ ] **Étape 2 : basculer en erreur** — dans `eslint.config.mjs`, passer le bloc d'authentification de `"warn"` à `"error"` (fusionner avec le bloc existant si plus simple). `npm run lint` : 0 erreur.
- [ ] **Étape 3 : `CLAUDE.md`** — dans la section « traduction multilingue (i18n) », mettre à jour de façon minimale et dans le style existant : (a) la langue d'une page est résolue par `resolvePageLocale()` (préfixe d'URL > cookie `musikpro_lang` > `Accept-Language` > `fr` ; `/admin` en `fr`) et sert `<html lang>` ; `translate()` renvoie le français jusqu'à la fin de l'hydratation ; (b) les textes hors composants (messages Zod, messages d'API) se marquent avec `i18nKey("…")` et se traduisent à l'affichage (`translateIssue`, `translateApiMessage`) ; (c) les composants client d'authentification appellent `useI18nOverlay()`. Aucun nouveau mécanisme.
- [ ] **Étape 4 : contrôles complets** — `npm run typecheck && npm run lint && npm run test && npm run i18n:manifest && npm run i18n:check && npm run security:baseline && npm run validation:zod-check && npm run features:check && npm run refactor:check && npm run security:csp-check && npm run ui:hydration-check && npm run kit:integrity`.
- [ ] **Étape 5 : navigateur** — serveur de développement : (a) `/login`, `/register`, `/forgot-password` en français sans changement ; (b) avec le cookie `musikpro_lang=en` : `<html lang="en">` dans le HTML initial, aucun message d'hydratation, textes passés en anglais pour ce que les dictionnaires contiennent ; (c) une erreur de connexion sur un compte de test inexistant : message français/traduit, pas d'anglais brut ; (d) `/page-inexistante` en anglais avec le cookie ; (e) `/admin/…` toujours `<html lang="fr">` (si une session admin est disponible ; sinon vérifier au moins la redirection et le HTML de `/login`) ; (f) un clic sur « Actualiser les traductions » dans l'admin si une session admin est disponible. Ne se connecter avec aucun identifiant réel ; si une vérification est impossible, le dire explicitement.
- [ ] **Étape 6 : commit** — `feat(i18n): garde en erreur sur les écrans d'authentification et documentation du résolveur de langue`.
