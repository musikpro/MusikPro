# Détection automatique de la devise par pays Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une devise à chaque association pays/langue de `/admin/languages` (renommé
« Langues et Monnaies »), détecter automatiquement la devise du visiteur comme c'est déjà fait
pour la langue (`country.is` → table `country_languages`), et l'utiliser comme valeur par défaut
modifiable du sélecteur de devise déjà présent sur l'écran crédits.

**Architecture:** Colonne additive `currency_code` sur la table existante `country_languages`.
`lib/credit-plans/currency.ts` gagne 8 nouvelles devises et une fonction pure
`resolveCurrencyForCountry`. `lib/languages/detection.ts` expose une nouvelle fonction sœur de
`detectInterfaceLanguage` — `detectCurrency` — construite sur un helper de résolution de pays
partagé. `app/dashboard/layout.tsx` la calcule et la transmet à `DemoProvider` via
`initialDetectedCurrency`, qui l'utilise comme défaut de `choices.currency` (miroir exact du
mécanisme déjà en place pour `appLanguage`), sans jamais écraser un choix déjà sauvegardé en
`localStorage`. Admin : extension du formulaire/action existants (`app/admin/languages/`), pas de
nouvel écran.

**Tech Stack:** Next.js App Router, Drizzle ORM (Neon), Zod, React 19, vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-country-currency-design.md`

## Global Constraints

- Toute réponse à l'utilisateur en français ; ne pas pousser vers GitHub sans autorisation
  explicite (règle permanente de ce projet).
- Changement additif et non régressif : ne jamais renommer/casser une table, une fonction ou un
  contrat existant. `country_languages` garde son nom de table technique ; seuls les libellés
  admin visibles changent.
- Toute action d'enregistrement/suppression du dashboard admin doit rendre compte via
  `AdminActionForm`/`useAdminActionToast`/`AdminActionState`/`actionErrorMessage` — déjà le cas
  pour `setCountryLanguage`/`removeCountryLanguage`, ne pas régresser ce mécanisme en les modifiant.
- Les codes de devise (XOF, GHS, KES…) sont des codes ISO/labels techniques, pas du texte
  narratif : ils ne passent ni par `translate`/`t()`, ni par la colonne `translations` jsonb — pas
  de tâche `i18n:sync` dans ce plan (voir spec, section i18n).
- **Une migration Drizzle doit être explicitement appliquée à la base réelle après avoir été
  générée** (`npx drizzle-kit migrate` avec `DATABASE_URL_DIRECT`, jamais seulement committée) —
  une régression vécue dans ce même projet (table `phone_prefixes` jamais appliquée) a cassé
  `/admin/phone-prefixes` en production ; ne pas répéter cette erreur. C'est un step explicite de
  la Task 3, pas une supposition.
- `lib/credit-plans/currency.ts` ne doit importer aucun module touchant `@/db` — reste testable
  sans base de données (même contrainte que `lib/validation/musikpro-demo.ts` dans le chantier
  précédent).

## Review Focus

- Un pays présent dans `country_languages` avec une `currencyCode` qui ne correspond à aucune
  entrée de `creditCurrencies` (donnée corrompue) ne doit jamais faire planter `detectCurrency` ni
  l'écran crédits — repli sur `null` côté détection, sur `"XOF"` côté `DemoProvider`. Test dédié
  Task 2 (`resolveCurrencyForCountry`) et Task 6 (effet `DemoProvider`).
- Un visiteur dont le pays n'est dans aucune ligne de `country_languages` doit recevoir
  `detectCurrency() === null` proprement — test dédié Task 2.
- Un visiteur qui a déjà un choix de devise sauvegardé en `localStorage` (retour sur le site) ne
  doit jamais voir ce choix écrasé par la détection au rechargement — même garantie que pour la
  langue (`musikpro:interface-language:${persistenceId}`) ; couverte par l'effet ajouté en Task 6,
  à vérifier manuellement (pas de test automatisé de `localStorage` dans ce repo — `environment:
"node"` dans `vitest.config.ts`).
- La migration doit couvrir les 20 pays existants sans qu'aucun ne reste sur la valeur par défaut
  `XOF` alors qu'une vraie devise locale existe — vérifié Task 3 par une requête de contrôle après
  application.
- Le formulaire d'ajout pays/langue/devise ne doit jamais pouvoir soumettre un code devise hors de
  `creditCurrencies` (l'admin ne doit pas pouvoir taper un code arbitraire) — `<select>` fermé +
  validation Zod côté serveur, Task 7.

---

### Task 1: Nouvelles devises dans le catalogue de prix

**Files:**

- Modify: `lib/credit-plans/currency.ts`
- Test: `tests/credit-plan-currency.test.ts` (nouveau)

**Interfaces:**

- Produces: 8 nouvelles entrées dans `creditCurrencies` (`KES, CDF, RWF, TZS, UGX, ZMW, MZN,
GNF`) et leurs taux dans `unitsPerXof` — consommées par la Task 2 (`resolveCurrencyForCountry`)
  et déjà consommées automatiquement par `CreationPackScreen.tsx`/`CreditsPurchaseScreen.tsx` via
  le ré-export `demoCurrencies` (aucune modification requise dans ces deux fichiers).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/credit-plan-currency.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { creditCurrencies, convertFromXof, formatCreditPrice } from "@/lib/credit-plans/currency";

describe("creditCurrencies", () => {
  it("includes the 8 newly supported local currencies", () => {
    const codes = creditCurrencies.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["KES", "CDF", "RWF", "TZS", "UGX", "ZMW", "MZN", "GNF"]));
  });
});

describe("convertFromXof with new currencies", () => {
  it("converts a XOF amount to CDF using the configured rate", () => {
    expect(convertFromXof(1000, "CDF")).toBeCloseTo(4500, 5);
  });

  it("falls back to XOF for an unknown currency code", () => {
    expect(convertFromXof(1000, "GNF_TYPO")).toBe(1000);
  });
});

describe("formatCreditPrice with new currencies", () => {
  it("formats CDF with no decimals, like other large-denomination currencies", () => {
    expect(formatCreditPrice(1000, "CDF")).not.toMatch(/[.,]\d{2}\s*CDF|CDF\s*\d+[.,]\d{2}/);
  });

  it("formats ZMW with 2 decimals, like GHS", () => {
    const formatted = formatCreditPrice(1000, "ZMW");
    expect(formatted).toMatch(/\d[.,]\d{2}/);
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run tests/credit-plan-currency.test.ts`
Expected: FAIL — `creditCurrencies` ne contient pas encore `KES/CDF/RWF/TZS/UGX/ZMW/MZN/GNF`,
`convertFromXof(1000, "CDF")` retourne `1000` (repli XOF) au lieu de `4500`.

- [ ] **Step 3: Implémenter**

Remplacer le contenu de `lib/credit-plans/currency.ts` par :

```ts
export const creditCurrencies = [
  { code: "XOF", label: "Franc CFA (XOF)", symbol: "FCFA" },
  { code: "XAF", label: "Franc CFA (XAF)", symbol: "FCFA" },
  { code: "EUR", label: "Euro (€)", symbol: "€" },
  { code: "USD", label: "Dollar ($)", symbol: "$" },
  { code: "NGN", label: "Naira (₦)", symbol: "₦" },
  { code: "GHS", label: "Cedi (GH₵)", symbol: "GH₵" },
  { code: "KES", label: "Shilling kényan (KES)", symbol: "KSh" },
  { code: "CDF", label: "Franc congolais (CDF)", symbol: "FC" },
  { code: "RWF", label: "Franc rwandais (RWF)", symbol: "FRw" },
  { code: "TZS", label: "Shilling tanzanien (TZS)", symbol: "TSh" },
  { code: "UGX", label: "Shilling ougandais (UGX)", symbol: "USh" },
  { code: "ZMW", label: "Kwacha zambien (ZMW)", symbol: "ZK" },
  { code: "MZN", label: "Metical mozambicain (MZN)", symbol: "MT" },
  { code: "GNF", label: "Franc guinéen (GNF)", symbol: "FG" },
] as const;

export type CreditCurrencyCode = (typeof creditCurrencies)[number]["code"];

// XOF is the source of truth. These display rates can later be refreshed by a server-side FX provider.
const unitsPerXof: Record<CreditCurrencyCode, number> = {
  XOF: 1,
  XAF: 1,
  EUR: 1 / 655.957,
  USD: 1 / 600,
  NGN: 2.7,
  GHS: 1 / 40,
  KES: 129 / 600,
  CDF: 4.5,
  RWF: 1300 / 600,
  TZS: 2600 / 600,
  UGX: 3700 / 600,
  ZMW: 27 / 600,
  MZN: 64 / 600,
  GNF: 14.5,
};

// Zero-decimal currencies: large nominal values where sub-units aren't used in practice.
const ZERO_DECIMAL_CURRENCIES = new Set<CreditCurrencyCode>([
  "XOF",
  "XAF",
  "NGN",
  "CDF",
  "RWF",
  "TZS",
  "UGX",
  "GNF",
  "KES",
]);

export function convertFromXof(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  return valueInXof * unitsPerXof[code];
}

export function formatCreditPrice(valueInXof: number, currency: string) {
  const code = creditCurrencies.some((item) => item.code === currency) ? (currency as CreditCurrencyCode) : "XOF";
  const value = convertFromXof(valueInXof, code);
  const zeroDecimals = ZERO_DECIMAL_CURRENCIES.has(code);
  return new Intl.NumberFormat(code === "XOF" || code === "XAF" ? "fr-FR" : "en", {
    style: "currency",
    currency: code,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(value);
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run tests/credit-plan-currency.test.ts`
Expected: PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add lib/credit-plans/currency.ts tests/credit-plan-currency.test.ts
git commit -m "feat: ajouter 8 devises locales au catalogue de prix (KES, CDF, RWF, TZS, UGX, ZMW, MZN, GNF)"
```

---

### Task 2: Résolution pure devise ← pays

**Files:**

- Modify: `lib/credit-plans/currency.ts`
- Test: `tests/credit-plan-currency.test.ts`

**Interfaces:**

- Consumes: `creditCurrencies`, `CreditCurrencyCode` (Task 1, même fichier).
- Produces: `resolveCurrencyForCountry(country: string | null, overrides: Record<string, string>):
CreditCurrencyCode | null` — consommée par `detectCurrency` (Task 4).

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `tests/credit-plan-currency.test.ts` :

```ts
import { resolveCurrencyForCountry } from "@/lib/credit-plans/currency";

describe("resolveCurrencyForCountry", () => {
  it("returns null when no country was detected", () => {
    expect(resolveCurrencyForCountry(null, {})).toBeNull();
  });

  it("returns null when the country has no override", () => {
    expect(resolveCurrencyForCountry("CI", {})).toBeNull();
  });

  it("returns the overridden currency for the country", () => {
    expect(resolveCurrencyForCountry("GH", { GH: "GHS" })).toBe("GHS");
  });

  it("is case-insensitive on the country code", () => {
    expect(resolveCurrencyForCountry("gh", { GH: "GHS" })).toBe("GHS");
  });

  it("returns null when the stored currency code isn't a supported currency (corrupted data)", () => {
    expect(resolveCurrencyForCountry("CI", { CI: "ZZZ" })).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier que le test échoue**

Run: `npx vitest run tests/credit-plan-currency.test.ts`
Expected: FAIL avec `resolveCurrencyForCountry is not a function` (ou équivalent TypeScript).

- [ ] **Step 3: Implémenter**

Ajouter à la fin de `lib/credit-plans/currency.ts` :

```ts
/**
 * Resolves the display currency for a country, from an admin-configured override
 * (the `country_languages.currencyCode` column) only — there is no static heuristic
 * fallback for currency, unlike language.
 */
export function resolveCurrencyForCountry(
  country: string | null,
  overrides: Record<string, string>,
): CreditCurrencyCode | null {
  if (!country) return null;
  const code = overrides[country.trim().toUpperCase()];
  return creditCurrencies.some((item) => item.code === code) ? (code as CreditCurrencyCode) : null;
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run tests/credit-plan-currency.test.ts`
Expected: PASS (10/10).

- [ ] **Step 5: Commit**

```bash
git add lib/credit-plans/currency.ts tests/credit-plan-currency.test.ts
git commit -m "feat: ajouter resolveCurrencyForCountry (résolution pure devise/pays)"
```

---

### Task 3: Colonne `currency_code` et migration

**Files:**

- Modify: `db/schema/index.ts`
- Create: `db/migrations/00XX_<auto>.sql` (généré par `drizzle-kit generate`, nom exact inconnu à
  l'avance)

**Interfaces:**

- Produces: colonne `currencyCode: text("currency_code").notNull().default("XOF")` sur la table
  Drizzle `countryLanguages` — consommée par Task 4 (`detectCurrency`) et Task 7 (actions admin).

- [ ] **Step 1: Ajouter la colonne au schéma**

Dans `db/schema/index.ts`, repérer la définition de `countryLanguages` et ajouter la ligne
`currencyCode` juste après `languageCode` :

```ts
export const countryLanguages = pgTable("country_languages", {
  countryCode: text("country_code").primaryKey(),
  countryName: text("country_name").notNull(),
  flag: text("flag").notNull().default("🌍"),
  languageCode: text("language_code").notNull(),
  currencyCode: text("currency_code").notNull().default("XOF"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

- [ ] **Step 2: Générer la migration**

Run: `npm run db:generate`
Expected: `[✓] Your SQL migration file ➜ db/migrations/00XX_....sql 🚀` — un fichier contenant
`ALTER TABLE "country_languages" ADD COLUMN "currency_code" text DEFAULT 'XOF' NOT NULL;`. Aucune
nouvelle table, aucun `GRANT` nécessaire (la table est déjà classée `exempt` dans
`config/security-rls.json` et déjà couverte par les `GRANT` de sa migration d'origine — une
colonne ajoutée à une table existante hérite des mêmes droits).

- [ ] **Step 3: Compléter la migration avec le rattrapage des 20 pays existants**

Ouvrir le fichier généré à l'étape 2 et y ajouter, après l'`ALTER TABLE` :

```sql
--> statement-breakpoint
UPDATE "country_languages" SET "currency_code" = CASE "country_code"
	WHEN 'BJ' THEN 'XOF' WHEN 'BF' THEN 'XOF' WHEN 'CM' THEN 'XAF' WHEN 'TD' THEN 'XAF'
	WHEN 'CG' THEN 'XAF' WHEN 'CD' THEN 'CDF' WHEN 'CI' THEN 'XOF' WHEN 'GA' THEN 'XAF'
	WHEN 'GH' THEN 'GHS' WHEN 'GN' THEN 'GNF' WHEN 'KE' THEN 'KES' WHEN 'ML' THEN 'XOF'
	WHEN 'MZ' THEN 'MZN' WHEN 'NE' THEN 'XOF' WHEN 'NG' THEN 'NGN' WHEN 'RW' THEN 'RWF'
	WHEN 'SN' THEN 'XOF' WHEN 'TZ' THEN 'TZS' WHEN 'UG' THEN 'UGX' WHEN 'ZM' THEN 'ZMW'
	ELSE "currency_code" END;
```

- [ ] **Step 4: Vérifier statiquement**

Run: `npx tsc --noEmit`
Expected: aucune sortie (0 erreur).

Run: `npm run security:baseline`
Expected: `Security baseline: PASS — 21 API routes and 39 DB tables classified.` (39 inchangé — une
colonne, pas une table).

- [ ] **Step 5: Appliquer la migration à la base réelle**

**Ne pas se contenter de générer/committer** — l'appliquer immédiatement, comme documenté dans les
Global Constraints :

Run: `DATABASE_URL_DIRECT="$(grep '^DATABASE_URL_DIRECT=' .env.local | cut -d= -f2-)" npx drizzle-kit migrate`
Expected: `[✓] migrations applied successfully!`

- [ ] **Step 6: Vérifier le rattrapage en base**

Run un script Node ponctuel (voir précédent de ce projet : script `.mjs` avec
`@neondatabase/serverless`, exécuté avec `DATABASE_SERVICE_URL` injecté en variable
d'environnement, jamais interpolé dans une commande shell) qui sélectionne
`country_code, currency_code` depuis `country_languages` et vérifie que les 20 lignes ont bien une
devise différente de `XOF` par défaut sauf les 6 pays réellement en XOF (BJ, BF, CI, ML, NE, SN).
Expected : aucune ligne à `XOF` en dehors de ces 6 pays.

- [ ] **Step 7: Commit**

```bash
git add db/schema/index.ts db/migrations/
git commit -m "feat: ajouter la colonne currency_code à country_languages (+ rattrapage des 20 pays)"
```

---

### Task 4: Détection automatique de la devise

**Files:**

- Modify: `lib/languages/detection.ts`

**Interfaces:**

- Consumes: `resolveCurrencyForCountry`, `CreditCurrencyCode` (Task 1-2), colonne
  `countryLanguages.currencyCode` (Task 3).
- Produces: `detectCurrency(headersList: Headers): Promise<CreditCurrencyCode | null>` — consommée
  par Task 5 (`app/dashboard/layout.tsx`).

Ce fichier n'a pas de test automatisé direct pour `detectInterfaceLanguage` (fonction déjà
existante, DB-dépendante — seules les fonctions pures qu'elle appelle sont testées dans
`tests/language-detection.test.ts`, qui reste inchangé et doit continuer à passer). Même
convention ici : la logique pure (`resolveCurrencyForCountry`) est déjà testée en Task 2 ; ce
step est une extraction/ajout mécanique vérifié par lecture + `tsc` + test manuel en Task 6.

- [ ] **Step 1: Extraire le helper de résolution de pays partagé**

Dans `lib/languages/detection.ts`, `detectInterfaceLanguage` contient actuellement ce bloc
(4 lignes consécutives) :

```ts
// Fast path: Vercel already resolved the visitor's country for this request, at no cost — skip
// the IP lookup, the cache round-trip and any call to country.is entirely when it's usable.
let country = extractVercelCountryHeader(headersList);
if (!country) {
  const ip = visitorIpFromHeaders(headersList);
  if (ip) country = await lookupCountry(ip, ttlSeconds);
}
if (!country) country = fallbackCountryCode;
if (!country) return fallback;
```

Le remplacer intégralement (les 8 lignes ci-dessus, y compris le `if (!country) return fallback;`
final) par ces 2 lignes :

```ts
const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
if (!country) return fallback;
```

Puis ajouter, avant `detectInterfaceLanguage` (juste après `lookupCountry`), le nouveau helper
extrait :

```ts
async function resolveVisitorCountryCode(
  headersList: Headers,
  ttlSeconds: number,
  fallbackCountryCode: string | null,
): Promise<string | null> {
  // Fast path: Vercel already resolved the visitor's country for this request, at no cost — skip
  // the IP lookup, the cache round-trip and any call to country.is entirely when it's usable.
  let country = extractVercelCountryHeader(headersList);
  if (!country) {
    const ip = visitorIpFromHeaders(headersList);
    if (ip) country = await lookupCountry(ip, ttlSeconds);
  }
  return country ?? fallbackCountryCode;
}
```

Comportement strictement identique : `country` vaut la valeur de l'en-tête Vercel, sinon le
résultat de `lookupCountry`, sinon `fallbackCountryCode`, sinon on retourne `fallback` — seule la
forme change.

- [ ] **Step 2: Ajouter `detectCurrency`**

Ajouter en tête de fichier l'import :

```ts
import { resolveCurrencyForCountry, type CreditCurrencyCode } from "@/lib/credit-plans/currency";
```

Puis, à la fin du fichier :

```ts
export async function detectCurrency(headersList: Headers): Promise<CreditCurrencyCode | null> {
  let ttlSeconds = FALLBACK_TTL_SECONDS;
  let fallbackCountryCode: string | null = null;
  try {
    const [settings] = await db
      .select()
      .from(localizationSettings)
      .where(eq(localizationSettings.id, "global"))
      .limit(1);
    ttlSeconds = settings?.countryCacheTtlSeconds ?? FALLBACK_TTL_SECONDS;
    fallbackCountryCode = settings?.fallbackCountryCode ?? null;
  } catch {
    // Migration not yet applied: no detection possible, caller falls back to its own default.
  }
  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return null;
  try {
    const [row] = await db
      .select({ currencyCode: countryLanguages.currencyCode })
      .from(countryLanguages)
      .where(eq(countryLanguages.countryCode, country))
      .limit(1);
    return resolveCurrencyForCountry(country, row ? { [country]: row.currencyCode } : {});
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run tests/language-detection.test.ts`
Expected: PASS (14/14) — comportement des fonctions pures inchangé après le refactor du Step 1.

Run: `npx tsc --noEmit`
Expected: aucune sortie (0 erreur).

- [ ] **Step 4: Commit**

```bash
git add lib/languages/detection.ts
git commit -m "feat: ajouter detectCurrency (miroir de detectInterfaceLanguage)"
```

---

### Task 5: Branchement `DemoProvider` et dashboard layout

**Files:**

- Modify: `app/dashboard/layout.tsx`
- Modify: `components/banani/DemoProvider.tsx`

**Interfaces:**

- Consumes: `detectCurrency` (Task 4), `creditCurrencies`/`CreditCurrencyCode` (Task 1).
- Produces: prop `initialDetectedCurrency: CreditCurrencyCode | null` sur `DemoProvider` ; défaut
  de `choices.currency` détecté au premier chargement, persistant en `localStorage` sous
  `musikpro:currency:${persistenceId}` (miroir exact de `musikpro:interface-language:${persistenceId}`).

- [ ] **Step 1: Calculer et transmettre la devise détectée**

Dans `app/dashboard/layout.tsx`, ajouter l'import :

```ts
import { detectCurrency } from "@/lib/languages/detection";
```

Après la ligne `const detectedInterfaceLanguage = await detectInterfaceLanguage(...)`, ajouter :

```ts
const detectedCurrency = await detectCurrency(await headers());
```

Puis, dans le JSX de `<DemoProvider>`, ajouter après `initialPhonePrefixes={phonePrefixOptions}` :

```tsx
initialDetectedCurrency = { detectedCurrency };
```

- [ ] **Step 2: Étendre `DemoProvider`**

Dans `components/banani/DemoProvider.tsx`, ajouter l'import :

```ts
import { creditCurrencies, type CreditCurrencyCode } from "@/lib/credit-plans/currency";
```

Ajouter `initialDetectedCurrency: CreditCurrencyCode | null` comme dernier paramètre positionnel
de `useDemoState` (après `initialPhonePrefixes`), comme dernière prop déstructurée du composant
exporté `DemoProvider` (après `initialPhonePrefixes`) avec son type inline, et le transmettre dans
l'appel `useDemoState(...)` — exactement le même motif que `initialPhonePrefixes` a suivi lors du
chantier précédent (paramètre ajouté en dernière position aux deux endroits).

- [ ] **Step 3: Ajouter l'effet de défaut de devise**

Juste après l'effet existant qui gère `appLanguage` (celui qui se termine par
`}, [initialDetectedInterfaceLanguage, initialInterfaceLanguages, persistenceId]);`), ajouter :

```ts
useEffect(() => {
  const savedCurrency = window.localStorage.getItem(`musikpro:currency:${persistenceId}`);
  const savedValid = creditCurrencies.some((currency) => currency.code === savedCurrency);
  const detectedValid = initialDetectedCurrency
    ? creditCurrencies.some((currency) => currency.code === initialDetectedCurrency)
    : false;
  const selected = savedValid
    ? (savedCurrency as CreditCurrencyCode)
    : detectedValid
      ? initialDetectedCurrency!
      : "XOF";
  setChoices((current) => ({ ...current, currency: selected }));
}, [initialDetectedCurrency, persistenceId]);
```

- [ ] **Step 4: Persister un choix manuel de devise**

Dans la fonction `choose(key, value)`, après le bloc `if (key === "appLanguage") { ... }`,
ajouter :

```ts
if (key === "currency") window.localStorage.setItem(`musikpro:currency:${persistenceId}`, value);
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune sortie (0 erreur).

Run: `npx vitest run`
Expected: tous les tests passent, aucune régression (le mécanisme de `choices` n'est pas
directement testé par la suite existante — vérifié par lecture + `tsc`, cohérent avec le reste de
`DemoProvider.tsx` qui n'a pas de test unitaire dédié).

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/layout.tsx components/banani/DemoProvider.tsx
git commit -m "feat: brancher la détection automatique de devise sur DemoProvider"
```

---

### Task 6: Admin — renommage, devise dans le formulaire et l'action

**Files:**

- Modify: `components/admin/AdminShell.tsx`
- Modify: `app/admin/menu/page.tsx`
- Modify: `app/admin/languages/page.tsx`
- Modify: `app/admin/languages/actions.ts`

**Interfaces:**

- Consumes: `creditCurrencies` (Task 1), colonne `countryLanguages.currencyCode` (Task 3).
- Produces: aucune nouvelle interface consommée ailleurs — dernier maillon de la chaîne.

- [ ] **Step 1: Renommer le menu**

Dans `components/admin/AdminShell.tsx:42`, remplacer :

```ts
{ href: "/admin/languages", icon: "languages", label: "Langues" },
```

par :

```ts
{ href: "/admin/languages", icon: "languages", label: "Langues et Monnaies" },
```

Dans `app/admin/menu/page.tsx:15`, remplacer `["/admin/languages", "Langues", "languages"],` par
`["/admin/languages", "Langues et Monnaies", "languages"],`.

- [ ] **Step 2: Étendre le schéma et l'action `setCountryLanguage`**

Dans `app/admin/languages/actions.ts`, importer `creditCurrencies` :

```ts
import { creditCurrencies } from "@/lib/credit-plans/currency";
```

Étendre `countryLanguageSchema` :

```ts
const countryLanguageSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/),
  languageCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(?:-[a-z]{2})?$/),
  currencyCode: z.enum(creditCurrencies.map((currency) => currency.code) as [string, ...string[]]),
});
```

Dans `setCountryLanguage`, ajouter `currencyCode: parsed.currencyCode` à la fois dans `.values()`
et dans `.onConflictDoUpdate({ set: { ... } })` :

```ts
await getServiceDb()
  .insert(countryLanguages)
  .values({
    countryCode: parsed.countryCode,
    countryName,
    flag,
    languageCode: parsed.languageCode,
    currencyCode: parsed.currencyCode,
  })
  .onConflictDoUpdate({
    target: countryLanguages.countryCode,
    set: {
      countryName,
      flag,
      languageCode: parsed.languageCode,
      currencyCode: parsed.currencyCode,
      updatedAt: new Date(),
    },
  });
```

Le message de succès `"Association pays → langue enregistrée."` devient
`"Association pays, langue et devise enregistrée."`.

- [ ] **Step 3: Mettre à jour la boîte et le formulaire dans `page.tsx`**

Importer `creditCurrencies` :

```ts
import { creditCurrencies } from "@/lib/credit-plans/currency";
```

Dans `CountryLanguageSection`, remplacer le titre et la description :

```tsx
<h2>Association pays, langue et monnaie</h2>
<p>
  Quand country.is détecte le pays d’un visiteur, MusikPro utilise cette table pour choisir
  automatiquement la langue de l’interface et la devise affichée sur l’écran crédits. Liste
  initiale : pays où Chariow propose au moins deux moyens de paiement. Ajoute d’autres pays si
  besoin.
</p>
```

Dans chaque carte pays, afficher la devise sous le badge langue existant :

```tsx
<div className="admin-catalog-card-head">
  <span className="admin-catalog-icon">{row.flag}</span>
  <span className="admin-status is-success">{row.languageCode.toUpperCase()}</span>
</div>
<h3>{row.countryName}</h3>
<p>{row.countryCode}</p>
<p className="admin-country-currency">{row.currencyCode}</p>
```

Dans le formulaire d'ajout, ajouter un 3ᵉ `<div className="admin-editor-field">` après celui de
« Langue associée » :

```tsx
<div className="admin-editor-field">
  <span>Monnaie</span>
  <AdminSelect
    name="currencyCode"
    ariaLabel="Monnaie associée"
    defaultValue={creditCurrencies[0]?.code}
    options={creditCurrencies.map((currency) => ({ value: currency.code, label: currency.label }))}
  />
</div>
```

- [ ] **Step 4: Mettre à jour le titre de page et la description**

Dans `AdminLanguagesPage`, dans `<AdminPageHeader>`, `title="Langues"` devient
`title="Langues et Monnaies"`.

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune sortie (0 erreur).

Run: `npx eslint app/admin/languages/ components/admin/AdminShell.tsx app/admin/menu/page.tsx`
Expected: aucune erreur.

Run: `npx vitest run`
Expected: tous les tests passent (aucun test ne couvre directement ce fichier — vérifié par
lecture + `tsc` + eslint, cohérent avec le reste de cette page qui n'a pas de test dédié).

- [ ] **Step 6: Vérification manuelle dans le navigateur**

Démarrer/utiliser le serveur de dev déjà lancé, se rendre sur `/admin/languages` : le menu affiche
« Langues et Monnaies », la boîte « Association pays, langue et monnaie » liste les 20 pays avec
leur devise sous le badge langue, le formulaire propose bien un 3ᵉ menu « Monnaie ». Ajouter un
pays test (ex. un pays non encore mappé) avec une devise, vérifier le toast de succès et que la
carte apparaît avec la bonne devise.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminShell.tsx app/admin/menu/page.tsx app/admin/languages/
git commit -m "feat: renommer Langues en Langues et Monnaies, ajouter la devise au formulaire pays/langue"
```
