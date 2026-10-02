# Moteur de traduction incrémental — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le bouton « Actualiser les traductions » ne traduit que les textes manquants ou modifiés (textes fixes `t()` et catalogue), et les traductions des textes fixes sont servies depuis la base sans redéploiement.

**Architecture:** Une table `ui_translations` (locale, texte français, traduction) complète les fichiers `locales/*.json`. Un manifeste versionné liste les textes français du code. Un orchestrateur pur (`refresh-core.ts`, dépendances injectées) calcule ce qui manque (manifeste − JSON − table ; catalogue par empreinte de source), traduit par lots avec un plafond par appel, et écrit immédiatement. Le client charge le dictionnaire de la table via `GET /api/i18n/overlay` et `translate()` le consulte après le JSON.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Drizzle ORM + Neon, Zod, Vitest, fournisseur IA déjà connecté (`translateBatch`).

**Spec:** `docs/superpowers/specs/2026-10-02-i18n-incremental-engine-design.md`

## Rulings (écarts assumés par rapport à la spec)

- **R1 — `_src` par langue.** La spec disait `_src: { champ: empreinte }`. Avec un plafond de lots, une langue peut être traduite avant les autres : l'empreinte doit donc être **par langue** : `translations._src = { en: { champ: hash }, es: {...}, pt: {...} }`. Sinon une traduction ancienne d'une autre langue serait vue comme à jour.
- **R2 — une seule action.** La spec prévoyait `refreshAllTranslations` + l'ancienne action conservée. Le seul appelant est `RefreshCatalogTranslationsButton` : on fait évoluer `refreshCatalogTranslations` (même nom, résultat enrichi) au lieu d'ajouter une deuxième action.
- **R3 — un seul lot de textes par langue.** Textes fixes manquants et textes de catalogue à traduire sont réunis dans un même ensemble de textes distincts par langue (une seule requête IA par lot), puis répartis à l'écriture.
- **R4 — pas de retraduction pour rien des lignes héritées.** Une ligne de catalogue sans `_src` (créée avant ce chantier) garde sa traduction affichée tant que la nouvelle n'est pas arrivée ; elle est retraduite une fois, puis suivie par empreinte.

## Global Constraints

- Réponses et messages d'interface en français ; commits en français, terminés par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Changements additifs, rétrocompatibles : `translate()`/`translateTemplate()` restent **synchrones** ; aucun des ~63 fichiers qui appellent `t()` ne change ; `localizeField()` ne lit que `translations[locale][champ]`.
- Le français stocké n'est jamais remplacé. Aucune traduction écrite à la main : tout vient de `translateBatch` (`lib/i18n/ai-translate.ts`).
- Langues cibles : `en`, `es`, `pt` uniquement (la liste de langues reste codée en dur, hors périmètre).
- Toute entrée non fiable est validée avec Zod côté serveur (paramètre `locale` du point de lecture).
- Règle admin : l'action rend compte par toast (`useAdminToast`), erreurs via `actionErrorMessage` ; protégée par `requireAdmin`, `rateLimit` et `writeAuditLog`.
- Plafond par appel : `MAX_BATCHES_PER_CALL = 5` lots de `BATCH_SIZE = 40` textes.
- Migration `0063_ui_translations.sql` : écrite à la main, idempotente (`IF NOT EXISTS`), entrée dans `db/migrations/meta/_journal.json` (idx 63), droits `musikpro_runtime` SELECT et `musikpro_service` SELECT/INSERT/UPDATE/DELETE, entrée `exempt` dans `config/security-rls.json`. **Ne jamais l'appliquer à la production dans ce plan** (seulement la base de développement de `.env.local`).
- Ne pas committer `next-env.d.ts`.
- Next 16 : vérifier la signature de `revalidateTag` dans `node_modules/next/dist/docs/` avant de l'utiliser (deuxième argument de profil possible).
- Commandes : tests `npx vitest run <fichier>` ; typecheck `npm run typecheck` ; scanner `npx tsx --env-file=.env.local scripts/i18n-sync.mts`.

## Review Focus

1. Une ligne de catalogue héritée (sans `_src`) garde sa traduction affichée jusqu'à ce que la nouvelle soit écrite ; elle n'est jamais vidée par un appel plafonné.
2. Si l'IA omet un texte (ou échoue en cours de route), ce qui est déjà traduit est écrit, `remaining > 0` est renvoyé, et la boucle du bouton s'arrête quand un appel ne progresse pas (aucune boucle infinie).
3. Quand le français d'un champ change, seul ce champ est retraduit, dans chaque langue, sans toucher aux autres champs ni aux autres lignes.
4. Si `GET /api/i18n/overlay` échoue ou renvoie du contenu invalide, l'interface retombe sur le JSON puis le français, sans erreur visible.
5. Une clé comme `constructor` ou `__proto__` dans le dictionnaire ne corrompt rien et n'est jamais prise pour une traduction héritée du prototype.

---

## File Structure

| Fichier | Rôle |
|---|---|
| `db/schema/index.ts` (modif) | table `uiTranslations` |
| `db/migrations/0063_ui_translations.sql` + `meta/_journal.json` (créer/modif) | migration |
| `config/security-rls.json` (modif) | classification RLS |
| `lib/i18n/incremental.ts` (créer) | pur : `sourceHash`, `missingUiTexts`, `catalogStringsNeeded`, `applyCatalogTranslations` |
| `lib/i18n/translate.ts` (modif) | type `CatalogTranslations` + `_src`, repli vers le dictionnaire en mémoire |
| `lib/i18n/overlay.ts` (créer) | stockage mémoire client-safe du dictionnaire (par langue) |
| `lib/i18n/overlay-schema.ts` (créer) | Zod `overlayLocaleSchema` |
| `lib/i18n/overlay-server.ts` (créer) | `loadOverlay(locale)` (cache + tag), `primeOverlay(locale)` |
| `app/api/i18n/overlay/route.ts` (créer) | point de lecture public |
| `lib/i18n/use-overlay.ts` (créer) | hook client de chargement |
| `components/banani/DemoProvider.tsx` (modif) | appelle le hook |
| `app/page.tsx`, `app/s/[slug]/page.tsx`, `app/s/[slug]/not-found.tsx` (modif) | `await primeOverlay(locale)` |
| `lib/i18n/manifest.json` (créer) + `scripts/i18n-sync.mts` (modif) | manifeste généré/contrôlé |
| `lib/i18n/refresh-core.ts` (créer) | orchestrateur pur (dépendances injectées) |
| `lib/i18n/refresh-translations.ts` (créer) | câblage base + sources de catalogue |
| `lib/i18n/catalog-translate.ts` (supprimer le contenu devenu inutile) | remplacé par `incremental.ts` + `refresh-core.ts` |
| `app/admin/languages/actions.ts` (modif) | `refreshCatalogTranslations` évolue |
| `components/admin/RefreshCatalogTranslationsButton.tsx`, `app/admin/languages/page.tsx` (modif) | boucle, progression, toast, texte de la carte |
| `tests/i18n-incremental.test.ts`, `tests/i18n-overlay.test.ts`, `tests/i18n-overlay-route.test.ts`, `tests/i18n-refresh-core.test.ts` (créer) | tests |
| `CLAUDE.md` (modif) | règle i18n mise à jour |

---

### Task 1: Table `ui_translations` (schéma, migration, RLS)

**Files:**
- Modify: `db/schema/index.ts` (ajouter après `occasionFields`)
- Create: `db/migrations/0063_ui_translations.sql`
- Modify: `db/migrations/meta/_journal.json` (entrée idx 63, calquée sur l'entrée 62 ; `when` supérieur à celui de 62)
- Modify: `config/security-rls.json` (clé `exempt`)

**Interfaces:**
- Produces: export Drizzle `uiTranslations` avec colonnes `locale`, `sourceText`, `translation`, `updatedAt`, clé primaire `(locale, sourceText)`.

- [ ] **Step 1: Ajouter la table au schéma**

Ajouter l'import `primaryKey` depuis `drizzle-orm/pg-core` s'il n'est pas déjà importé, puis :

```ts
/**
 * Traductions des textes fixes de l'interface (t("...")) ajoutées depuis l'admin, au-dessus des
 * fichiers lib/i18n/locales/*.json. La clé est le texte français lui-même : s'il change, il
 * redevient « non traduit ». Voir lib/i18n/refresh-core.ts.
 */
export const uiTranslations = pgTable(
  "ui_translations",
  {
    locale: text("locale").notNull(),
    sourceText: text("source_text").notNull(),
    translation: text("translation").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.locale, table.sourceText], name: "ui_translations_locale_source_pk" }),
  }),
);
```

- [ ] **Step 2: Écrire la migration**

`db/migrations/0063_ui_translations.sql` :

```sql
CREATE TABLE IF NOT EXISTS "ui_translations" (
	"locale" text NOT NULL,
	"source_text" text NOT NULL,
	"translation" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ui_translations_locale_source_pk" PRIMARY KEY ("locale","source_text")
);
--> statement-breakpoint
GRANT SELECT ON TABLE "ui_translations" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "ui_translations" TO musikpro_service;
```

Ajouter l'entrée au journal (même forme que `0062_occasion_fields`, `idx: 63`, `tag: "0063_ui_translations"`, `breakpoints: true`).

- [ ] **Step 3: Classer la table pour le RLS**

Dans `config/security-rls.json`, section `exempt`, ajouter :

```json
"ui_translations": "global UI-text translation overlay (French source text → en/es/pt), server-managed by the admin 'Actualiser les traductions' action; contains no user data; read publicly through /api/i18n/overlay"
```

- [ ] **Step 4: Appliquer à la base de développement et vérifier**

Run: `npm run db:migrate` (utilise `.env.local` = branche de développement) puis `npm run security:baseline`
Expected: migration appliquée sans erreur ; baseline sans échec. Si `db:migrate` n'existe pas sous ce nom, lire `package.json` et utiliser le script de migration du projet.

- [ ] **Step 5: Commit**

```bash
git add db/schema/index.ts db/migrations/0063_ui_translations.sql db/migrations/meta/_journal.json config/security-rls.json
git commit -m "feat(i18n): table ui_translations pour les traductions des textes fixes"
```

---

### Task 2: Logique incrémentale pure (`incremental.ts`)

**Files:**
- Modify: `lib/i18n/translate.ts` (type `CatalogTranslations`)
- Create: `lib/i18n/incremental.ts`
- Test: `tests/i18n-incremental.test.ts`

**Interfaces:**
- Produces (`lib/i18n/incremental.ts`) :
  - `TRANSLATION_LOCALES: readonly ["en","es","pt"]`, `type TranslationLocale = "en"|"es"|"pt"`
  - `sourceHash(text: string): string` (SHA-256 du texte nettoyé, 16 premiers caractères hex)
  - `missingUiTexts(manifest: readonly string[], json: Record<string,string>, stored: ReadonlySet<string>): string[]`
  - `type CatalogRowInput = { id: string; fields: Record<string, string | null | undefined>; translations: CatalogTranslations | null | undefined }`
  - `catalogStringsNeeded(row: CatalogRowInput, locale: TranslationLocale): { needed: string[]; upToDate: number }`
  - `applyCatalogTranslations(row: CatalogRowInput, locale: TranslationLocale, translated: Record<string,string>): { translations: CatalogTranslations | null; changed: boolean; translatedFields: number }`
- Consumes: `CatalogTranslations` de `lib/i18n/translate.ts`.

- [ ] **Step 1: Étendre le type `CatalogTranslations`**

Dans `lib/i18n/translate.ts`, remplacer la définition par :

```ts
export type CatalogTranslations = Partial<Record<Exclude<Locale, "fr">, Record<string, string>>> & {
  /** Empreinte du texte français traduit, par langue puis par champ (voir lib/i18n/incremental.ts). */
  _src?: Partial<Record<Exclude<Locale, "fr">, Record<string, string>>>;
};
```

Compléter le commentaire au-dessus pour citer `_src`. Run `npm run typecheck` : aucune erreur nouvelle attendue (`localizeField` indexe par langue seulement).

- [ ] **Step 2: Écrire les tests (échouent)**

`tests/i18n-incremental.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  applyCatalogTranslations,
  catalogStringsNeeded,
  missingUiTexts,
  sourceHash,
  type CatalogRowInput,
} from "@/lib/i18n/incremental";

describe("sourceHash", () => {
  it("is stable, trims, and differs for different texts", () => {
    expect(sourceHash("Bonjour")).toBe(sourceHash("  Bonjour "));
    expect(sourceHash("Bonjour")).not.toBe(sourceHash("Bonsoir"));
    expect(sourceHash("Bonjour")).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("missingUiTexts", () => {
  it("keeps only texts absent from both the JSON dictionary and the stored table", () => {
    const manifest = ["A", "B", "C", "constructor"];
    expect(missingUiTexts(manifest, { A: "a" }, new Set(["B"]))).toEqual(["C", "constructor"]);
  });

  it("is empty when everything is translated", () => {
    expect(missingUiTexts(["A"], { A: "a" }, new Set())).toEqual([]);
  });
});

const row = (over: Partial<CatalogRowInput> = {}): CatalogRowInput => ({
  id: "r1",
  fields: { name: "Anniversaire", description: "Fêter une année de plus" },
  translations: null,
  ...over,
});

describe("catalogStringsNeeded", () => {
  it("needs every non-empty field when nothing is translated", () => {
    expect(catalogStringsNeeded(row({ fields: { name: "A", description: "" } }), "en")).toEqual({
      needed: ["A"],
      upToDate: 0,
    });
  });

  it("skips a field whose translation exists and whose source hash matches", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    expect(catalogStringsNeeded(row({ translations }), "en")).toEqual({ needed: [], upToDate: 2 });
    // another locale is untouched by the en hashes
    expect(catalogStringsNeeded(row({ translations }), "es").needed).toHaveLength(2);
  });

  it("needs only the field whose French source changed", () => {
    const translations = {
      en: { name: "Birthday", description: "Old description" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne description") } },
    };
    expect(catalogStringsNeeded(row({ translations }), "en")).toEqual({
      needed: ["Fêter une année de plus"],
      upToDate: 1,
    });
  });

  it("treats a legacy row (translation but no _src) as needing translation once", () => {
    const translations = { en: { name: "Birthday", description: "Celebrate" } };
    expect(catalogStringsNeeded(row({ translations }), "en").needed).toHaveLength(2);
  });
});

describe("applyCatalogTranslations", () => {
  it("writes new translations with their hashes and counts them", () => {
    const result = applyCatalogTranslations(row(), "en", {
      Anniversaire: "Birthday",
      "Fêter une année de plus": "Celebrate another year",
    });
    expect(result.changed).toBe(true);
    expect(result.translatedFields).toBe(2);
    expect(result.translations).toEqual({
      en: { name: "Birthday", description: "Celebrate another year" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    });
  });

  it("is a no-op when everything is already up to date", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    const result = applyCatalogTranslations(row({ translations }), "en", {});
    expect(result).toEqual({ translations, changed: false, translatedFields: 0 });
  });

  it("keeps a legacy translation visible until the new one arrives (no _src yet)", () => {
    const translations = { en: { name: "Birthday", description: "Celebrate" } };
    const result = applyCatalogTranslations(row({ translations }), "en", { Anniversaire: "Birthday party" });
    expect(result.translations?.en).toEqual({ name: "Birthday party", description: "Celebrate" });
    expect(result.translations?._src?.en).toEqual({ name: sourceHash("Anniversaire") });
  });

  it("drops a stale translation when the French source changed and no new one arrived", () => {
    const translations = {
      en: { name: "Birthday", description: "Old description" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne description") } },
    };
    const result = applyCatalogTranslations(row({ translations }), "en", {});
    expect(result.translations?.en).toEqual({ name: "Birthday" });
    expect(result.changed).toBe(true);
  });

  it("removes translations of fields that are now empty or gone, and keeps other locales", () => {
    const translations = {
      en: { name: "Birthday", description: "Celebrate", option3: "Gone" },
      es: { name: "Cumpleaños" },
      _src: { en: { name: sourceHash("Anniversaire"), description: sourceHash("Fêter une année de plus") } },
    };
    const result = applyCatalogTranslations(
      row({ fields: { name: "Anniversaire", description: "" }, translations }),
      "en",
      {},
    );
    expect(result.translations?.en).toEqual({ name: "Birthday" });
    expect(result.translations?.es).toEqual({ name: "Cumpleaños" });
    expect(result.changed).toBe(true);
  });
});
```

Run: `npx vitest run tests/i18n-incremental.test.ts` — Expected: FAIL (module absent).

- [ ] **Step 3: Implémenter**

`lib/i18n/incremental.ts` :

```ts
import { createHash } from "node:crypto";
import type { CatalogTranslations } from "./translate";

export const TRANSLATION_LOCALES = ["en", "es", "pt"] as const;
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number];

export type CatalogRowInput = {
  id: string;
  fields: Record<string, string | null | undefined>;
  translations: CatalogTranslations | null | undefined;
};

/** Empreinte courte du texte français : détecte qu'une source a changé depuis sa traduction. */
export function sourceHash(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

/** Textes du manifeste absents du JSON ET de la table : ce que le bouton doit encore traduire. */
export function missingUiTexts(
  manifest: readonly string[],
  json: Record<string, string>,
  stored: ReadonlySet<string>,
): string[] {
  return manifest.filter((key) => !Object.hasOwn(json, key) && !stored.has(key));
}

function activeFields(fields: CatalogRowInput["fields"]): Array<[string, string]> {
  return Object.entries(fields).flatMap(([key, value]) => {
    const text = value?.trim();
    return text ? [[key, text] as [string, string]] : [];
  });
}

function isFresh(row: CatalogRowInput, locale: TranslationLocale, field: string, text: string): boolean {
  return Boolean(row.translations?.[locale]?.[field]) && row.translations?._src?.[locale]?.[field] === sourceHash(text);
}

/** Champs d'une ligne à (re)traduire pour une langue, et nombre de champs déjà à jour. */
export function catalogStringsNeeded(
  row: CatalogRowInput,
  locale: TranslationLocale,
): { needed: string[]; upToDate: number } {
  const needed: string[] = [];
  let upToDate = 0;
  for (const [field, text] of activeFields(row.fields)) {
    if (isFresh(row, locale, field, text)) upToDate += 1;
    else needed.push(text);
  }
  return { needed, upToDate };
}

function sameRecord(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/**
 * Applique les traductions reçues à une ligne pour une langue.
 * - champ à jour (empreinte identique) : conservé ;
 * - traduction reçue : écrite avec son empreinte ;
 * - ligne héritée (aucune empreinte) sans traduction reçue : l'ancienne valeur reste affichée, sans empreinte ;
 * - source modifiée sans traduction reçue : l'ancienne valeur est retirée (retombe sur le français) ;
 * - champ vide ou disparu : sa traduction est retirée.
 */
export function applyCatalogTranslations(
  row: CatalogRowInput,
  locale: TranslationLocale,
  translated: Record<string, string>,
): { translations: CatalogTranslations | null; changed: boolean; translatedFields: number } {
  const previous = row.translations?.[locale] ?? {};
  const previousSrc = row.translations?._src?.[locale] ?? {};
  const values: Record<string, string> = {};
  const hashes: Record<string, string> = {};
  let translatedFields = 0;

  for (const [field, text] of activeFields(row.fields)) {
    const hash = sourceHash(text);
    const received = translated[text];
    if (isFresh(row, locale, field, text)) {
      values[field] = previous[field];
      hashes[field] = hash;
    } else if (received) {
      values[field] = received;
      hashes[field] = hash;
      translatedFields += 1;
    } else if (previous[field] && previousSrc[field] === undefined) {
      values[field] = previous[field];
    }
  }

  if (sameRecord(previous, values) && sameRecord(previousSrc, hashes)) {
    return { translations: row.translations ?? null, changed: false, translatedFields: 0 };
  }

  const next: CatalogTranslations = { ...(row.translations ?? {}) };
  if (Object.keys(values).length) next[locale] = values;
  else delete next[locale];
  const src = { ...(row.translations?._src ?? {}) };
  if (Object.keys(hashes).length) src[locale] = hashes;
  else delete src[locale];
  if (Object.keys(src).length) next._src = src;
  else delete next._src;
  return { translations: next, changed: true, translatedFields };
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/i18n-incremental.test.ts` — Expected: PASS ; `npm run typecheck` — Expected: sans erreur.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/translate.ts lib/i18n/incremental.ts tests/i18n-incremental.test.ts
git commit -m "feat(i18n): logique incrémentale pure (manque, empreinte, application au catalogue)"
```

---

### Task 3: Dictionnaire en mémoire et repli dans `translate()`

**Files:**
- Create: `lib/i18n/overlay.ts`, `lib/i18n/overlay-schema.ts`
- Modify: `lib/i18n/translate.ts` (`translateForLocale`)
- Test: `tests/i18n-overlay.test.ts`

**Interfaces:**
- Produces (`lib/i18n/overlay.ts`, sans dépendance serveur) : `type OverlayLocale = "en"|"es"|"pt"`, `getOverlayEntry(locale: string, text: string): string | undefined`, `setOverlay(locale: OverlayLocale, dictionary: Record<string,string>): void`, `subscribeOverlay(listener: () => void): () => void`, `getOverlayVersion(): number`, `resetOverlayForTests(): void`.
- Produces (`overlay-schema.ts`) : `overlayLocaleSchema = z.enum(["en","es","pt"])`.

- [ ] **Step 1: Tests (échouent)**

`tests/i18n-overlay.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getOverlayEntry,
  getOverlayVersion,
  resetOverlayForTests,
  setOverlay,
  subscribeOverlay,
} from "@/lib/i18n/overlay";
import { overlayLocaleSchema } from "@/lib/i18n/overlay-schema";
import { translateForLocale } from "@/lib/i18n/translate";

beforeEach(() => resetOverlayForTests());

describe("overlay store", () => {
  it("returns an entry only for texts it owns", () => {
    setOverlay("en", { "Texte inédit": "Brand new text" });
    expect(getOverlayEntry("en", "Texte inédit")).toBe("Brand new text");
    expect(getOverlayEntry("es", "Texte inédit")).toBeUndefined();
    expect(getOverlayEntry("en", "constructor")).toBeUndefined();
    expect(getOverlayEntry("en", "__proto__")).toBeUndefined();
  });

  it("notifies subscribers and bumps the version on every set", () => {
    const listener = vi.fn();
    const stop = subscribeOverlay(listener);
    const before = getOverlayVersion();
    setOverlay("pt", { A: "a" });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(getOverlayVersion()).toBe(before + 1);
    stop();
    setOverlay("pt", { A: "b" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("translateForLocale with the overlay", () => {
  it("keeps French untouched", () => {
    setOverlay("en", { Bonjour: "Hello!" });
    expect(translateForLocale("Bonjour", "fr")).toBe("Bonjour");
  });

  it("falls back to the overlay when the JSON dictionary has no entry", () => {
    setOverlay("en", { "Texte inédit": "Brand new text" });
    expect(translateForLocale("Texte inédit", "en")).toBe("Brand new text");
  });

  it("prefers the JSON dictionary over the overlay", () => {
    const jsonKey = "Mes paroles"; // present in lib/i18n/locales/en.json
    setOverlay("en", { [jsonKey]: "OVERLAY" });
    expect(translateForLocale(jsonKey, "en")).not.toBe("OVERLAY");
  });

  it("falls back to French when nobody knows the text", () => {
    expect(translateForLocale("Texte totalement inconnu", "es")).toBe("Texte totalement inconnu");
  });
});

describe("overlayLocaleSchema", () => {
  it("accepts en/es/pt only", () => {
    expect(overlayLocaleSchema.safeParse("en").success).toBe(true);
    expect(overlayLocaleSchema.safeParse("fr").success).toBe(false);
    expect(overlayLocaleSchema.safeParse("de").success).toBe(false);
    expect(overlayLocaleSchema.safeParse(null).success).toBe(false);
  });
});
```

Run: `npx vitest run tests/i18n-overlay.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implémenter le stockage**

`lib/i18n/overlay.ts` :

```ts
/**
 * Dictionnaire en mémoire des traductions de textes fixes stockées en base (table ui_translations),
 * consulté par translate() après les fichiers JSON. Sans dépendance serveur : importé côté client
 * (hook use-overlay) comme côté serveur (pages rendues avec primeOverlay).
 */
export type OverlayLocale = "en" | "es" | "pt";

const overlays: Partial<Record<OverlayLocale, Record<string, string>>> = {};
const listeners = new Set<() => void>();
let version = 0;

export function getOverlayEntry(locale: string, text: string): string | undefined {
  const dictionary = overlays[locale as OverlayLocale];
  return dictionary && Object.hasOwn(dictionary, text) ? dictionary[text] : undefined;
}

export function setOverlay(locale: OverlayLocale, dictionary: Record<string, string>): void {
  overlays[locale] = dictionary;
  version += 1;
  for (const listener of listeners) listener();
}

export function subscribeOverlay(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getOverlayVersion(): number {
  return version;
}

export function resetOverlayForTests(): void {
  for (const key of Object.keys(overlays)) delete overlays[key as OverlayLocale];
  listeners.clear();
}
```

`lib/i18n/overlay-schema.ts` :

```ts
import { z } from "zod";

export const overlayLocaleSchema = z.enum(["en", "es", "pt"]);
```

- [ ] **Step 3: Brancher le repli dans `translate.ts`**

Ajouter `import { getOverlayEntry } from "./overlay";` et remplacer le corps de `translateForLocale` :

```ts
export function translateForLocale(text: string, locale: Locale): string {
  if (locale === "fr") return text;
  return dictionaries[locale]?.[text] ?? getOverlayEntry(locale, text) ?? text;
}
```

Mettre à jour le commentaire de `dictionaries` : « complété par le dictionnaire en base (lib/i18n/overlay.ts) rempli par le bouton Actualiser les traductions ».

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/i18n-overlay.test.ts tests/i18n-incremental.test.ts` — Expected: PASS ; `npm run typecheck`.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n/overlay.ts lib/i18n/overlay-schema.ts lib/i18n/translate.ts tests/i18n-overlay.test.ts
git commit -m "feat(i18n): dictionnaire en mémoire consulté par translate() après les fichiers JSON"
```

---

### Task 4: Manifeste des textes français

**Files:**
- Modify: `scripts/i18n-sync.mts`
- Create: `lib/i18n/manifest.json` (généré)

**Interfaces:**
- Produces: `lib/i18n/manifest.json` = tableau JSON trié (`localeCompare` « fr ») des clés (`usedKeys` y compris `MANUAL_KEYS`).

- [ ] **Step 1: Écrire/contrôler le manifeste dans le scanner**

Dans `scripts/i18n-sync.mts`, après le calcul de `usedKeys` et le `console.log` « Scanned … » :

```ts
const MANIFEST_FILE = path.join(ROOT, "lib/i18n/manifest.json");

function manifestSource(keys: Set<string>): string {
  return JSON.stringify([...keys].sort((a, b) => a.localeCompare(b, "fr")), null, 2) + "\n";
}
```

(la fonction et la constante se placent avec les autres helpers, avant `main`). Puis dans `main`, juste après le `console.log` du scan :

```ts
  const expectedManifest = manifestSource(usedKeys);
  let manifestStale = false;
  try {
    manifestStale = readFileSync(MANIFEST_FILE, "utf8") !== expectedManifest;
  } catch {
    manifestStale = true;
  }
  if (manifestStale) {
    if (CHECK_ONLY) {
      anyMissing = true;
      console.error("  manifest: lib/i18n/manifest.json is out of date.");
    } else {
      writeFileSync(MANIFEST_FILE, expectedManifest);
      console.log(`  manifest: written (${usedKeys.size} keys).`);
    }
  } else {
    console.log(`  manifest: up to date (${usedKeys.size} keys).`);
  }
```

Déplacer la déclaration `let anyMissing = false;` **avant** ce bloc (elle est actuellement après) pour qu'elle soit visible. Mettre à jour le message final du mode `--check` : « Some locales are missing translations or the manifest is stale. Run `npm run i18n:sync`. ». Mettre à jour le commentaire d'en-tête du fichier (mentionner le manifeste).

- [ ] **Step 2: Générer le manifeste**

Run: `npx tsx --env-file=.env.local scripts/i18n-sync.mts`
Expected: « manifest: written », JSON déjà à jour (« up to date ») sauf nouveaux textes ; si le scanner trouve des clés manquantes dans les JSON il les traduit (comportement existant, acceptable : committer alors les JSON). Vérifier que `lib/i18n/manifest.json` contient ~434+ clés et qu'aucune clé parasite (comme « … ») n'apparaît.

- [ ] **Step 3: Vérifier le contrôle**

Run: `npm run i18n:check` — Expected: exit 0. Puis modifier temporairement une ligne du manifeste, relancer, vérifier l'échec, restaurer (`git checkout`/ré-édition) et relancer : exit 0.

- [ ] **Step 4: Commit**

```bash
git add scripts/i18n-sync.mts lib/i18n/manifest.json lib/i18n/locales
git commit -m "feat(i18n): manifeste versionné des textes français, contrôlé par i18n:check"
```

---

### Task 5: Lecture serveur du dictionnaire (cache, point de lecture, pages serveur)

**Files:**
- Create: `lib/i18n/overlay-server.ts`, `app/api/i18n/overlay/route.ts`
- Modify: `config/security-routes.json`, `app/page.tsx`, `app/s/[slug]/page.tsx`, `app/s/[slug]/not-found.tsx`
- Test: `tests/i18n-overlay-route.test.ts`

**Interfaces:**
- Consumes: `uiTranslations` (Task 1), `overlayLocaleSchema`, `setOverlay`.
- Produces: `OVERLAY_TAG = "i18n-overlay"`, `loadOverlay(locale: OverlayLocale): Promise<Record<string,string>>` (mis en cache, étiqueté), `primeOverlay(locale: Locale): Promise<void>` (no-op pour `fr` ; sinon `setOverlay(locale, await loadOverlay(locale))`, erreur avalée).

- [ ] **Step 1: Test du point de lecture (échoue)**

`tests/i18n-overlay-route.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const loadOverlay = vi.hoisted(() => vi.fn(async () => ({ "Texte inédit": "Brand new text" })));
vi.mock("@/lib/i18n/overlay-server", () => ({ loadOverlay }));

import { GET } from "@/app/api/i18n/overlay/route";

const call = (query: string) => GET(new Request(`http://localhost/api/i18n/overlay${query}`));

describe("GET /api/i18n/overlay", () => {
  it("returns the dictionary of a valid locale, publicly cacheable", async () => {
    const response = await call("?locale=en");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ "Texte inédit": "Brand new text" });
    expect(response.headers.get("Cache-Control")).toContain("public");
    expect(loadOverlay).toHaveBeenCalledWith("en");
  });

  it.each(["", "?locale=fr", "?locale=de", "?locale=__proto__"])("rejects %s with 400 and no cache", async (query) => {
    const response = await call(query);
    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
```

Run: `npx vitest run tests/i18n-overlay-route.test.ts` — Expected: FAIL.

- [ ] **Step 2: Chargeur serveur**

`lib/i18n/overlay-server.ts` :

```ts
import "server-only";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { uiTranslations } from "@/db/schema";
import { setOverlay, type OverlayLocale } from "./overlay";
import type { Locale } from "./translate";

export const OVERLAY_TAG = "i18n-overlay";

/** Dictionnaire { texte français → traduction } d'une langue, lu en base et mis en cache jusqu'à la prochaine actualisation. */
export async function loadOverlay(locale: OverlayLocale): Promise<Record<string, string>> {
  return unstable_cache(
    async () => {
      const rows = await db
        .select({ source: uiTranslations.sourceText, translation: uiTranslations.translation })
        .from(uiTranslations)
        .where(eq(uiTranslations.locale, locale));
      return Object.fromEntries(rows.map((row) => [row.source, row.translation]));
    },
    [OVERLAY_TAG, locale],
    { tags: [OVERLAY_TAG] },
  )();
}

/** Pour une page rendue côté serveur : charge le dictionnaire avant d'appeler translateForLocale(). Sans effet en français ; une panne retombe sur les fichiers JSON. */
export async function primeOverlay(locale: Locale): Promise<void> {
  if (locale === "fr") return;
  try {
    setOverlay(locale, await loadOverlay(locale));
  } catch {
    // Repli : fichiers JSON puis français.
  }
}
```

Si l'API `unstable_cache` a changé dans Next 16.3, lire `node_modules/next/dist/docs/` et adapter (même comportement : cache par locale + tag `OVERLAY_TAG`).

- [ ] **Step 3: Point de lecture**

`app/api/i18n/overlay/route.ts` :

```ts
import { NextResponse } from "next/server";
import { overlayLocaleSchema } from "@/lib/i18n/overlay-schema";
import { loadOverlay } from "@/lib/i18n/overlay-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const locale = overlayLocaleSchema.safeParse(new URL(request.url).searchParams.get("locale"));
  if (!locale.success) {
    return NextResponse.json({ error: "invalid_locale" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json(await loadOverlay(locale.data), {
    headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
  });
}
```

- [ ] **Step 4: Classer la route**

Dans `config/security-routes.json`, section `routes` :

```json
"app/api/i18n/overlay/route.ts": {
  "auth": "public-read",
  "validation": "zod-query",
  "rateLimit": "cacheable-read-exempt",
  "markers": ["safeParse("]
}
```

Si `config/zod-validation.json` ou `config/features.json` exigent une déclaration pour cette route, l'ajouter dans le même esprit (lancer les contrôles de l'étape 6 pour le savoir).

- [ ] **Step 5: Amorcer le dictionnaire dans les pages serveur**

Dans `app/page.tsx` (juste avant `const t = (text: string) => translateForLocale(text, locale);`, ligne ~125), dans `app/s/[slug]/page.tsx` (aux deux endroits où `locale` est résolu, lignes ~18 et ~37) et dans `app/s/[slug]/not-found.tsx` (ligne ~7) : ajouter `await primeOverlay(locale);` après la résolution de `locale`, et l'import `import { primeOverlay } from "@/lib/i18n/overlay-server";`. Ces fonctions doivent être `async` (vérifier ; `not-found` l'est déjà puisqu'il `await headers()`).

- [ ] **Step 6: Vérifier**

Run: `npx vitest run tests/i18n-overlay-route.test.ts` — PASS ; `npm run typecheck` ; `npm run security:baseline` ; `npm run validation:zod-check` ; `npm run features:check` — tous sans échec.

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/overlay-server.ts app/api/i18n/overlay/route.ts config/security-routes.json app/page.tsx "app/s/[slug]/page.tsx" "app/s/[slug]/not-found.tsx" tests/i18n-overlay-route.test.ts
git commit -m "feat(i18n): lecture publique et mise en cache du dictionnaire en base, amorçage des pages serveur"
```

---

### Task 6: Chargement côté client (hook + `DemoProvider`)

**Files:**
- Create: `lib/i18n/use-overlay.ts`
- Modify: `components/banani/DemoProvider.tsx` (composant `DemoProvider`, près de la ligne 1038)

**Interfaces:**
- Consumes: `setOverlay`, `subscribeOverlay`, `getOverlayVersion`, `overlayLocaleSchema`.
- Produces: `useI18nOverlay(): void` — s'abonne au dictionnaire (re-rendu quand il arrive) et le charge quand `document.documentElement.lang` n'est pas `fr`, au montage et à chaque changement de `lang`.

- [ ] **Step 1: Écrire le hook**

`lib/i18n/use-overlay.ts` :

```ts
"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getOverlayVersion, setOverlay, subscribeOverlay } from "./overlay";
import { overlayLocaleSchema } from "./overlay-schema";

const REFETCH_AFTER_MS = 60_000;
const loadedAt = new Map<string, number>();

function isDictionary(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

async function loadCurrentLocale() {
  const parsed = overlayLocaleSchema.safeParse(document.documentElement.lang.split("-")[0]);
  if (!parsed.success) return; // français ou langue inconnue : rien à charger
  const locale = parsed.data;
  const last = loadedAt.get(locale);
  if (last && Date.now() - last < REFETCH_AFTER_MS) return;
  loadedAt.set(locale, Date.now());
  try {
    const response = await fetch(`/api/i18n/overlay?locale=${locale}`);
    if (!response.ok) throw new Error("overlay unavailable");
    const dictionary: unknown = await response.json();
    if (isDictionary(dictionary)) setOverlay(locale, dictionary);
  } catch {
    loadedAt.delete(locale); // repli silencieux sur les fichiers JSON ; nouvel essai au prochain changement de langue
  }
}

/** Charge les traductions de la base pour la langue courante et re-rend le composant quand elles arrivent. */
export function useI18nOverlay(): void {
  useSyncExternalStore(subscribeOverlay, getOverlayVersion, () => 0);
  useEffect(() => {
    void loadCurrentLocale();
    const observer = new MutationObserver(() => void loadCurrentLocale());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
}
```

- [ ] **Step 2: L'appeler dans `DemoProvider`**

Dans `components/banani/DemoProvider.tsx` : importer `useI18nOverlay` depuis `@/lib/i18n/use-overlay` et appeler `useI18nOverlay();` dans le composant qui rend `<Context.Provider value={state}>` (au début, à côté du `useState(offline)`). `state` est recréé à chaque rendu (aucun `useMemo`) : vérifier qu'il en est bien ainsi ; l'arrivée du dictionnaire re-rend alors tous les consommateurs du contexte. Si `state` était mémoïsé, inclure `getOverlayVersion()` dans ses dépendances.

- [ ] **Step 3: Vérifier**

Run: `npm run typecheck && npm run lint && npm run ui:hydration-check` — Expected: sans erreur (le hook n'écrit rien pendant le rendu, aucun risque d'hydratation).

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/use-overlay.ts components/banani/DemoProvider.tsx
git commit -m "feat(i18n): le client charge les traductions de la base pour la langue courante"
```

---

### Task 7: Orchestrateur pur (`refresh-core.ts`)

**Files:**
- Create: `lib/i18n/refresh-core.ts`
- Test: `tests/i18n-refresh-core.test.ts`

**Interfaces:**
- Consumes: Task 2 (`TRANSLATION_LOCALES`, `missingUiTexts`, `catalogStringsNeeded`, `applyCatalogTranslations`, `CatalogRowInput`).
- Produces:
  - `type CatalogSource = { key: string; rows: CatalogRowInput[]; save: (id: string, translations: CatalogTranslations) => Promise<void> }`
  - `type RefreshDeps = { manifest: readonly string[]; json: Record<TranslationLocale, Record<string,string>>; stored: Record<TranslationLocale, ReadonlySet<string>>; sources: CatalogSource[]; translateBatch: (locale: TranslationLocale, strings: string[]) => Promise<Record<string,string>>; saveUi: (locale: TranslationLocale, entries: Record<string,string>) => Promise<void>; maxBatches: number; batchSize: number }`
  - `type RefreshResult = { translated: number; alreadyUpToDate: number; remaining: number; ui: { translated: number; alreadyUpToDate: number }; catalog: { translated: number; alreadyUpToDate: number }; error: unknown | null }`
  - `runRefresh(deps: RefreshDeps): Promise<RefreshResult>`

- [ ] **Step 1: Tests (échouent)**

`tests/i18n-refresh-core.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";
import { sourceHash } from "@/lib/i18n/incremental";
import { runRefresh, type CatalogSource, type RefreshDeps } from "@/lib/i18n/refresh-core";
import type { CatalogTranslations } from "@/lib/i18n/translate";

const upper = (_locale: string, strings: string[]) =>
  Promise.resolve(Object.fromEntries(strings.map((s) => [s, `T(${s})`])));

function makeDeps(over: Partial<RefreshDeps> = {}) {
  const savedUi: Array<{ locale: string; entries: Record<string, string> }> = [];
  const savedRows: Array<{ id: string; translations: CatalogTranslations }> = [];
  const source: CatalogSource = {
    key: "occasions",
    rows: [{ id: "o1", fields: { name: "Anniversaire" }, translations: null }],
    save: async (id, translations) => {
      savedRows.push({ id, translations });
    },
  };
  const deps: RefreshDeps = {
    manifest: ["Bonjour", "Merci"],
    json: { en: { Bonjour: "Hello" }, es: {}, pt: {} },
    stored: { en: new Set(), es: new Set(), pt: new Set() },
    sources: [source],
    translateBatch: vi.fn(upper),
    saveUi: async (locale, entries) => {
      savedUi.push({ locale, entries });
    },
    maxBatches: 5,
    batchSize: 40,
    ...over,
  };
  return { deps, savedUi, savedRows };
}

describe("runRefresh", () => {
  it("translates only what is missing, for UI texts and catalog fields", async () => {
    const { deps, savedUi, savedRows } = makeDeps();
    const result = await runRefresh(deps);
    // en: only "Merci" (UI) + "Anniversaire" (catalog); es/pt: both UI texts + catalog
    expect(deps.translateBatch).toHaveBeenCalledWith("en", ["Merci", "Anniversaire"]);
    expect(deps.translateBatch).toHaveBeenCalledWith("es", ["Bonjour", "Merci", "Anniversaire"]);
    expect(savedUi.find((s) => s.locale === "en")?.entries).toEqual({ Merci: "T(Merci)" });
    expect(savedRows).toHaveLength(1);
    expect(savedRows[0].translations.en).toEqual({ name: "T(Anniversaire)" });
    expect(savedRows[0].translations._src?.en).toEqual({ name: sourceHash("Anniversaire") });
    expect(result.error).toBeNull();
    expect(result.remaining).toBe(0);
    expect(result.ui).toEqual({ translated: 1 + 2 + 2, alreadyUpToDate: 1 });
    expect(result.catalog.translated).toBe(3);
  });

  it("translates nothing on a second run fed with the first run's output", async () => {
    const first = makeDeps();
    await runRefresh(first.deps);
    const stored = { en: new Set<string>(), es: new Set<string>(), pt: new Set<string>() };
    for (const { locale, entries } of first.savedUi) for (const key of Object.keys(entries)) stored[locale as "en"].add(key);
    const second = makeDeps({
      stored,
      sources: [{ key: "occasions", rows: [{ id: "o1", fields: { name: "Anniversaire" }, translations: first.savedRows[0].translations }], save: async () => {} }],
    });
    const result = await runRefresh(second.deps);
    expect(second.deps.translateBatch).not.toHaveBeenCalled();
    expect(result.translated).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.alreadyUpToDate).toBeGreaterThan(0);
  });

  it("retranslates only the catalog field whose source changed", async () => {
    const translations: CatalogTranslations = {
      en: { name: "Birthday", description: "Old" },
      es: { name: "Cumpleaños", description: "Viejo" },
      pt: { name: "Aniversário", description: "Velho" },
      _src: Object.fromEntries(
        (["en", "es", "pt"] as const).map((l) => [l, { name: sourceHash("Anniversaire"), description: sourceHash("Ancienne") }]),
      ),
    };
    const { deps, savedRows } = makeDeps({
      manifest: [],
      json: { en: {}, es: {}, pt: {} },
      sources: [{ key: "occasions", rows: [{ id: "o1", fields: { name: "Anniversaire", description: "Nouvelle" }, translations }], save: async (id, t) => { savedRows.push({ id, translations: t }); } }],
    });
    await runRefresh(deps);
    expect(deps.translateBatch).toHaveBeenCalledTimes(3);
    for (const call of vi.mocked(deps.translateBatch).mock.calls) expect(call[1]).toEqual(["Nouvelle"]);
    expect(savedRows[0].translations.en).toEqual({ name: "Birthday", description: "T(Nouvelle)" });
  });

  it("stops at the batch cap and reports what remains", async () => {
    const manifest = Array.from({ length: 100 }, (_, i) => `Texte ${i}`);
    const { deps, savedUi } = makeDeps({ manifest, json: { en: {}, es: {}, pt: {} }, sources: [], maxBatches: 2, batchSize: 40 });
    const result = await runRefresh(deps);
    expect(deps.translateBatch).toHaveBeenCalledTimes(2);
    expect(savedUi.reduce((n, s) => n + Object.keys(s.entries).length, 0)).toBe(80);
    expect(result.translated).toBe(80);
    expect(result.remaining).toBe(300 - 80);
  });

  it("persists what is already translated when the provider fails, and reports the error", async () => {
    const manifest = Array.from({ length: 50 }, (_, i) => `Texte ${i}`);
    const translateBatch = vi
      .fn<RefreshDeps["translateBatch"]>()
      .mockImplementationOnce(upper)
      .mockRejectedValueOnce(new Error("AI down"));
    const { deps, savedUi } = makeDeps({ manifest, json: { en: {}, es: {}, pt: {} }, sources: [], translateBatch });
    const result = await runRefresh(deps);
    expect(savedUi).toHaveLength(1);
    expect(Object.keys(savedUi[0].entries)).toHaveLength(40);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.remaining).toBe(150 - 40);
  });

  it("counts a string the provider omitted as remaining, without writing it", async () => {
    const { deps, savedUi } = makeDeps({
      sources: [],
      translateBatch: vi.fn(async (_l, strings: string[]) => Object.fromEntries(strings.filter((s) => s !== "Merci").map((s) => [s, `T(${s})`]))),
    });
    const result = await runRefresh(deps);
    expect(savedUi.every((s) => !("Merci" in s.entries))).toBe(true);
    expect(result.remaining).toBe(3); // "Merci" for en, es, pt
  });
});
```

Run: `npx vitest run tests/i18n-refresh-core.test.ts` — Expected: FAIL.

- [ ] **Step 2: Implémenter**

`lib/i18n/refresh-core.ts` :

```ts
import {
  TRANSLATION_LOCALES,
  applyCatalogTranslations,
  catalogStringsNeeded,
  missingUiTexts,
  type CatalogRowInput,
  type TranslationLocale,
} from "./incremental";
import type { CatalogTranslations } from "./translate";

export type CatalogSource = {
  key: string;
  rows: CatalogRowInput[];
  save: (id: string, translations: CatalogTranslations) => Promise<void>;
};

export type RefreshDeps = {
  manifest: readonly string[];
  json: Record<TranslationLocale, Record<string, string>>;
  stored: Record<TranslationLocale, ReadonlySet<string>>;
  sources: CatalogSource[];
  translateBatch: (locale: TranslationLocale, strings: string[]) => Promise<Record<string, string>>;
  saveUi: (locale: TranslationLocale, entries: Record<string, string>) => Promise<void>;
  maxBatches: number;
  batchSize: number;
};

export type RefreshResult = {
  translated: number;
  alreadyUpToDate: number;
  remaining: number;
  ui: { translated: number; alreadyUpToDate: number };
  catalog: { translated: number; alreadyUpToDate: number };
  error: unknown | null;
};

/**
 * Une passe de l'actualisation : calcule ce qui manque (textes fixes + catalogue, par langue),
 * traduit au plus `maxBatches` lots, écrit tout ce qui a été obtenu — même si l'IA échoue en cours
 * de route — et dit combien il reste. Aucune dépendance base/IA : tout est injecté (testable).
 */
export async function runRefresh(deps: RefreshDeps): Promise<RefreshResult> {
  const jobs = TRANSLATION_LOCALES.map((locale) => {
    const uiMissing = missingUiTexts(deps.manifest, deps.json[locale], deps.stored[locale]);
    const catalogNeeded = new Set<string>();
    let catalogUpToDate = 0;
    for (const source of deps.sources) {
      for (const row of source.rows) {
        const { needed, upToDate } = catalogStringsNeeded(row, locale);
        for (const text of needed) catalogNeeded.add(text);
        catalogUpToDate += upToDate;
      }
    }
    return {
      locale,
      uiMissing: new Set(uiMissing),
      pool: [...new Set([...uiMissing, ...catalogNeeded])],
      uiUpToDate: deps.manifest.length - uiMissing.length,
      catalogUpToDate,
    };
  });

  const translated: Record<TranslationLocale, Record<string, string>> = { en: {}, es: {}, pt: {} };
  let budget = deps.maxBatches;
  let error: unknown = null;
  try {
    outer: for (const job of jobs) {
      for (let i = 0; i < job.pool.length; i += deps.batchSize) {
        if (budget <= 0) break outer;
        budget -= 1;
        Object.assign(translated[job.locale], await deps.translateBatch(job.locale, job.pool.slice(i, i + deps.batchSize)));
      }
    }
  } catch (caught) {
    error = caught;
  }

  let uiTranslated = 0;
  for (const job of jobs) {
    const entries = Object.fromEntries(
      job.pool.filter((text) => job.uiMissing.has(text) && translated[job.locale][text]).map((text) => [text, translated[job.locale][text]]),
    );
    const count = Object.keys(entries).length;
    if (count) {
      await deps.saveUi(job.locale, entries);
      uiTranslated += count;
    }
  }

  let catalogTranslated = 0;
  for (const source of deps.sources) {
    await Promise.all(
      source.rows.map(async (row) => {
        let current = row.translations ?? null;
        let rowChanged = false;
        for (const locale of TRANSLATION_LOCALES) {
          const result = applyCatalogTranslations({ ...row, translations: current }, locale, translated[locale]);
          if (result.changed) {
            current = result.translations;
            rowChanged = true;
            catalogTranslated += result.translatedFields;
          }
        }
        if (rowChanged && current) await source.save(row.id, current);
      }),
    );
  }

  const remaining = jobs.reduce((sum, job) => sum + job.pool.filter((text) => !translated[job.locale][text]).length, 0);
  const uiUpToDate = jobs.reduce((sum, job) => sum + job.uiUpToDate, 0);
  const catalogUpToDate = jobs.reduce((sum, job) => sum + job.catalogUpToDate, 0);
  return {
    translated: uiTranslated + catalogTranslated,
    alreadyUpToDate: uiUpToDate + catalogUpToDate,
    remaining,
    ui: { translated: uiTranslated, alreadyUpToDate: uiUpToDate },
    catalog: { translated: catalogTranslated, alreadyUpToDate: catalogUpToDate },
    error,
  };
}
```

Vérifier que le premier test passe exactement avec les chiffres écrits (`ui.translated`: en 1 + es 2 + pt 2 = 5 ; `catalog.translated`: 3 ; `alreadyUpToDate.ui`: 1 — « Bonjour » est dans le JSON `en`). Si un chiffre du test est faux par erreur d'arithmétique de ce plan, corriger **le test** après avoir vérifié le calcul à la main, jamais l'implémentation pour qu'elle colle.

- [ ] **Step 3: Vérifier**

Run: `npx vitest run tests/i18n-refresh-core.test.ts` — PASS ; `npm run typecheck`.

- [ ] **Step 4: Commit**

```bash
git add lib/i18n/refresh-core.ts tests/i18n-refresh-core.test.ts
git commit -m "feat(i18n): orchestrateur incrémental (manque, lots plafonnés, écriture partielle)"
```

---

### Task 8: Câblage serveur et action `refreshCatalogTranslations`

**Files:**
- Create: `lib/i18n/refresh-translations.ts`
- Modify: `app/admin/languages/actions.ts` (remplacer `runCatalogTranslationsRefresh` et adapter `refreshCatalogTranslations`)
- Modify: `lib/i18n/catalog-translate.ts` (supprimer `translateCatalogTable` ; garder `CATALOG_LOCALES`/`BATCH_SIZE` seulement s'ils servent encore — sinon supprimer le fichier)
- Modify: `lib/occasion-fields/types.ts` (si un commentaire cite `translateCatalogTable`, le mettre à jour)

**Interfaces:**
- Consumes: Task 1 (`uiTranslations`), Task 5 (`OVERLAY_TAG`), Task 7 (`runRefresh`, `CatalogSource`), `translateBatch`, `manifest.json`, JSON `en/es/pt`.
- Produces: `runTranslationsRefresh(): Promise<RefreshResult & { counts: Counts }>` où `Counts = { occasions, moods, musicStyles, recipientRelations, plans, phonePrefixes, heroAnimatedTexts, occasionFields }` (nombres de lignes, comme avant) ; constantes `MAX_BATCHES_PER_CALL = 5`, `BATCH_SIZE = 40`.

- [ ] **Step 1: Écrire `refresh-translations.ts`**

Structure (reprendre **exactement** les champs et les `.set(...)` de l'ancien `runCatalogTranslationsRefresh`, dans cet ordre) :

```ts
import "server-only";
import { eq, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { /* mêmes tables que dans actions.ts */ uiTranslations } from "@/db/schema";
import { creditPlanFeaturesSchema } from "@/lib/credit-plans/catalog";
import { fieldTranslationInput } from "@/lib/occasion-fields/types";
import { translateBatch } from "./ai-translate";
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import manifest from "./manifest.json";
import { TRANSLATION_LOCALES, type TranslationLocale } from "./incremental";
import { runRefresh, type CatalogSource, type RefreshResult } from "./refresh-core";

export const MAX_BATCHES_PER_CALL = 5;
export const BATCH_SIZE = 40;
```

- Lire les tables avec `getServiceDb().select().from(...)` comme avant (les 9 requêtes en `Promise.all`), puis construire la liste `sources: CatalogSource[]` — une entrée par table :

| `key` | table | champs (`fields`) | `.set` à l'écriture |
|---|---|---|---|
| `occasions` | `occasions` | `name`, `description` | `{ translations, updatedAt: new Date() }` |
| `moods` | `moods` | `name`, `description` | `{ translations, updatedAt: new Date() }` |
| `musicStyles` | `musicStyles` | `name`, `description` | `{ translations, updatedAt: new Date() }` |
| `recipientRelations` | `recipientRelations` | `name` | `{ translations, updatedAt: new Date() }` |
| `plans` | `plans` | `name`, `description`, `bonus` (`creditPlanFeaturesSchema.safeParse(row.features)` → `features.data.bonus`, sinon `null`) | `{ translations }` (pas de `updatedAt`) |
| `phonePrefixes` | `phonePrefixes` | `countryName` | `{ translations, updatedAt: new Date() }` |
| `heroAnimatedTexts` | `heroAnimatedTexts` | `label` | `{ translations, updatedAt: new Date() }` |
| `heroAnimationSettings` | `heroAnimationSettings` | `headline` | `{ translations }` (pas de `updatedAt`) |
| `occasionFields` | `occasionFields` | `fieldTranslationInput({ label, helpText, placeholder, options: (row.options ?? []) as Array<{ label: string; emoji: string }> })` | `{ translations, updatedAt: new Date() }` |

  Chaque `rows` : `{ id: row.id, fields, translations: row.translations as CatalogTranslations | null }`. `save(id, translations)` : `serviceDb.update(table).set({...}).where(eq(table.id, id))`.
- `json = { en, es, pt }` ; `stored` : pour chaque langue, `new Set((await serviceDb.select({ s: uiTranslations.sourceText }).from(uiTranslations).where(eq(uiTranslations.locale, locale))).map(r => r.s))`.
- `saveUi(locale, entries)` : un `insert(uiTranslations).values(Object.entries(entries).map(([sourceText, translation]) => ({ locale, sourceText, translation }))).onConflictDoUpdate({ target: [uiTranslations.locale, uiTranslations.sourceText], set: { translation: sql\`excluded.translation\`, updatedAt: new Date() } })`, par tranches de 200 lignes.
- Appeler `runRefresh({ manifest, json, stored, sources, translateBatch, saveUi, maxBatches: MAX_BATCHES_PER_CALL, batchSize: BATCH_SIZE })`.
- Si `result.ui.translated > 0` : `revalidateTag(OVERLAY_TAG, …)` (signature Next 16 à vérifier dans les docs ; ex. `revalidateTag(OVERLAY_TAG, "max")`).
- Retourner `{ ...result, counts }` avec `counts` = nombre de lignes par source (clé du `Counts` ci-dessus).

- [ ] **Step 2: Faire évoluer l'action**

Dans `app/admin/languages/actions.ts` : supprimer le corps de `runCatalogTranslationsRefresh` et les imports devenus inutiles (`translateCatalogTable`, `fieldTranslationInput`, `creditPlanFeaturesSchema`, et les tables qui ne servent plus dans ce fichier — vérifier au cas par cas avec le linter). Nouvelle version :

```ts
async function guardRefresh(userId: string) {
  const limit = await rateLimit(`admin:translations-refresh:${userId}`, 300, 3600);
  if (limit.backend === "unavailable") throw new Error("Le contrôle de débit est indisponible.");
  if (!limit.success) throw new Error("RATE_LIMITED");
}

export async function refreshCatalogTranslations(): Promise<
  | ({ ok: true } & Awaited<ReturnType<typeof runTranslationsRefresh>>)
  | { ok: false; message: string }
> {
  try {
    const session = await requireAdmin();
    await guardRefresh(session.user.id);
    const result = await runTranslationsRefresh();
    if (result.translated > 0) {
      await writeAuditLog({
        action: "catalog.translations.refreshed",
        actorId: session.user.id,
        targetType: "localization_settings",
        targetId: "global",
        metadata: { ...result.counts, translated: result.translated, remaining: result.remaining },
      });
      refresh();
    }
    if (result.error) {
      return { ok: false, message: describeRefreshError(result.error, result.translated) };
    }
    return { ok: true, ...result };
  } catch (error) {
    return { ok: false, message: describeRefreshError(error, 0) };
  }
}
```

avec `describeRefreshError(error, translated)` : `AI_PROVIDER_NOT_CONFIGURED` → le message existant (« Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez. ») ; `RATE_LIMITED` → « Trop d’actualisations. Réessaie dans une heure. » ; sinon `actionErrorMessage(error, "La mise à jour des traductions a échoué.")`, suffixé de « ({translated} textes déjà enregistrés, relance pour continuer). » si `translated > 0`. Importer `rateLimit` depuis `@/lib/security/rate-limit`. Garder `requireAdmin()` **dans** le `try` comme avant ? Non : `requireAdmin` redirige/lève pour un non-admin ; le conserver **hors** du `try` comme dans `ai-actions.ts` (`const session = await requireAdmin();` avant le `try`) pour ne pas avaler la redirection.

- [ ] **Step 3: Nettoyer l'ancien module**

`grep -rn translateCatalogTable` : plus aucun usage. Supprimer `translateCatalogTable` ; si `lib/i18n/catalog-translate.ts` ne contient plus rien d'utilisé, le supprimer et corriger les commentaires qui le citent (`lib/occasion-fields/types.ts`, `lib/i18n/translate.ts`).

- [ ] **Step 4: Vérifier**

Run: `npm run typecheck && npm run lint && npm run test` — Expected: sans erreur, tous les tests passent. Puis `npm run security:baseline && npm run validation:zod-check`.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n app/admin/languages/actions.ts lib/occasion-fields/types.ts
git commit -m "feat(i18n): l'action Actualiser les traductions devient incrémentale (textes fixes + catalogue)"
```

---

### Task 9: Bouton, compte rendu, texte de la carte, règle du projet

**Files:**
- Modify: `components/admin/RefreshCatalogTranslationsButton.tsx`
- Modify: `app/admin/languages/page.tsx` (description de la carte, lignes ~330-335)
- Modify: `CLAUDE.md` (section i18n)

**Interfaces:**
- Consumes: `refreshCatalogTranslations()` (Task 8), `useAdminToast`.

- [ ] **Step 1: Réécrire le bouton**

```tsx
"use client";

import { useState, useTransition } from "react";
import Icon from "@/components/banani/Icon";
import { refreshCatalogTranslations } from "@/app/admin/languages/actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";

const MAX_CALLS = 40;

type Summary = { translated: number; alreadyUpToDate: number; remaining: number };

export default function RefreshCatalogTranslationsButton() {
  const showToast = useAdminToast();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  function handleClick() {
    setSummary(null);
    setProgress("Analyse des textes à traduire…");
    startTransition(async () => {
      let translated = 0;
      let alreadyUpToDate = 0;
      let remaining = 0;
      try {
        for (let call = 0; call < MAX_CALLS; call += 1) {
          const result = await refreshCatalogTranslations();
          if (!result.ok) {
            showToast({ message: result.message, tone: "error" });
            setSummary({ translated, alreadyUpToDate, remaining });
            return;
          }
          if (call === 0) alreadyUpToDate = result.alreadyUpToDate;
          translated += result.translated;
          remaining = result.remaining;
          if (remaining > 0) setProgress(`${translated} textes traduits, ${remaining} restants…`);
          if (remaining === 0 || result.translated === 0) break; // fini, ou aucun progrès : ne jamais boucler dans le vide
        }
        setSummary({ translated, alreadyUpToDate, remaining });
        showToast({
          message:
            translated === 0 && remaining === 0
              ? `Tout est déjà traduit (${alreadyUpToDate} textes à jour).`
              : `${translated} textes traduits, ${alreadyUpToDate} déjà à jour${remaining ? `, ${remaining} restent à traduire (relance)` : ""}.`,
          tone: remaining ? "info" : "success",
        });
      } catch (err) {
        showToast({ message: err instanceof Error ? err.message : "La mise à jour des traductions a échoué.", tone: "error" });
      } finally {
        setProgress(null);
      }
    });
  }

  return (
    <div className="admin-language-detection-actions">
      <button type="button" className="admin-secondary-action" onClick={handleClick} disabled={pending}>
        <Icon i="sparkles" size={16} />
        {pending ? "Actualisation en cours…" : "Actualiser les traductions"}
      </button>
      {pending && progress ? <p className="admin-language-detection-hint">{progress}</p> : null}
      {summary && !pending ? (
        <p className="admin-language-detection-hint">
          {summary.translated} textes traduits, {summary.alreadyUpToDate} déjà à jour
          {summary.remaining ? `, ${summary.remaining} restent à traduire` : ""}.
        </p>
      ) : null}
    </div>
  );
}
```

(`alreadyUpToDate` est celui du **premier** appel : c'est l'état avant la traduction ; `translated` cumule les appels.) Vérifier que `useAdminToast` est disponible dans la page `/admin/languages` (le layout admin monte `AdminToastProvider`).

- [ ] **Step 2: Texte de la carte**

Dans `app/admin/languages/page.tsx`, remplacer la description de la carte « Traductions du catalogue » par :

> Traduit avec l’IA connectée les textes de l’interface et le catalogue (occasions, ambiances, styles musicaux, relations, champs de détail, offres de crédits, textes animés) dans toutes les langues actives. Seuls les textes nouveaux ou modifiés sont traduits : ce qui l’est déjà n’est jamais retraduit. Le contenu source en français n’est jamais modifié.

- [ ] **Step 3: Règle du projet**

Dans `CLAUDE.md`, section « Règle obligatoire — traduction multilingue », point 1, compléter : après `npm run i18n:sync` (qui met aussi à jour `lib/i18n/manifest.json`), préciser que le bouton **« Actualiser les traductions »** traduit en production les textes du manifeste manquants dans les JSON, les stocke dans la table `ui_translations` (lue par `/api/i18n/overlay`), et ne retraduit jamais un texte déjà traduit ; `i18n:check` échoue si le manifeste n'est pas à jour. Ne pas ajouter de nouveau mécanisme.

- [ ] **Step 4: Contrôles complets**

Run : `npm run typecheck && npm run lint && npm run test && npm run i18n:check && npm run security:baseline && npm run validation:zod-check && npm run features:check && npm run refactor:check && npm run security:csp-check && npm run ui:hydration-check && npm run kit:integrity` — Expected: sans échec (l'échec connu « Imports locaux » de `kit:audit` dû à `.next/types` manquant n'est pas lié).

- [ ] **Step 5: Vérification navigateur (base de développement)**

Serveur de dev lancé (`npm run dev`), session admin connectée :
1. `/admin/languages` → clic sur « Actualiser les traductions » : toast avec un nombre de textes traduits ; si > 5 lots, la progression « N textes traduits, M restants… » défile.
2. Second clic immédiat : toast « Tout est déjà traduit (… textes à jour). » et **aucun** appel IA.
3. Ajouter un `t("Texte de test i18n")` temporaire dans un composant de `components/banani`, relancer `npx tsx --env-file=.env.local scripts/i18n-sync.mts --check` (échec manifeste attendu) puis `npx tsx scripts/i18n-sync.mts` **sans** réseau IA n'est pas souhaité : à la place, ne pas modifier le code ; contrôler directement avec `SELECT count(*) FROM ui_translations` via l'outil SQL de la base de développement que les lignes existent après l'étape 1 si le manifeste contenait des textes absents des JSON.
4. Modifier le nom d'une occasion dans l'admin, relancer le bouton : seul ce champ est retraduit (le toast annonce quelques textes, pas des dizaines).
5. Côté client : `/dashboard` avec la langue anglaise sélectionnée ; vérifier qu'aucune erreur console (React #418) n'apparaît et que la requête `/api/i18n/overlay?locale=en` répond 200.

- [ ] **Step 6: Commit**

```bash
git add components/admin/RefreshCatalogTranslationsButton.tsx app/admin/languages/page.tsx CLAUDE.md
git commit -m "feat(i18n): le bouton Actualiser les traductions ne traduit que ce qui manque, avec progression et toast"
```

---

## Self-Review

**Couverture de la spec :**
- §1 stockage/lecture : Task 1 (table), 3 (`translate()` + dictionnaire), 5 (route, cache, pages serveur), 6 (chargement client).
- §2 manifeste : Task 4 (+ `missingUiTexts` Task 2).
- §3 catalogue incrémental : Task 2 (`_src`, empreintes ; ruling R1), Task 7–8 (application, sources).
- §4 bouton/lots/compte rendu/toast/audit/limite : Task 7 (lots, plafond), 8 (action : `requireAdmin`, `rateLimit`, `writeAuditLog`, `revalidateTag`), 9 (boucle, progression, toast, texte de la carte).
- Gestion des erreurs : Task 7 (écriture partielle, omissions), 8 (`describeRefreshError`), 6 (repli client).
- Tests : Tasks 2, 3, 5, 7 ; contrôles du kit Task 9.
- Écarts : R1–R4 en tête.

**Placeholders :** aucun « TBD ». Deux points laissés volontairement à la vérification de l'implémenteur, car dépendants de la version installée : signature de `revalidateTag`/`unstable_cache` (Next 16.3.7) et nom exact du script de migration ; chaque endroit dit quoi lire et ce que le comportement doit être.

**Cohérence des types :** `TranslationLocale`, `CatalogRowInput`, `CatalogSource`, `RefreshDeps`, `RefreshResult`, `OverlayLocale`, `OVERLAY_TAG`, `loadOverlay`, `primeOverlay`, `runRefresh`, `runTranslationsRefresh`, `refreshCatalogTranslations` sont définis dans la tâche productrice et réutilisés avec les mêmes noms.
