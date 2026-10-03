# Pages légales traduisibles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le corps des pages `/terms` et `/privacy` et le cadre `LegalPage` traduisibles (EN/ES/PT) par le mécanisme i18n existant, avec un bandeau « traduction automatique » et une version française forcée par `?lang=fr`.

**Architecture:** Les pages (composants serveur) résolvent la langue (`resolvePageLocale()` + `?lang=fr`), amorcent le dictionnaire (`primeOverlay`) et passent chaque texte français littéral par `translateForLocale`. Des helpers purs (`lib/i18n/legal-locale.ts`) portent le choix de langue, la date localisée et le découpage du modèle `{email}`. `LegalPage` reçoit la langue et affiche le bandeau.

**Tech Stack:** Next.js 16 App Router (serveur), TypeScript, Vitest (env node), ESLint flat config, moteur i18n existant (`lib/i18n/*`).

**Spec:** `docs/superpowers/specs/2026-10-03-i18n-legal-pages-design.md`

## Global Constraints

- Répondre/commenter en français ; refactorisation additive et non régressive : le rendu **français** des deux pages reste identique caractère pour caractère (mêmes textes, mêmes apostrophes typographiques `’`, même balisage, même CSS).
- Mécanisme unique : littéraux français comme clés via `translateForLocale` / `translateTemplateForLocale` (`lib/i18n/translate.ts`) + `npm run i18n:manifest`. Aucune traduction écrite à la main, aucun nouveau mécanisme.
- Clés littérales : jamais d'interpolation `${}` avant l'appel ; une clé = le texte français sur UNE ligne (les retours à la ligne/indentations du JSX d'origine se réduisent à une espace).
- Ne jamais lancer `npm run i18n:sync` (appelle l'IA et modifie les dictionnaires).
- Ne jamais committer `next-env.d.ts` ni `baseline-warnings.txt`.
- Les pages restent `export const dynamic = "force-dynamic"` (nonce CSP).
- `searchParams.lang` est non fiable : seule la valeur exacte `"fr"` est reconnue.
- Ne jamais modifier le contenu juridique français ni la date « 19 septembre 2026 ».

## Review Focus

- `?lang=fr` répété ou en tableau (`?lang=fr&lang=en`), `?lang=FR`, `?lang=xx` : seules les chaînes exactement `"fr"` forcent le français ; sinon la langue de la page.
- Traduction IA qui perd ou duplique le marqueur `{email}` : l'adresse e-mail doit toujours apparaître une fois, sous forme de lien.
- Cookie `musikpro_lang=en` sans traduction générée : corps français + bandeau (jamais de bandeau en français).
- `<html lang>` en `en` avec `?lang=fr` : le contenu doit porter `lang="fr"`.
- Rendu français strictement inchangé (pas de bandeau, même texte, même date).

---

### Task 1: Helpers purs de langue légale

**Files:**
- Create: `lib/i18n/legal-locale.ts`
- Test: `tests/legal-locale.test.ts`

**Interfaces:**
- Consumes: `type Locale` de `lib/i18n/translate.ts`.
- Produces : `pickLegalLocale(pageLocale: Locale, langParam: string | string[] | undefined): Locale` ; `formatLegalDate(locale: Locale): string` ; `splitEmailTemplate(text: string): [string, string] | null`.

- [ ] **Step 1: Écrire les tests (échec attendu)**

```ts
import { describe, expect, it } from "vitest";
import { formatLegalDate, pickLegalLocale, splitEmailTemplate } from "@/lib/i18n/legal-locale";

describe("pickLegalLocale", () => {
  it("force le français quand lang vaut exactement fr", () => {
    expect(pickLegalLocale("en", "fr")).toBe("fr");
  });
  it("ignore toute autre valeur (casse, inconnu, tableau, absence)", () => {
    expect(pickLegalLocale("en", "FR")).toBe("en");
    expect(pickLegalLocale("es", "xx")).toBe("es");
    expect(pickLegalLocale("pt", ["fr", "en"])).toBe("pt");
    expect(pickLegalLocale("en", undefined)).toBe("en");
    expect(pickLegalLocale("fr", "en")).toBe("fr");
  });
});

describe("formatLegalDate", () => {
  it("reste identique au texte français actuel", () => {
    expect(formatLegalDate("fr")).toBe("19 septembre 2026");
  });
  it("formate dans les autres langues sans décalage de fuseau", () => {
    expect(formatLegalDate("en")).toMatch(/19/);
    expect(formatLegalDate("en")).toMatch(/September/);
    expect(formatLegalDate("es")).toMatch(/septiembre/);
    expect(formatLegalDate("pt")).toMatch(/setembro/);
  });
});

describe("splitEmailTemplate", () => {
  it("découpe autour du marqueur", () => {
    expect(splitEmailTemplate("écrivez à {email}. Merci")).toEqual(["écrivez à ", ". Merci"]);
  });
  it("renvoie null quand le marqueur est absent (traduction qui l'a perdu)", () => {
    expect(splitEmailTemplate("write to us")).toBeNull();
  });
  it("ne découpe qu'au premier marqueur", () => {
    expect(splitEmailTemplate("a {email} b {email} c")).toEqual(["a ", " b {email} c"]);
  });
});
```

- [ ] **Step 2: Lancer pour constater l'échec**

Run: `npx vitest run tests/legal-locale.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

```ts
import type { Locale } from "./translate";

/** Date de dernière mise à jour des pages légales (constante canonique, jamais traduite). */
const LEGAL_UPDATED_AT = Date.UTC(2026, 8, 19);

/**
 * Langue d'une page légale : `?lang=fr` force la version française (celle qui fait foi) ;
 * toute autre valeur (casse différente, inconnue, tableau, absence) est ignorée.
 */
export function pickLegalLocale(pageLocale: Locale, langParam: string | string[] | undefined): Locale {
  return langParam === "fr" ? "fr" : pageLocale;
}

/** « 19 septembre 2026 » en français ; formaté pour la langue demandée sinon (UTC : pas de décalage de jour). */
export function formatLegalDate(locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    LEGAL_UPDATED_AT,
  );
}

/** Découpe un modèle traduit autour du premier `{email}` ; `null` si une traduction a perdu le marqueur. */
export function splitEmailTemplate(text: string): [string, string] | null {
  const index = text.indexOf("{email}");
  if (index === -1) return null;
  return [text.slice(0, index), text.slice(index + "{email}".length)];
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run tests/legal-locale.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/legal-locale.ts tests/legal-locale.test.ts
git commit -m "feat(i18n): helpers de langue des pages légales (version française forcée, date, e-mail)"
```

---

### Task 2: Composant LegalPage traduisible avec bandeau

**Files:**
- Modify: `components/legal-page.tsx`
- Modify: `app/globals.css` (une classe `.legal-notice`, à côté des classes `.legal-*` vers la ligne 787 ; reprendre les variables de couleur déjà utilisées par `.legal-card`)
- Test: `tests/legal-page.test.tsx` (rendu serveur via `react-dom/server`)

**Interfaces:**
- Consumes: Task 1 (`formatLegalDate`, `splitEmailTemplate`), `translateForLocale`, `translateTemplateForLocale`, `type Locale` (`lib/i18n/translate.ts`).
- Produces: `LegalPage` avec les props existantes (`eyebrow`, `title`, `introduction`, `sections`) **plus** `locale: Locale`, `forcedFrench: boolean`, `path: "/terms" | "/privacy"` ; composant `LegalEmail({ text, email })`. Les pages passent des textes **déjà traduits** ; `LegalPage` traduit son propre cadre. L'appelant a déjà fait `await primeOverlay(locale)`.

- [ ] **Step 1: Écrire les tests (échec attendu)**

`tests/legal-page.test.tsx` (si `.tsx` n'est pas pris par Vitest dans ce dépôt, vérifier `vitest.config.*` `include` et adapter l'extension) :

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LegalEmail, LegalPage } from "@/components/legal-page";

const base = { eyebrow: "E", title: "T", introduction: "I", sections: [{ title: "S", content: <p>c</p> }], path: "/terms" as const };

describe("LegalPage", () => {
  it("français : aucun bandeau, date française, pas de lang forcé", () => {
    const html = renderToStaticMarkup(<LegalPage {...base} locale="fr" forcedFrench={false} />);
    expect(html).not.toContain("legal-notice");
    expect(html).toContain("Dernière mise à jour : 19 septembre 2026");
    expect(html).not.toContain('lang="fr"');
  });
  it("langue étrangère : bandeau avec lien ?lang=fr (textes français faute de traduction)", () => {
    const html = renderToStaticMarkup(<LegalPage {...base} locale="en" forcedFrench={false} />);
    expect(html).toContain("legal-notice");
    expect(html).toContain("/terms?lang=fr");
  });
  it("français forcé : pas de bandeau, lang=fr sur main", () => {
    const html = renderToStaticMarkup(<LegalPage {...base} locale="fr" forcedFrench={true} />);
    expect(html).not.toContain("legal-notice");
    expect(html).toContain('<main class="legal-shell" lang="fr"');
  });
});

describe("LegalEmail", () => {
  it("insère le lien à la place du marqueur", () => {
    const html = renderToStaticMarkup(<LegalEmail text="écrivez à {email}." email="a@b.c" />);
    expect(html).toBe('écrivez à <a href="mailto:a@b.c">a@b.c</a>.');
  });
  it("ajoute le lien en fin si la traduction a perdu le marqueur", () => {
    const html = renderToStaticMarkup(<LegalEmail text="write to us" email="a@b.c" />);
    expect(html).toBe('write to us <a href="mailto:a@b.c">a@b.c</a>');
  });
});
```

- [ ] **Step 2: Constater l'échec** — `npx vitest run tests/legal-page.test.tsx` → FAIL.

- [ ] **Step 3: Implémenter `components/legal-page.tsx`**

Conserver le balisage actuel ; seuls changent : la signature, `<main className="legal-shell" lang={forcedFrench ? "fr" : undefined}>`, le bandeau (inséré dans `<header>` juste avant `<p className="legal-eyebrow">`… à défaut juste après `legal-brand`), la ligne de date et le pied de page. Code des parties nouvelles :

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { formatLegalDate, splitEmailTemplate } from "@/lib/i18n/legal-locale";
import { translateForLocale, translateTemplateForLocale, type Locale } from "@/lib/i18n/translate";

export function LegalEmail({ text, email }: { text: string; email: string }) {
  const link = <a href={`mailto:${email}`}>{email}</a>;
  const parts = splitEmailTemplate(text);
  if (!parts) return <>{text} {link}</>;
  return <>{parts[0]}{link}{parts[1]}</>;
}
```

et dans `LegalPage` : `const t = (text: string) => translateForLocale(text, locale);` ; ligne de date `{translateTemplateForLocale("Dernière mise à jour : {date}", { date: formatLegalDate(locale) }, locale)}` ; bandeau rendu seulement si `locale !== "fr"` :

```tsx
<p className="legal-notice" role="note">
  {t("Traduction automatique : en cas de divergence, la version française fait foi.")}{" "}
  <Link href={`${path}?lang=fr`}>{t("Lire la version française")}</Link>
</p>
```

Pied de page : `t("Confidentialité")`, `t("Conditions d’utilisation")`, `t("Connexion")`. Le nom « MusikPro » n'est pas traduit.

CSS (`app/globals.css`, après `.legal-updated`) — adapter aux variables existantes de ce bloc :

```css
.legal-notice {
  margin: 0.75rem 0 0;
  padding: 0.65rem 0.9rem;
  border-radius: 0.6rem;
  border: 1px solid var(--border);
  background: var(--secondary);
  font-size: 0.9rem;
}
.legal-notice a { text-decoration: underline; }
```

(Utiliser les noms de variables effectivement présents dans `globals.css` ; ne rien inventer.)

- [ ] **Step 4: Tests** — `npx vitest run tests/legal-page.test.tsx` → PASS ; `npx tsc --noEmit` ; `npx eslint components/legal-page.tsx`.

- [ ] **Step 5: Commit**

```bash
git add components/legal-page.tsx app/globals.css tests/legal-page.test.tsx
git commit -m "feat(i18n): cadre des pages légales traduisible avec bandeau de traduction automatique"
```

---

### Task 3: Pages terms et privacy traduisibles

**Files:**
- Modify: `app/terms/page.tsx`
- Modify: `app/privacy/page.tsx`

**Interfaces:**
- Consumes: Task 1 (`pickLegalLocale`), Task 2 (`LegalPage`, `LegalEmail`), `resolvePageLocale` (`lib/i18n/page-locale-server.ts`), `primeOverlay` (`lib/i18n/overlay-server.ts`), `translateForLocale`.
- Produces: les deux pages traduites ; aucune API nouvelle.

Modèle (appliquer aux DEUX pages ; chaque texte français actuel est conservé **mot pour mot**, apostrophes `’` comprises, et devient un littéral `t("…")` sur une seule ligne) :

```tsx
type PageProps = { searchParams: Promise<{ lang?: string | string[] }> };
const CONTACT_EMAIL = "musikpro2026@gmail.com";

async function legalLocale(searchParams: PageProps["searchParams"]) {
  const { lang } = await searchParams;
  const pageLocale = await resolvePageLocale();
  const locale = pickLegalLocale(pageLocale, lang);
  await primeOverlay(locale);
  return { locale, forcedFrench: lang === "fr" };
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { locale } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return buildMetadata({ title: t("Conditions d’utilisation"), description: t("Consultez …"), path: "/terms" });
}

export default async function TermsPage({ searchParams }: PageProps) {
  const { locale, forcedFrench } = await legalLocale(searchParams);
  const t = (text: string) => translateForLocale(text, locale);
  return (
    <LegalPage
      locale={locale}
      forcedFrench={forcedFrench}
      path="/terms"
      eyebrow={t("Cadre d’utilisation")}
      title={t("Conditions d’utilisation")}
      introduction={t("En utilisant MusikPro, …")}
      sections={[
        { title: t("Le service MusikPro"), content: <p>{t("MusikPro permet de préparer … technique.")}</p> },
        // … toutes les sections existantes, même ordre
        {
          title: t("Contact"),
          content: (
            <p>
              <LegalEmail text={t("Pour toute question concernant le service ou ces conditions, écrivez à {email}.")} email={CONTACT_EMAIL} />
            </p>
          ),
        },
      ]}
    />
  );
}
```

Cas particuliers : (a) `terms` « Contact » : modèle ci-dessus (l'original « écrivez à{" "}<a>…</a>. » donne « …écrivez à adresse. », identique). (b) `privacy` « Vos droits » : une seule clé `t("Vous pouvez demander l’accès, la correction ou la suppression de vos données, ainsi que poser toute question relative à leur traitement, en écrivant à {email}. Certaines informations peuvent être conservées lorsqu’une obligation légale ou un besoin de sécurité l’exige.")` rendue par `<LegalEmail … />`. (c) `privacy` « Données traitées » : trois `<p>` successifs, chacun une clé. (d) « Connexion avec Google » : le texte contient des guillemets français `« … »` : les conserver dans la clé. (e) `generateMetadata` conserve exactement les titres/descriptions actuels (ils sont déjà des clés du manifeste).

- [ ] **Step 1:** Réécrire `app/terms/page.tsx` puis `app/privacy/page.tsx` selon le modèle, en reprenant chaque texte actuel sans en changer un caractère. Après chaque page, vérifier par un script rapide que le rendu français est identique : comparer le texte de la page avant/après (voir Step 3).
- [ ] **Step 2:** `npm run i18n:manifest` puis `git diff --stat lib/i18n/manifest.json` : seules des clés **ajoutées** (aucune supprimée sauf si un texte a été changé, ce qui est interdit) ; `npm run i18n:check`.
- [ ] **Step 3: Vérifier l'identité du rendu français** — avec le serveur de dev actif (`npm run dev` déjà lancé en :3000, sinon le démarrer) : `curl -s http://localhost:3000/terms | sed 's/<[^>]*>/ /g' | tr -s ' \n' ' '` avant (sur `main`, via `git stash`/worktree ou en comparant à `git show main:app/terms/page.tsx` pour les textes) et après : le texte visible doit être identique (hors absence/présence de bandeau : aucun en français). Idem `/privacy`. Avec `-H 'Cookie: musikpro_lang=en'` : le bandeau apparaît ; avec `?lang=fr` : pas de bandeau et `lang="fr"` sur `<main`.
- [ ] **Step 4:** `npx tsc --noEmit && npx eslint app/terms app/privacy && npx vitest run`.
- [ ] **Step 5: Commit**

```bash
git add app/terms/page.tsx app/privacy/page.tsx lib/i18n/manifest.json
git commit -m "feat(i18n): corps des pages conditions et confidentialité traduisibles"
```

---

### Task 4: Garde-fous, documentation et vérification finale

**Files:**
- Modify: `scripts/i18n-sync.mts` (ajouter `"components/legal-page.tsx"` à `SCAN_DIRS_WANTED`, près de `"app/terms"`/`"app/privacy"`)
- Modify: `eslint/i18n-client-text.mjs` (ajouter `"app/terms/**/*.{ts,tsx}"`, `"app/privacy/**/*.{ts,tsx}"`, `"components/legal-page.tsx"` à `i18nClientFiles`)
- Modify: `CLAUDE.md` (une puce dans la section « traduction multilingue (i18n) », style existant)
- Modify: `lib/i18n/manifest.json` (régénéré)

- [ ] **Step 1:** Ajouter `components/legal-page.tsx` au scanner puis `npm run i18n:manifest` ; ajouter les trois chemins à `i18nClientFiles` ; `npx eslint app/terms app/privacy components/legal-page.tsx` doit passer à 0 erreur (sinon corriger les textes accentués restants en dur ; ne jamais désactiver la règle globalement).
- [ ] **Step 2: CLAUDE.md** — ajouter, après les puces existantes sur `resolvePageLocale`, une puce courte : « Pages légales (`/terms`, `/privacy`) : chaque texte passe par `translateForLocale` ; sur une langue non française, `LegalPage` affiche un bandeau « traduction automatique » (la version française fait foi) avec un lien `?lang=fr` qui force le français (`pickLegalLocale`). Les modifier = modifier les textes français sources puis cliquer sur « Actualiser les traductions ». »
- [ ] **Step 3: Contrôles complets** — `npm run typecheck && npm run lint && npm run test && npm run i18n:manifest && npm run i18n:check && npm run security:baseline && npm run validation:zod-check && npm run features:check && npm run refactor:check && npm run security:csp-check && npm run ui:hydration-check && npm run kit:integrity && node scripts/seo-check.mjs` : tout passe.
- [ ] **Step 4: Navigateur/curl** (sans identifiants ; pages publiques) : (a) `/terms` et `/privacy` en français sans bandeau, texte inchangé ; (b) cookie `musikpro_lang=en` : bandeau + cadre ; corps français tant que les traductions ne sont pas générées ; (c) `?lang=fr` : pas de bandeau, `lang="fr"` sur `<main>`, `<html lang>` conforme au cookie ; (d) `?lang=FR`, `?lang=xx`, `?lang=fr&lang=en` : ignorés ; (e) aucune erreur d'hydratation en console (si un navigateur piloté est disponible). Ne PAS cliquer sur « Actualiser les traductions » : le dire à l'utilisateur.
- [ ] **Step 5: Commit**

```bash
git add scripts/i18n-sync.mts eslint/i18n-client-text.mjs CLAUDE.md lib/i18n/manifest.json
git commit -m "feat(i18n): garde en erreur sur les pages légales et documentation de la traduction automatique"
```
