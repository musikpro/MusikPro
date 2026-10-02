# Détails par occasion — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'étape 3 « À qui est destinée la chanson ? » par « Personnalise ta chanson » : blocs intégrés activables par occasion + champs dynamiques gérés par l'admin, dont les réponses alimentent le prompt des paroles.

**Architecture:** Nouvelle table `occasion_fields` (une occasion → N champs) et 3 colonnes sur `occasions` (`show_recipient`, `show_sender`, `title_field_id`). Une bibliothèque pure `lib/occasion-fields/` (types, validation des réponses, schéma Zod admin) est partagée client/serveur. L'admin gère les champs via un nouveau menu « Détails par occasion » (`AdminTabs`, `AdminActionForm`, toasts). Le serveur revalide toujours les réponses contre la base avant de les injecter dans `promptFor` et de les stocker dans `requestPayload`.

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle ORM + Neon Postgres, Zod, Vitest, i18n maison (`lib/i18n/translate.ts`, `translateCatalogTable`).

**Spec:** `docs/superpowers/specs/2026-10-02-occasion-details-design.md`

## Global Constraints

- Réponses à l'utilisateur et textes de l'interface en **français** ; code, chemins et identifiants dans leur syntaxe d'origine.
- Changements **additifs et rétrocompatibles** : colonnes avec valeur par défaut, paramètres API optionnels (`occasionDetails` vaut `[]` par défaut), aucune route ni contrat existant modifié. La relation reste un `MusikSelect` (hors périmètre).
- La valeur française (`label`, `options[].label`, nom d'occasion) reste la clé canonique envoyée à la génération ; seul l'affichage est traduit (`localizeField`). Jamais de traduction écrite à la main : elles viennent du bouton « Actualiser les traductions ».
- Tout texte fixe visible côté client passe par un appel **littéral** `t("…")` (le scanner `i18n:sync` ne voit pas `t(variable)`), puis `npx tsx --env-file=.env.local scripts/i18n-sync.mts` et `npm run i18n:check`.
- Toute action admin : signature `(previous: AdminActionState, formData: FormData) => Promise<AdminActionState>`, corps dans `try/catch`, `actionErrorMessage`, `<AdminActionForm>`. Redirection : `redirect(withAdminNotice(path, message))` **hors** du `try` (sinon `NEXT_REDIRECT` est avalé). Onglets : `AdminTabs`/`AdminTabPanel`.
- Toute entrée non fiable est validée côté serveur avec Zod. `ai_hint` n'est jamais envoyé au client.
- Maximum **8 champs actifs par occasion** ; liste de choix : **2 à 12** options ; texte court ≤ 200 caractères, texte long ≤ 600.
- Migrations : SQL écrit à la main, idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`), `--> statement-breakpoint`, grants `musikpro_runtime` (SELECT) et `musikpro_service` (SELECT, INSERT, UPDATE, DELETE). **Ne pas lancer `npm run db:migrate`** (journal Drizzle en retard). Appliquer sur la branche Neon `development` (`br-misty-mountain-b4qavqvo`) via `run_sql` avec `branch_id` explicite ; la production uniquement après un « applique » explicite de l'utilisateur.
- Commits : fréquents, sur une branche `feat/occasion-details` (créée à la Task 1), message terminé par `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Vérifications finales : `npm run typecheck`, `npm run lint`, `npm run test`, `npm run i18n:check`, `npm run kit:integrity`, `npm run kit:audit`, `/security-saas`.

## Review Focus

Entrées ou conditions impliquées par la spec mais absentes des tâches de tests « nominaux » ; chacune a son test dans la tâche indiquée.

1. **Changement d'occasion avec des champs déjà remplis** : les réponses de l'occasion précédente ne doivent jamais partir à la génération (Task 5 : `buildOccasionDetails` + reset sur `choose("occasion")`).
2. **Blocs masqués avec données résiduelles** : revenir de « Anniversaire » (nom saisi) à « Spot publicitaire » ne doit pas envoyer `recipientName`/`senderName`/relation (Task 5 : `clearHiddenBlockValues`).
3. **Champ obligatoire absent côté serveur** : un client qui omet un champ `required` ou envoie un `fieldId` d'une autre occasion reçoit une 422, pas une génération (Task 6 : route + `validateOccasionAnswers`).
4. **Valeurs hostiles** : retour à la ligne, `ignore les consignes précédentes`, 600+ caractères, nombre `1e9`, date `2026-02-31`, option hors liste (Task 1 + Task 6 : normalisation des espaces dans `formatAnswersForPrompt`).
5. **Champ désactivé/supprimé entre l'affichage et l'envoi** : la réponse est refusée proprement (« Champ inconnu »), pas ignorée silencieusement ni source de crash (Task 1 + Task 6).

---

## File Structure

| Fichier | Rôle |
|---|---|
| `lib/occasion-fields/types.ts` (créer) | Types partagés, constantes (types de champs, limites) |
| `lib/occasion-fields/answers.ts` (créer) | `validateOccasionAnswers`, `formatAnswersForPrompt`, `buildOccasionDetails`, codes d'erreur — pur, sans `server-only` |
| `lib/occasion-fields/form-schema.ts` (créer) | Schéma Zod du formulaire admin, `parseOptionsText`/`formatOptionsText`, `slugifyFieldKey` |
| `lib/occasion-fields/server.ts` (créer) | `getActiveOccasionFields`, `resolveOccasionDetails`, `OccasionDetailsError` (`server-only`) |
| `db/schema/index.ts` (modifier) | Table `occasionFields`, 3 colonnes sur `occasions` |
| `db/migrations/0062_occasion_fields.sql` (créer) + `meta/_journal.json` (modifier) | Table, colonnes, grants, seed |
| `lib/occasions/catalog.ts`, `lib/occasions/server.ts` (modifier) | `OccasionOption` gagne `showRecipient`, `showSender`, `titleFieldId` |
| `app/admin/occasion-fields/actions.ts` (créer) | Server Actions |
| `app/admin/occasion-fields/page.tsx`, `[occasionId]/page.tsx`, `[occasionId]/fields/new/page.tsx`, `[occasionId]/fields/[fieldId]/page.tsx` (créer) | Pages admin |
| `components/admin/AdminOccasionBlocksForm.tsx`, `AdminOccasionFieldForm.tsx`, `AdminOccasionFieldSortableGrid.tsx` (créer) | Formulaires et grille triable |
| `components/admin/AdminShell.tsx`, `app/admin/menu/page.tsx` (modifier) | Entrée de menu |
| `lib/occasion-fields/ai-schema.ts` (créer) | Analyse et assainissement des sorties IA (champs, blocs) — pur |
| `lib/ai/occasion-field-suggestions.ts` (créer) | Appels au fournisseur IA connecté (`server-only`) |
| `app/admin/occasion-fields/ai-actions.ts` (créer) | Server Actions de suggestion (lecture seule) |
| `components/admin/AdminOccasionFieldAiPanel.tsx` (créer) | Aperçu des champs proposés et ajout de la sélection |
| `app/admin/languages/actions.ts`, `components/admin/RefreshCatalogTranslationsButton.tsx` (modifier) | Traductions du catalogue |
| `components/banani/OccasionFieldsSection.tsx` (créer) | Rendu des champs dynamiques (texte, zone, liste, tuiles, nombre, date) |
| `components/banani/DemoProvider.tsx`, `app/dashboard/layout.tsx` (modifier) | État `details`, catalogue de champs |
| `components/banani/StepRecipient.tsx`, `StepAdditionalParams.tsx` (modifier) | Titres, blocs conditionnels, validation |
| `app/dashboard/banani.css` (modifier) | Styles des tuiles et champs dynamiques |
| `lib/validation/ai.ts`, `lib/ai/lyrics.ts`, `app/api/ai/generate/route.ts` (modifier) | Paramètre `occasionDetails`, prompt, 422 |
| `app/api/songs/generate/route.ts`, `lib/ai/songs.ts`, `lib/ai/music-jobs.ts` (modifier) | Titre sans destinataire, `requestPayload` |
| `tests/occasion-fields-*.test.ts`, `tests/lyrics-occasion-details.test.ts` (créer) | Tests |

---

### Task 1: Bibliothèque pure `lib/occasion-fields/` (types, réponses, schéma admin)

**Files:**
- Create: `lib/occasion-fields/types.ts`, `lib/occasion-fields/answers.ts`, `lib/occasion-fields/form-schema.ts`
- Test: `tests/occasion-fields-answers.test.ts`, `tests/occasion-fields-form-schema.test.ts`

**Interfaces:**
- Produces (utilisé par les Tasks 3 à 6) :
  - `OCCASION_FIELD_TYPES`, `type OccasionFieldType`, `type OccasionFieldOption = { label: string; emoji: string }`, `type OccasionFieldConfig`, `type OccasionFieldClientDefinition`, `type OccasionFieldDefinition` (= client + `aiHint`), `type OccasionAnswer = { fieldId: string; value: string }`, `type ResolvedAnswer`, `MAX_ACTIVE_FIELDS_PER_OCCASION = 8`, `UNKNOWN_FIELD_KEY = "_unknown"`.
  - `type AnswerErrorCode = "required" | "option" | "number" | "range" | "date" | "length" | "unknown" | "duplicate"`, `ANSWER_ERROR_MESSAGES: Record<AnswerErrorCode, string>`.
  - `validateOccasionAnswers(fields, raw): { ok: true; answers: ResolvedAnswer[] } | { ok: false; errors: Record<string, AnswerErrorCode> }`.
  - `formatAnswersForPrompt(answers: ResolvedAnswer[]): string`, `buildOccasionDetails(fields, details: Record<string,string>): OccasionAnswer[]`, `occasionAnswersSchema` (Zod, défaut `[]`).
  - `occasionFieldFormSchema` (transforme en ligne prête pour la base), `parseOptionsText`, `formatOptionsText`, `slugifyFieldKey`, `FIELD_ICON_OPTIONS`.

- [ ] **Step 1: Créer la branche**

```bash
cd /Volumes/Affoucherie/Saas/MusikPro && git checkout -b feat/occasion-details
git add docs/superpowers/specs/2026-10-02-occasion-details-design.md docs/superpowers/plans/2026-10-02-occasion-details.md
git commit -m "docs: spec et plan des détails par occasion

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 2: Écrire les tests des réponses (échouent)**

Créer `tests/occasion-fields-answers.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  buildOccasionDetails,
  formatAnswersForPrompt,
  validateOccasionAnswers,
} from "@/lib/occasion-fields/answers";
import type { OccasionFieldClientDefinition } from "@/lib/occasion-fields/types";

function field(overrides: Partial<OccasionFieldClientDefinition> & { id: string }): OccasionFieldClientDefinition & {
  aiHint?: string;
} {
  return {
    occasionId: "occ-1",
    key: overrides.id,
    label: overrides.id,
    helpText: "",
    icon: "",
    placeholder: "",
    type: "short_text",
    options: [],
    config: {},
    required: false,
    sortOrder: 10,
    translations: null,
    ...overrides,
  };
}

const day = field({ id: "day", type: "number", config: { min: 1, max: 31 }, sortOrder: 10 });
const month = field({
  id: "month",
  type: "select",
  options: [
    { label: "Janvier", emoji: "❄️" },
    { label: "Février", emoji: "💝" },
  ],
  sortOrder: 20,
});
const product = field({ id: "product", required: true, aiHint: "Name the product often.", sortOrder: 5 });

describe("validateOccasionAnswers", () => {
  it("accepts valid answers and returns them in sort order with labels and hints", () => {
    const result = validateOccasionAnswers(
      [day, month, product],
      [
        { fieldId: "month", value: "Janvier" },
        { fieldId: "day", value: "15" },
        { fieldId: "product", value: "Café Soleil" },
      ],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answers.map((answer) => answer.fieldId)).toEqual(["product", "day", "month"]);
      expect(result.answers[0].aiHint).toBe("Name the product often.");
    }
  });

  it("skips optional empty fields but rejects a missing required one", () => {
    const result = validateOccasionAnswers([day, product], [{ fieldId: "day", value: "" }]);
    expect(result).toEqual({ ok: false, errors: { product: "required" } });
  });

  it("rejects a field id that does not belong to the occasion", () => {
    const result = validateOccasionAnswers([day], [{ fieldId: "other-occasion-field", value: "x" }]);
    expect(result).toEqual({ ok: false, errors: { _unknown: "unknown" } });
  });

  it("rejects duplicate answers for the same field", () => {
    const result = validateOccasionAnswers(
      [day],
      [
        { fieldId: "day", value: "1" },
        { fieldId: "day", value: "2" },
      ],
    );
    expect(result).toEqual({ ok: false, errors: { day: "duplicate" } });
  });

  it("rejects a select value that is not among the options", () => {
    const result = validateOccasionAnswers([month], [{ fieldId: "month", value: "Smarch" }]);
    expect(result).toEqual({ ok: false, errors: { month: "option" } });
  });

  it.each([
    ["1e9", "number"],
    ["abc", "number"],
    ["0", "range"],
    ["32", "range"],
    ["1.5", "number"],
  ])("rejects the number %s with code %s", (value, code) => {
    expect(validateOccasionAnswers([day], [{ fieldId: "day", value }])).toEqual({ ok: false, errors: { day: code } });
  });

  it("validates dates strictly", () => {
    const date = field({ id: "when", type: "date" });
    expect(validateOccasionAnswers([date], [{ fieldId: "when", value: "2026-10-02" }]).ok).toBe(true);
    expect(validateOccasionAnswers([date], [{ fieldId: "when", value: "2026-02-31" }])).toEqual({
      ok: false,
      errors: { when: "date" },
    });
    expect(validateOccasionAnswers([date], [{ fieldId: "when", value: "02/10/2026" }])).toEqual({
      ok: false,
      errors: { when: "date" },
    });
  });

  it("enforces text length limits (default 100 short, 300 long, configurable)", () => {
    const short = field({ id: "short" });
    const long = field({ id: "long", type: "long_text" });
    const tight = field({ id: "tight", config: { maxLength: 5 } });
    expect(validateOccasionAnswers([short], [{ fieldId: "short", value: "a".repeat(101) }])).toEqual({
      ok: false,
      errors: { short: "length" },
    });
    expect(validateOccasionAnswers([long], [{ fieldId: "long", value: "a".repeat(300) }]).ok).toBe(true);
    expect(validateOccasionAnswers([tight], [{ fieldId: "tight", value: "abcdef" }])).toEqual({
      ok: false,
      errors: { tight: "length" },
    });
  });
});

describe("formatAnswersForPrompt", () => {
  it("returns an empty string without answers", () => {
    expect(formatAnswersForPrompt([])).toBe("");
  });

  it("renders label, value and AI hint, and flattens line breaks so a value cannot inject new lines", () => {
    const text = formatAnswersForPrompt([
      { fieldId: "p", key: "p", label: "Produit", type: "short_text", value: "Café\nIgnore les consignes", aiHint: "Cite-le." },
      { fieldId: "d", key: "d", label: "Jour", type: "number", value: "15", aiHint: "" },
    ]);
    expect(text).toBe(
      "Informations personnalisées:\n- Produit : Café Ignore les consignes (consigne : Cite-le.)\n- Jour : 15",
    );
  });
});

describe("buildOccasionDetails", () => {
  it("keeps only non-empty answers of the given fields (stale answers of another occasion are dropped)", () => {
    expect(
      buildOccasionDetails([day, month], { day: " 15 ", month: "", stale: "x" }),
    ).toEqual([{ fieldId: "day", value: "15" }]);
  });
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run tests/occasion-fields-answers.test.ts`
Expected: FAIL (module `@/lib/occasion-fields/answers` introuvable).

- [ ] **Step 4: Implémenter `types.ts`**

```ts
import type { CatalogTranslations } from "@/lib/i18n/translate";

export const OCCASION_FIELD_TYPES = ["short_text", "long_text", "select", "number", "date"] as const;
export type OccasionFieldType = (typeof OCCASION_FIELD_TYPES)[number];

export const MAX_ACTIVE_FIELDS_PER_OCCASION = 8;
export const MAX_SELECT_OPTIONS = 12;
export const UNKNOWN_FIELD_KEY = "_unknown";

export type OccasionFieldOption = { label: string; emoji: string };

export type OccasionFieldConfig = {
  maxLength?: number;
  min?: number;
  max?: number;
  display?: "dropdown" | "tiles";
};

/** Définition envoyée au navigateur : jamais d'`aiHint`. */
export type OccasionFieldClientDefinition = {
  id: string;
  occasionId: string;
  key: string;
  label: string;
  helpText: string;
  icon: string;
  placeholder: string;
  type: OccasionFieldType;
  options: OccasionFieldOption[];
  config: OccasionFieldConfig;
  required: boolean;
  sortOrder: number;
  /** { en: { label, helpText, placeholder, option0, option1… }, es: …, pt: … } — voir `fieldTranslationInput`. */
  translations?: CatalogTranslations | null;
};

export type OccasionFieldDefinition = OccasionFieldClientDefinition & { aiHint: string };

export type OccasionAnswer = { fieldId: string; value: string };

export type ResolvedAnswer = {
  fieldId: string;
  key: string;
  label: string;
  type: OccasionFieldType;
  value: string;
  aiHint: string;
};

/** Champs français à traduire pour `translateCatalogTable` (clés plates, `option0…` pour les listes). */
export function fieldTranslationInput(field: {
  label: string;
  helpText: string;
  placeholder: string;
  options: OccasionFieldOption[];
}): Record<string, string> {
  return {
    label: field.label,
    helpText: field.helpText,
    placeholder: field.placeholder,
    ...Object.fromEntries(field.options.map((option, index) => [`option${index}`, option.label])),
  };
}
```

- [ ] **Step 5: Implémenter `answers.ts`**

```ts
import { z } from "zod";
import {
  MAX_ACTIVE_FIELDS_PER_OCCASION,
  UNKNOWN_FIELD_KEY,
  type OccasionAnswer,
  type OccasionFieldClientDefinition,
  type ResolvedAnswer,
} from "./types";

export type AnswerErrorCode = "required" | "option" | "number" | "range" | "date" | "length" | "unknown" | "duplicate";

export const ANSWER_ERROR_MESSAGES: Record<AnswerErrorCode, string> = {
  required: "Ce champ est obligatoire.",
  option: "Choisis une option proposée.",
  number: "Entre un nombre entier valide.",
  range: "La valeur est hors des limites autorisées.",
  date: "Entre une date valide.",
  length: "Le texte est trop long.",
  unknown: "Un champ ne correspond plus à cette occasion. Recharge la page.",
  duplicate: "Une réponse est en double.",
};

export type AnswerValidation =
  | { ok: true; answers: ResolvedAnswer[] }
  | { ok: false; errors: Record<string, AnswerErrorCode> };

type RuleField = OccasionFieldClientDefinition & { aiHint?: string };

export const occasionAnswersSchema = z
  .array(
    z.object({
      fieldId: z.string().trim().min(1).max(120),
      value: z.string().trim().max(600),
    }),
  )
  .max(MAX_ACTIVE_FIELDS_PER_OCCASION)
  .optional()
  .default([]);

const TEXT_DEFAULT_MAX = { short_text: 100, long_text: 300 } as const;
const TEXT_HARD_MAX = { short_text: 200, long_text: 600 } as const;
const NUMBER_DEFAULT_MIN = -1_000_000;
const NUMBER_DEFAULT_MAX = 1_000_000;

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function checkValue(field: RuleField, value: string): AnswerErrorCode | null {
  switch (field.type) {
    case "short_text":
    case "long_text": {
      const limit = Math.min(field.config.maxLength ?? TEXT_DEFAULT_MAX[field.type], TEXT_HARD_MAX[field.type]);
      return value.length > limit ? "length" : null;
    }
    case "select":
      return field.options.some((option) => option.label === value) ? null : "option";
    case "number": {
      if (!/^-?\d+$/.test(value)) return "number";
      const number = Number(value);
      const min = field.config.min ?? NUMBER_DEFAULT_MIN;
      const max = field.config.max ?? NUMBER_DEFAULT_MAX;
      return number < min || number > max ? "range" : null;
    }
    case "date":
      return isValidIsoDate(value) ? null : "date";
  }
}

/** Valide les réponses contre les définitions (client : sans `aiHint` ; serveur : avec). */
export function validateOccasionAnswers(fields: RuleField[], raw: OccasionAnswer[]): AnswerValidation {
  const errors: Record<string, AnswerErrorCode> = {};
  const known = new Set(fields.map((field) => field.id));
  const given = new Map<string, string>();
  for (const answer of raw) {
    if (!known.has(answer.fieldId)) {
      errors[UNKNOWN_FIELD_KEY] = "unknown";
      continue;
    }
    if (given.has(answer.fieldId)) {
      errors[answer.fieldId] = "duplicate";
      continue;
    }
    given.set(answer.fieldId, answer.value.trim());
  }

  const answers: ResolvedAnswer[] = [];
  for (const field of [...fields].sort((a, b) => a.sortOrder - b.sortOrder)) {
    if (errors[field.id]) continue;
    const value = given.get(field.id) ?? "";
    if (!value) {
      if (field.required) errors[field.id] = "required";
      continue;
    }
    const problem = checkValue(field, value);
    if (problem) {
      errors[field.id] = problem;
      continue;
    }
    answers.push({
      fieldId: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      value,
      aiHint: field.aiHint ?? "",
    });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, answers };
}

/** Bloc ajouté au prompt des paroles. Les espaces/retours à la ligne sont aplatis : une valeur ne peut pas ajouter de lignes. */
export function formatAnswersForPrompt(answers: ResolvedAnswer[]): string {
  if (!answers.length) return "";
  const lines = answers.map((answer) => {
    const value = answer.value.replace(/\s+/g, " ").trim();
    const hint = answer.aiHint.replace(/\s+/g, " ").trim();
    return `- ${answer.label} : ${value}${hint ? ` (consigne : ${hint})` : ""}`;
  });
  return `Informations personnalisées:\n${lines.join("\n")}`;
}

/** Charge utile envoyée à l'API : uniquement les champs de l'occasion courante, réponses non vides. */
export function buildOccasionDetails(
  fields: Array<Pick<OccasionFieldClientDefinition, "id">>,
  details: Record<string, string>,
): OccasionAnswer[] {
  return fields
    .map((field) => ({ fieldId: field.id, value: (details[field.id] ?? "").trim() }))
    .filter((answer) => answer.value !== "");
}
```

- [ ] **Step 6: Vérifier que les tests passent**

Run: `npx vitest run tests/occasion-fields-answers.test.ts`
Expected: PASS.

- [ ] **Step 7: Écrire les tests du schéma admin (échouent)**

Créer `tests/occasion-fields-form-schema.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  formatOptionsText,
  occasionFieldFormSchema,
  parseOptionsText,
  slugifyFieldKey,
} from "@/lib/occasion-fields/form-schema";

const base = {
  occasionId: "occ-1",
  label: "Jour de naissance",
  type: "number",
  required: "false",
  active: "true",
  sortOrder: "10",
};

describe("parseOptionsText / formatOptionsText", () => {
  it("parses one option per line with an optional leading emoji", () => {
    expect(parseOptionsText("❄️ Janvier\n💝 Février\n\nMars")).toEqual([
      { emoji: "❄️", label: "Janvier" },
      { emoji: "💝", label: "Février" },
      { emoji: "", label: "Mars" },
    ]);
  });

  it("round-trips, including ZWJ emoji", () => {
    const options = parseOptionsText("👨‍👩‍👧‍👦 Réunion de famille\n🎊 Soirée");
    expect(options[0]).toEqual({ emoji: "👨‍👩‍👧‍👦", label: "Réunion de famille" });
    expect(parseOptionsText(formatOptionsText(options))).toEqual(options);
  });
});

describe("slugifyFieldKey", () => {
  it("builds a snake_case key without accents", () => {
    expect(slugifyFieldKey("Jour de naissance")).toBe("jour_de_naissance");
    expect(slugifyFieldKey("Âge fêté !")).toBe("age_fete");
    expect(slugifyFieldKey("???")).toBe("champ");
  });
});

describe("occasionFieldFormSchema", () => {
  it("builds a number field with min/max config and defaults", () => {
    const row = occasionFieldFormSchema.parse({ ...base, min: "1", max: "31", placeholder: "Ex: 15", icon: "📅" });
    expect(row).toMatchObject({
      type: "number",
      config: { min: 1, max: 31 },
      options: [],
      required: "false",
      icon: "📅",
      helpText: "",
      aiHint: "",
    });
  });

  it("requires 2 to 12 options for a select and defaults to tiles", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "Seul choix" })).toThrow();
    const row = occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "A\nB" });
    expect(row.config).toEqual({ display: "tiles" });
    expect(row.options).toHaveLength(2);
    const tooMany = Array.from({ length: 13 }, (_, i) => `Option ${i}`).join("\n");
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: tooMany })).toThrow();
  });

  it("rejects duplicate option labels and min > max", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "select", optionsText: "A\nA" })).toThrow();
    expect(() => occasionFieldFormSchema.parse({ ...base, min: "10", max: "1" })).toThrow();
  });

  it("caps text length config (short 200, long 600) and defaults it", () => {
    expect(occasionFieldFormSchema.parse({ ...base, type: "short_text" }).config).toEqual({ maxLength: 100 });
    expect(occasionFieldFormSchema.parse({ ...base, type: "long_text" }).config).toEqual({ maxLength: 300 });
    expect(() => occasionFieldFormSchema.parse({ ...base, type: "short_text", maxLength: "201" })).toThrow();
  });

  it("rejects a non-emoji icon and an over-long AI hint", () => {
    expect(() => occasionFieldFormSchema.parse({ ...base, icon: "abc" })).toThrow();
    expect(() => occasionFieldFormSchema.parse({ ...base, aiHint: "x".repeat(201) })).toThrow();
  });
});
```

- [ ] **Step 8: Vérifier l'échec**

Run: `npx vitest run tests/occasion-fields-form-schema.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 9: Implémenter `form-schema.ts`**

```ts
import { z } from "zod";
import { OCCASION_EMOJI_OPTIONS } from "@/lib/occasions/catalog";
import {
  MAX_SELECT_OPTIONS,
  OCCASION_FIELD_TYPES,
  type OccasionFieldConfig,
  type OccasionFieldOption,
} from "./types";

const EMOJI_ONLY = /^\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*$/u;
const OPTION_LINE = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s+(.+)$/u;

/** Icônes proposées pour un champ : celles des occasions + quelques icônes de formulaire. */
export const FIELD_ICON_OPTIONS = [
  ...OCCASION_EMOJI_OPTIONS,
  { value: "📅", label: "Date" },
  { value: "🗓️", label: "Calendrier" },
  { value: "📍", label: "Lieu" },
  { value: "📝", label: "Note" },
  { value: "⭐", label: "Étoile" },
  { value: "🏷️", label: "Étiquette" },
  { value: "🎯", label: "Objectif" },
  { value: "📣", label: "Annonce" },
  { value: "📖", label: "Livre" },
  { value: "🔢", label: "Nombre" },
] as const;

export function parseOptionsText(text: string): OccasionFieldOption[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(OPTION_LINE);
      return match ? { emoji: match[1], label: match[2].trim() } : { emoji: "", label: line };
    });
}

export function formatOptionsText(options: OccasionFieldOption[]): string {
  return options.map((option) => (option.emoji ? `${option.emoji} ${option.label}` : option.label)).join("\n");
}

export function slugifyFieldKey(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
  return slug || "champ";
}

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optionalInt = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional());

export const occasionFieldFormSchema = z
  .object({
    occasionId: z.string().trim().min(1).max(120),
    label: z.string().trim().min(2).max(80),
    helpText: z.string().trim().max(160).default(""),
    icon: z
      .string()
      .trim()
      .max(16)
      .refine((value) => value === "" || EMOJI_ONLY.test(value), "Emoji invalide.")
      .default(""),
    placeholder: z.string().trim().max(60).default(""),
    type: z.enum(OCCASION_FIELD_TYPES),
    optionsText: z.string().max(1500).default(""),
    display: z.enum(["dropdown", "tiles"]).default("tiles"),
    maxLength: optionalInt(1, 600),
    min: optionalInt(-1_000_000, 1_000_000),
    max: optionalInt(-1_000_000, 1_000_000),
    required: z.enum(["true", "false"]),
    aiHint: z.string().trim().max(200).default(""),
    active: z.enum(["true", "false"]),
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .superRefine((value, context) => {
    if (value.type === "select") {
      const options = parseOptionsText(value.optionsText);
      const labels = options.map((option) => option.label);
      if (options.length < 2 || options.length > MAX_SELECT_OPTIONS) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Une liste doit proposer 2 à 12 choix." });
      } else if (labels.some((label) => label.length > 60)) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Un choix dépasse 60 caractères." });
      } else if (new Set(labels).size !== labels.length) {
        context.addIssue({ code: "custom", path: ["optionsText"], message: "Deux choix portent le même nom." });
      }
    }
    if (value.type === "short_text" && (value.maxLength ?? 0) > 200) {
      context.addIssue({ code: "custom", path: ["maxLength"], message: "Un texte court est limité à 200 caractères." });
    }
    if (value.min !== undefined && value.max !== undefined && value.min > value.max) {
      context.addIssue({ code: "custom", path: ["min"], message: "Le minimum dépasse le maximum." });
    }
  })
  .transform((value) => {
    const config: OccasionFieldConfig = {};
    if (value.type === "short_text") config.maxLength = value.maxLength ?? 100;
    if (value.type === "long_text") config.maxLength = value.maxLength ?? 300;
    if (value.type === "select") config.display = value.display;
    if (value.type === "number") {
      if (value.min !== undefined) config.min = value.min;
      if (value.max !== undefined) config.max = value.max;
    }
    const { optionsText, display, maxLength, min, max, ...rest } = value;
    void display;
    void maxLength;
    void min;
    void max;
    return {
      ...rest,
      options: value.type === "select" ? parseOptionsText(optionsText) : [],
      config,
    };
  });

export type OccasionFieldFormRow = z.output<typeof occasionFieldFormSchema>;
```

- [ ] **Step 10: Vérifier que tout passe**

Run: `npx vitest run tests/occasion-fields-answers.test.ts tests/occasion-fields-form-schema.test.ts && npm run typecheck`
Expected: PASS ; typecheck sans erreur.

- [ ] **Step 11: Commit**

```bash
git add lib/occasion-fields tests/occasion-fields-answers.test.ts tests/occasion-fields-form-schema.test.ts
git commit -m "feat(occasions): bibliothèque pure des champs de détail (validation, schéma admin)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Schéma Drizzle, migration 0062 et seed

**Files:**
- Modify: `db/schema/index.ts` (table `occasions` ~l. 206, ajouter `occasionFields` juste après), `db/migrations/meta/_journal.json`
- Create: `db/migrations/0062_occasion_fields.sql`
- Test: `tests/occasion-fields-migration.test.ts`

**Interfaces:**
- Produces: export Drizzle `occasionFields` (colonnes `id, occasionId, key, label, helpText, icon, placeholder, type, options, config, required, aiHint, sortOrder, active, translations, createdAt, updatedAt`) ; colonnes `occasions.showRecipient`, `occasions.showSender`, `occasions.titleFieldId`.

- [ ] **Step 1: Lire les occasions réelles (lecture seule, branche development)**

Via `mcp__claude_ai_Neon__run_sql` (`project_id: weathered-block-07936773`, `branch_id: br-misty-mountain-b4qavqvo` — vérifier d'abord avec `list_branch_computes`) :

```sql
SELECT id, name, slug, active FROM occasions ORDER BY sort_order;
```

Noter les slugs réels de Sport, Prière/culte et Spot publicitaire. S'ils diffèrent de `sport`, `priere-culte`, `spot-publicitaire`, **remplacer ces slugs dans le SQL du Step 5** avant de continuer. Refaire la même lecture sur `production` (lecture seule) avant la Task 7.

- [ ] **Step 2: Écrire le test statique de migration (échoue)**

Créer `tests/occasion-fields-migration.test.ts` :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("db/migrations/0062_occasion_fields.sql", "utf8");
const journal = JSON.parse(readFileSync("db/migrations/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

describe("migration 0062_occasion_fields", () => {
  it("is idempotent", () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "occasion_fields"');
    expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "show_recipient"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "show_sender"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "title_field_id"');
    expect(sql).toContain('ON CONFLICT ("occasion_id", "key") DO NOTHING');
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });

  it("cascades deletion from occasions and grants runtime/service roles", () => {
    expect(sql).toMatch(/REFERENCES "occasions"\("id"\) ON DELETE CASCADE/);
    expect(sql).toContain('GRANT SELECT ON TABLE "occasion_fields" TO musikpro_runtime;');
    expect(sql).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "occasion_fields" TO musikpro_service;');
  });

  it("seeds a field set for every default occasion plus the three hand-made ones", () => {
    for (const slug of [
      "anniversaire",
      "amour",
      "graduation",
      "fete",
      "separation",
      "gratitude",
      "serenite",
      "motivation",
      "sport",
      "priere-culte",
      "spot-publicitaire",
    ]) {
      expect(sql).toContain(`('${slug}',`);
    }
  });

  it("hides the recipient/sender blocks of the advertising spot and uses the product name as title", () => {
    expect(sql).toMatch(/UPDATE "occasions"[\s\S]*"show_recipient" = false[\s\S]*'spot-publicitaire'/);
    expect(sql).toContain("seed-spot-publicitaire-product_name");
  });

  it("is registered in the drizzle journal after 0061", () => {
    const last = journal.entries[journal.entries.length - 1];
    const previous = journal.entries[journal.entries.length - 2];
    expect(last.tag).toBe("0062_occasion_fields");
    expect(last.idx).toBe(previous.idx + 1);
    expect(last.when).toBe(previous.when + 1000);
  });
});
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run tests/occasion-fields-migration.test.ts`
Expected: FAIL (fichier SQL absent).

- [ ] **Step 4: Ajouter la table et les colonnes au schéma Drizzle**

Dans `db/schema/index.ts`, dans la définition de `occasions` (après `sortOrder`), ajouter :

```ts
    /** Affiche le bloc « La personne concernée » à l'étape « Personnalise ta chanson » (faux pour un spot publicitaire). */
    showRecipient: boolean("show_recipient").notNull().default(true),
    /** Affiche le bloc « De la part de qui ». */
    showSender: boolean("show_sender").notNull().default(true),
    /** Champ (occasion_fields.id) dont la valeur sert de titre quand il n'y a pas de destinataire. */
    titleFieldId: text("title_field_id"),
```

Puis, juste après la définition de `occasions`, ajouter :

```ts
export const occasionFields = pgTable(
  "occasion_fields",
  {
    id: text("id").primaryKey(),
    occasionId: text("occasion_id")
      .notNull()
      .references(() => occasions.id, { onDelete: "cascade" }),
    /** Identifiant stable (ex. birth_day), unique par occasion. */
    key: text("key").notNull(),
    /** Libellé français : valeur canonique. */
    label: text("label").notNull(),
    helpText: text("help_text").notNull().default(""),
    icon: text("icon").notNull().default(""),
    placeholder: text("placeholder").notNull().default(""),
    /** short_text | long_text | select | number | date — voir lib/occasion-fields/types.ts. */
    type: text("type").notNull(),
    /** [{ label, emoji }] pour le type select. */
    options: jsonb("options").notNull().default([]),
    /** { maxLength, min, max, display }. */
    config: jsonb("config").notNull().default({}),
    required: boolean("required").notNull().default(false),
    /** Consigne anglaise pour le parolier IA (jamais montrée au client). */
    aiHint: text("ai_hint").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(100),
    active: boolean("active").notNull().default(true),
    /** AI-generated per-locale { en: { label, helpText, placeholder, option0… }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    occasionKeyUnique: uniqueIndex("occasion_fields_occasion_key_unique").on(table.occasionId, table.key),
    occasionOrderIndex: index("occasion_fields_occasion_order_idx").on(table.occasionId, table.active, table.sortOrder),
  }),
);
```

- [ ] **Step 5: Écrire la migration**

Créer `db/migrations/0062_occasion_fields.sql` :

```sql
CREATE TABLE IF NOT EXISTS "occasion_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"occasion_id" text NOT NULL REFERENCES "occasions"("id") ON DELETE CASCADE,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"help_text" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"placeholder" text DEFAULT '' NOT NULL,
	"type" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"ai_hint" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"translations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "occasion_fields_occasion_key_unique" ON "occasion_fields" USING btree ("occasion_id","key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "occasion_fields_occasion_order_idx" ON "occasion_fields" USING btree ("occasion_id","active","sort_order");
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "show_recipient" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "show_sender" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "occasions" ADD COLUMN IF NOT EXISTS "title_field_id" text;
--> statement-breakpoint
GRANT SELECT ON TABLE "occasion_fields" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "occasion_fields" TO musikpro_service;
--> statement-breakpoint
INSERT INTO "occasions" ("id", "name", "slug", "description", "emoji", "ai_hint", "active", "sort_order") VALUES
	('default-sport', 'Sport', 'sport', 'Encourager un athlète, une équipe ou une victoire.', '🏆', 'sports anthem, energetic, motivating, stadium chant', true, 90),
	('default-priere-culte', 'Prière / culte', 'priere-culte', 'Une chanson de prière, de louange ou de recueillement.', '🙏', 'worship and prayer, spiritual, reverent, uplifting', true, 100),
	('default-spot-publicitaire', 'Spot publicitaire', 'spot-publicitaire', 'Un jingle pour présenter un produit, une marque ou un événement.', '📣', 'advertising jingle, catchy, brand promotion, upbeat', true, 110)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "occasion_fields" ("id", "occasion_id", "key", "label", "help_text", "icon", "placeholder", "type", "options", "config", "required", "ai_hint", "sort_order")
SELECT 'seed-' || v.slug || '-' || v.key, o."id", v.key, v.label, v.help_text, v.icon, v.placeholder, v.type, v.options::jsonb, v.config::jsonb, v.required, v.ai_hint, v.sort_order
FROM (VALUES
	('anniversaire', 'birth_day', 'Jour de naissance', '', '📅', 'Ex: 15', 'number', '[]', '{"min":1,"max":31}', false, 'Mention the birthday day as part of the celebration, naturally, without stating the full date.', 10),
	('anniversaire', 'birth_month', 'Mois de naissance', '', '🗓️', '', 'select', '[{"label":"Janvier","emoji":"❄️"},{"label":"Février","emoji":"💝"},{"label":"Mars","emoji":"🌸"},{"label":"Avril","emoji":"🌷"},{"label":"Mai","emoji":"🌺"},{"label":"Juin","emoji":"☀️"},{"label":"Juillet","emoji":"🌴"},{"label":"Août","emoji":"🏖️"},{"label":"Sept","emoji":"🍂"},{"label":"Octobre","emoji":"🎃"},{"label":"Nov","emoji":"🍁"},{"label":"Déc","emoji":"🎄"}]', '{"display":"tiles"}', false, 'Evoke the birth month and its season in a warm, celebratory way.', 20),
	('anniversaire', 'age', 'Âge fêté', 'Facultatif', '🎈', 'Ex: 30', 'number', '[]', '{"min":0,"max":120}', false, 'Celebrate the milestone age naturally; never joke about getting old.', 30),
	('anniversaire', 'passion', 'Passion ou trait de personnalité', '', '⭐', 'Ex: passionné de football', 'short_text', '[]', '{"maxLength":100}', false, 'Weave this passion or trait into the verses as a compliment.', 40),
	('amour', 'nickname', 'Surnom affectueux', '', '💞', 'Ex: Mon cœur', 'short_text', '[]', '{"maxLength":60}', false, 'Use this nickname tenderly in the lyrics.', 10),
	('amour', 'meeting', 'Comment vous vous êtes rencontrés', '', '💬', 'Raconte en quelques mots', 'long_text', '[]', '{"maxLength":300}', false, 'Reference the story of how they met as a key memory.', 20),
	('amour', 'bond', 'Ce qui vous unit', '', '🤍', 'Ex: le rire, les voyages…', 'long_text', '[]', '{"maxLength":300}', false, 'Express what makes this couple special.', 30),
	('graduation', 'degree', 'Diplôme obtenu', '', '🎓', 'Ex: Master en gestion', 'short_text', '[]', '{"maxLength":100}', false, 'Celebrate this specific achievement.', 10),
	('graduation', 'school', 'Établissement', '', '🏫', 'Ex: Université de Cocody', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the school once, with pride.', 20),
	('graduation', 'next_step', 'Prochain projet', '', '🚀', 'Ex: lancer mon entreprise', 'short_text', '[]', '{"maxLength":100}', false, 'Look forward to this next step with hope.', 30),
	('fete', 'party_type', 'Type de fête', '', '🎉', '', 'select', '[{"label":"Mariage","emoji":"💍"},{"label":"Baptême","emoji":"👶"},{"label":"Fiançailles","emoji":"🥂"},{"label":"Réunion de famille","emoji":"👨‍👩‍👧‍👦"},{"label":"Soirée","emoji":"🎊"},{"label":"Autre","emoji":"✨"}]', '{"display":"tiles"}', false, 'Adapt the festive tone to this kind of party.', 10),
	('fete', 'event_name', 'Nom ou lieu de l''événement', '', '📍', 'Ex: Chez Tonton Moussa', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the event name or place once.', 20),
	('separation', 'feeling', 'Ce que tu veux exprimer', '', '💔', '', 'select', '[{"label":"Tourner la page","emoji":"🌅"},{"label":"Tristesse","emoji":"😢"},{"label":"Pardon","emoji":"🕊️"},{"label":"Force","emoji":"💪"}]', '{"display":"tiles"}', false, 'Make this the emotional core of the song.', 10),
	('separation', 'memory', 'Un souvenir à évoquer', '', '🕯️', 'Un moment, un lieu, une phrase…', 'long_text', '[]', '{"maxLength":300}', false, 'Evoke this memory gently, without blame.', 20),
	('gratitude', 'thanks', 'Ce pour quoi tu remercies', '', '🙏', 'Ex: ton soutien quand j''en avais besoin', 'long_text', '[]', '{"maxLength":300}', false, 'Make this the central reason for the thanks.', 10),
	('gratitude', 'since', 'Depuis quand cette personne t''accompagne', '', '⏳', 'Ex: depuis 10 ans', 'short_text', '[]', '{"maxLength":60}', false, 'Mention how long they have been there.', 20),
	('serenite', 'calm', 'Ce qui t''apaise', '', '🌿', 'Ex: le bruit de la pluie', 'short_text', '[]', '{"maxLength":100}', false, 'Use this as a soothing image.', 10),
	('serenite', 'moment', 'Moment de la journée', '', '🌙', '', 'select', '[{"label":"Matin","emoji":"🌅"},{"label":"Après-midi","emoji":"☀️"},{"label":"Soir","emoji":"🌇"},{"label":"Nuit","emoji":"🌙"}]', '{"display":"tiles"}', false, 'Set the song at this time of day.', 20),
	('motivation', 'goal', 'Objectif à atteindre', '', '🎯', 'Ex: finir mon marathon', 'short_text', '[]', '{"maxLength":100}', false, 'Make this goal the rallying cry.', 10),
	('motivation', 'obstacle', 'Obstacle à dépasser', '', '🧗', 'Ex: la peur d''échouer', 'short_text', '[]', '{"maxLength":100}', false, 'Show this obstacle being overcome.', 20),
	('sport', 'discipline', 'Discipline', '', '⚽', 'Ex: football, athlétisme…', 'short_text', '[]', '{"maxLength":60}', false, 'Use vocabulary of this sport.', 10),
	('sport', 'team', 'Équipe ou compétition', '', '🏆', 'Ex: Les Éléphants', 'short_text', '[]', '{"maxLength":100}', false, 'Mention the team or competition as a rallying cry.', 20),
	('sport', 'goal', 'Objectif', '', '🥇', 'Ex: gagner la finale', 'short_text', '[]', '{"maxLength":100}', false, 'Make this goal the climax of the song.', 30),
	('priere-culte', 'theme', 'Thème ou verset', '', '📖', 'Ex: Psaume 23', 'short_text', '[]', '{"maxLength":100}', false, 'Inspire the lyrics from this theme or verse, respectfully.', 10),
	('priere-culte', 'intention', 'Intention de prière', '', '🙏', 'Pour qui ou pour quoi prie-t-on ?', 'long_text', '[]', '{"maxLength":300}', false, 'Express this prayer intention with reverence.', 20),
	('spot-publicitaire', 'product_name', 'Nom du produit ou de la marque', '', '🏷️', 'Ex: Café Soleil', 'short_text', '[]', '{"maxLength":100}', true, 'Name the product or brand clearly and repeat it in the chorus.', 10),
	('spot-publicitaire', 'audience', 'Public ciblé', '', '👥', 'Ex: les jeunes urbains', 'short_text', '[]', '{"maxLength":100}', false, 'Speak directly to this audience.', 20),
	('spot-publicitaire', 'duration', 'Durée du spot', '', '⏱️', '', 'select', '[{"label":"15 s","emoji":"⏱️"},{"label":"30 s","emoji":"⏱️"},{"label":"60 s","emoji":"⏱️"}]', '{"display":"tiles"}', false, 'Keep the lyrics short and punchy to fit this spot duration.', 30),
	('spot-publicitaire', 'strengths', 'Points forts', '', '✨', 'Ce qui rend le produit unique', 'long_text', '[]', '{"maxLength":300}', false, 'Highlight these selling points in the verses.', 40),
	('spot-publicitaire', 'cta', 'Appel à l''action', '', '📣', 'Ex: Commandez dès aujourd''hui !', 'short_text', '[]', '{"maxLength":100}', false, 'End the chorus with this call to action.', 50)
) AS v(slug, key, label, help_text, icon, placeholder, type, options, config, required, ai_hint, sort_order)
JOIN "occasions" o ON o."slug" = v.slug
ON CONFLICT ("occasion_id", "key") DO NOTHING;
--> statement-breakpoint
UPDATE "occasions" SET "show_recipient" = false, "show_sender" = false, "title_field_id" = 'seed-spot-publicitaire-product_name'
WHERE "slug" = 'spot-publicitaire' AND "title_field_id" IS NULL
AND EXISTS (SELECT 1 FROM "occasion_fields" f WHERE f."id" = 'seed-spot-publicitaire-product_name');
```

- [ ] **Step 6: Enregistrer la migration dans le journal**

Dans `db/migrations/meta/_journal.json`, ajouter après l'entrée `idx: 61` (`when: 1790871049773`) :

```json
    {
      "idx": 62,
      "version": "7",
      "when": 1790871050773,
      "tag": "0062_occasion_fields",
      "breakpoints": true
    }
```

(Respecter la virgule de l'entrée précédente et la structure existante du fichier.)

- [ ] **Step 7: Vérifier**

Run: `npx vitest run tests/occasion-fields-migration.test.ts && npm run typecheck`
Expected: PASS ; typecheck sans erreur.

- [ ] **Step 8: Appliquer sur la branche `development` et vérifier l'idempotence**

Avec `mcp__claude_ai_Neon__run_sql_transaction` (`branch_id: br-misty-mountain-b4qavqvo`, après `list_branch_computes`), exécuter les instructions du fichier SQL (séparées au niveau de `--> statement-breakpoint`) **deux fois**. Puis vérifier :

```sql
SELECT o.slug, count(f.id) AS champs FROM occasions o LEFT JOIN occasion_fields f ON f.occasion_id = o.id GROUP BY o.slug ORDER BY o.slug;
SELECT slug, show_recipient, show_sender, title_field_id FROM occasions WHERE slug = 'spot-publicitaire';
```

Expected : aucune erreur à la seconde exécution, pas de doublons (même nombre de champs), `show_recipient = false` pour `spot-publicitaire`.

- [ ] **Step 9: Commit**

```bash
git add db/schema/index.ts db/migrations/0062_occasion_fields.sql db/migrations/meta/_journal.json tests/occasion-fields-migration.test.ts
git commit -m "feat(db): table occasion_fields, colonnes de blocs sur occasions et seed par défaut

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Couche serveur (lecture, résolution des réponses) et options d'occasion

**Files:**
- Create: `lib/occasion-fields/server.ts`
- Modify: `lib/occasions/catalog.ts` (type `OccasionOption`), `lib/occasions/server.ts`
- Test: `tests/occasion-fields-server-shape.test.ts`

**Interfaces:**
- Consumes: Task 1 (`validateOccasionAnswers`, types), Task 2 (`occasionFields`, colonnes `occasions`).
- Produces:
  - `getActiveOccasionFields(options?: { demo?: boolean }): Promise<Record<string, OccasionFieldClientDefinition[]>>` (clé = `occasion.id`).
  - `class OccasionDetailsError extends Error { errors: Record<string, AnswerErrorCode> }`.
  - `resolveOccasionDetails(occasionName: string, raw: OccasionAnswer[]): Promise<{ answers: ResolvedAnswer[]; titleValue: string }>` — lève `OccasionDetailsError`.
  - `OccasionOption` gagne `showRecipient?: boolean`, `showSender?: boolean`, `titleFieldId?: string | null` (absents ⇒ `true`/`true`/`null`).

- [ ] **Step 1: Test de forme (échoue)**

`resolveOccasionDetails` dépend de la base ; on teste la logique pure extraite, `pickTitleValue`. Créer `tests/occasion-fields-server-shape.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {}, getServiceDb: () => ({}) }));

import { pickTitleValue, toClientDefinition } from "@/lib/occasion-fields/server";

describe("pickTitleValue", () => {
  const answers = [
    { fieldId: "a", key: "a", label: "A", type: "short_text" as const, value: "Café Soleil", aiHint: "" },
  ];
  it("returns the answer of the title field", () => {
    expect(pickTitleValue(answers, "a")).toBe("Café Soleil");
  });
  it("returns an empty string without title field or answer", () => {
    expect(pickTitleValue(answers, null)).toBe("");
    expect(pickTitleValue(answers, "zzz")).toBe("");
  });
});

describe("toClientDefinition", () => {
  it("never exposes the AI hint", () => {
    const client = toClientDefinition({
      id: "f1",
      occasionId: "o1",
      key: "k",
      label: "L",
      helpText: "",
      icon: "",
      placeholder: "",
      type: "short_text",
      options: [],
      config: {},
      required: false,
      aiHint: "secret hint",
      sortOrder: 10,
      active: true,
      translations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(JSON.stringify(client)).not.toContain("secret hint");
    expect(client).not.toHaveProperty("aiHint");
  });
});
```

Run: `npx vitest run tests/occasion-fields-server-shape.test.ts` → FAIL (module absent).

- [ ] **Step 2: Étendre `OccasionOption`**

Dans `lib/occasions/catalog.ts`, ajouter au type `OccasionOption` :

```ts
  /** Bloc « La personne concernée » affiché à l'étape de personnalisation (défaut : oui). */
  showRecipient?: boolean;
  /** Bloc « De la part de qui » (défaut : oui). */
  showSender?: boolean;
  /** Champ (occasion_fields.id) servant de titre quand il n'y a pas de destinataire. */
  titleFieldId?: string | null;
```

Dans `lib/occasions/server.ts`, remplacer le `rows.map(...)` par :

```ts
    return rows.map(({ id, name, slug, description, emoji, translations, showRecipient, showSender, titleFieldId }) => ({
      id,
      name,
      slug,
      description,
      emoji,
      showRecipient,
      showSender,
      titleFieldId,
      translations: translations as OccasionOption["translations"],
    }));
```

- [ ] **Step 3: Implémenter `lib/occasion-fields/server.ts`**

```ts
import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { db, getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { validateOccasionAnswers, type AnswerErrorCode } from "./answers";
import type {
  OccasionAnswer,
  OccasionFieldClientDefinition,
  OccasionFieldConfig,
  OccasionFieldDefinition,
  OccasionFieldOption,
  ResolvedAnswer,
} from "./types";

type FieldRow = typeof occasionFields.$inferSelect;

function toDefinition(row: FieldRow): OccasionFieldDefinition {
  return {
    id: row.id,
    occasionId: row.occasionId,
    key: row.key,
    label: row.label,
    helpText: row.helpText,
    icon: row.icon,
    placeholder: row.placeholder,
    type: row.type as OccasionFieldDefinition["type"],
    options: (row.options ?? []) as OccasionFieldOption[],
    config: (row.config ?? {}) as OccasionFieldConfig,
    required: row.required,
    aiHint: row.aiHint,
    sortOrder: row.sortOrder,
    translations: row.translations as OccasionFieldDefinition["translations"],
  };
}

/** Retire la consigne IA avant d'envoyer la définition au navigateur. */
export function toClientDefinition(row: FieldRow): OccasionFieldClientDefinition {
  const { aiHint, ...client } = toDefinition(row);
  void aiHint;
  return client;
}

export function pickTitleValue(answers: ResolvedAnswer[], titleFieldId: string | null | undefined): string {
  if (!titleFieldId) return "";
  return answers.find((answer) => answer.fieldId === titleFieldId)?.value ?? "";
}

/** Champs actifs de toutes les occasions, groupés par `occasion.id`, sans consigne IA. */
export async function getActiveOccasionFields(
  options: { demo?: boolean } = {},
): Promise<Record<string, OccasionFieldClientDefinition[]>> {
  try {
    const rows = await db
      .select()
      .from(occasionFields)
      .where(eq(occasionFields.active, true))
      .orderBy(asc(occasionFields.occasionId), asc(occasionFields.sortOrder), asc(occasionFields.label));
    const grouped: Record<string, OccasionFieldClientDefinition[]> = {};
    for (const row of rows) (grouped[row.occasionId] ??= []).push(toClientDefinition(row));
    return grouped;
  } catch (error) {
    if (options.demo) return {};
    throw error;
  }
}

export class OccasionDetailsError extends Error {
  constructor(public readonly errors: Record<string, AnswerErrorCode>) {
    super("OCCASION_DETAILS_INVALID");
  }
}

/**
 * Revalide les réponses d'un client contre les définitions en base (l'occasion est retrouvée par
 * son nom français, valeur canonique). Une occasion inconnue n'a aucun champ : toute réponse est refusée.
 */
export async function resolveOccasionDetails(
  occasionName: string,
  raw: OccasionAnswer[],
): Promise<{ answers: ResolvedAnswer[]; titleValue: string }> {
  const database = getServiceDb();
  const [occasion] = await database
    .select({ id: occasions.id, titleFieldId: occasions.titleFieldId })
    .from(occasions)
    .where(sql`lower(${occasions.name}) = lower(${occasionName})`)
    .limit(1);
  const rows = occasion
    ? await database
        .select()
        .from(occasionFields)
        .where(and(eq(occasionFields.occasionId, occasion.id), eq(occasionFields.active, true)))
        .orderBy(asc(occasionFields.sortOrder))
    : [];
  const result = validateOccasionAnswers(rows.map(toDefinition), raw);
  if (!result.ok) throw new OccasionDetailsError(result.errors);
  return { answers: result.answers, titleValue: pickTitleValue(result.answers, occasion?.titleFieldId) };
}
```

- [ ] **Step 4: Vérifier**

Run: `npx vitest run tests/occasion-fields-server-shape.test.ts && npm run typecheck`
Expected: PASS ; typecheck sans erreur.

- [ ] **Step 5: Commit**

```bash
git add lib/occasion-fields/server.ts lib/occasions tests/occasion-fields-server-shape.test.ts
git commit -m "feat(occasions): lecture serveur des champs et résolution validée des réponses

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin — menu « Détails par occasion »

**Files:**
- Create: `app/admin/occasion-fields/actions.ts`, `app/admin/occasion-fields/page.tsx`, `app/admin/occasion-fields/[occasionId]/page.tsx`, `app/admin/occasion-fields/[occasionId]/fields/new/page.tsx`, `app/admin/occasion-fields/[occasionId]/fields/[fieldId]/page.tsx`, `components/admin/AdminOccasionBlocksForm.tsx`, `components/admin/AdminOccasionFieldForm.tsx`, `components/admin/AdminOccasionFieldSortableGrid.tsx`
- Modify: `components/admin/AdminShell.tsx`, `app/admin/menu/page.tsx`, `app/admin/languages/actions.ts`, `components/admin/RefreshCatalogTranslationsButton.tsx`
- Test: `tests/occasion-fields-actions-shape.test.ts`

**Interfaces:**
- Consumes: Task 1 (`occasionFieldFormSchema`, `slugifyFieldKey`, `formatOptionsText`, `FIELD_ICON_OPTIONS`, `fieldTranslationInput`, `MAX_ACTIVE_FIELDS_PER_OCCASION`), Task 2 (`occasionFields`, `occasions`).
- Produces: actions `updateOccasionBlocks`, `createOccasionField`, `updateOccasionField`, `toggleOccasionField`, `deleteOccasionField`, `duplicateOccasionField`, `reorderOccasionFields(occasionId: string, formData: FormData)` — toutes `(previous: AdminActionState, formData) => Promise<AdminActionState>` sauf `reorderOccasionFields`. Compteur `occasionFields` dans `counts` du rafraîchissement des traductions.

- [ ] **Step 1: Lire les composants à imiter**

Lire `components/admin/AdminSortableGrid.tsx` (props `items`, `onReorder`, `renderItem`, `renderPreview`, `itemLabel`, `className`), `components/admin/AdminOccasionForm.tsx` (usage de `AdminOccasionEmojiPicker`, noms de champs) et `app/admin/occasions/page.tsx` (structure `AdminPage`/`AdminPageHeader`). Les classes CSS `admin-editor-card`, `admin-editor-grid`, `admin-editor-field`, `admin-editor-actions`, `admin-catalog-card`, `admin-style-actions` existent déjà dans `app/admin/admin.css` : ne pas en créer de nouvelles.

- [ ] **Step 2: Test de forme des actions (échoue)**

Créer `tests/occasion-fields-actions-shape.test.ts` (garde-fou de la règle toast : aucun `redirect` dans un `try`, pas de `redirect` nu) :

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/admin/occasion-fields/actions.ts", "utf8");

describe("occasion-fields actions", () => {
  it("is a server-actions module and uses the shared toast state", () => {
    expect(source.startsWith('"use server"')).toBe(true);
    expect(source).toContain("AdminActionState");
    expect(source).toContain("actionErrorMessage");
  });

  it("redirects only through withAdminNotice, never inside a try block", () => {
    expect(source).not.toMatch(/redirect\(\s*["'`]/);
    const redirects = [...source.matchAll(/redirect\(withAdminNotice/g)].length;
    expect(redirects).toBeGreaterThan(0);
  });

  it("caps active fields per occasion", () => {
    expect(source).toContain("MAX_ACTIVE_FIELDS_PER_OCCASION");
  });

  it("revalidates the admin and the client creation pages", () => {
    expect(source).toContain('revalidatePath("/admin/occasion-fields")');
    expect(source).toContain('revalidatePath("/dashboard/create/recipient")');
    expect(source).toContain('revalidatePath("/demo/create/recipient")');
  });
});
```

Run: `npx vitest run tests/occasion-fields-actions-shape.test.ts` → FAIL.

- [ ] **Step 3: Implémenter `actions.ts`**

```ts
"use server";

import { randomUUID } from "node:crypto";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { requireAdmin } from "@/lib/auth/session";
import { occasionFieldFormSchema, slugifyFieldKey } from "@/lib/occasion-fields/form-schema";
import { MAX_ACTIVE_FIELDS_PER_OCCASION } from "@/lib/occasion-fields/types";
import { writeAuditLog } from "@/lib/security/audit";

const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const blocksSchema = z.object({
  occasionId: z.string().trim().min(1).max(120),
  showRecipient: z.enum(["true", "false"]),
  showSender: z.enum(["true", "false"]),
  titleFieldId: z.string().trim().max(120).default(""),
});
const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });
const duplicateSchema = idSchema.extend({ targetOccasionId: z.string().trim().min(1).max(120) });
const reorderSchema = z.object({
  order: z
    .string()
    .max(30000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Ordre invalide." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(50))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque champ doit apparaître une seule fois."),
});

function revalidateOccasionFields(occasionId?: string) {
  revalidatePath("/admin/occasion-fields");
  if (occasionId) revalidatePath(`/admin/occasion-fields/${occasionId}`);
  revalidatePath("/dashboard/create/recipient");
  revalidatePath("/demo/create/recipient");
}

async function assertRoomForActiveField(occasionId: string, excludeFieldId?: string) {
  const [row] = await getServiceDb()
    .select({ total: count() })
    .from(occasionFields)
    .where(
      and(
        eq(occasionFields.occasionId, occasionId),
        eq(occasionFields.active, true),
        excludeFieldId ? sql`${occasionFields.id} <> ${excludeFieldId}` : undefined,
      ),
    );
  if ((row?.total ?? 0) >= MAX_ACTIVE_FIELDS_PER_OCCASION)
    throw new Error(`Une occasion ne peut avoir que ${MAX_ACTIVE_FIELDS_PER_OCCASION} champs actifs.`);
}

async function uniqueKey(occasionId: string, label: string) {
  const base = slugifyFieldKey(label);
  const existing = await getServiceDb()
    .select({ key: occasionFields.key })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId));
  const taken = new Set(existing.map((row) => row.key));
  if (!taken.has(base)) return base;
  for (let n = 2; n < 100; n += 1) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
  throw new Error("Impossible de générer un identifiant unique pour ce champ.");
}

export async function updateOccasionBlocks(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = blocksSchema.parse(Object.fromEntries(formData));
    if (parsed.titleFieldId) {
      const [field] = await getServiceDb()
        .select({ id: occasionFields.id })
        .from(occasionFields)
        .where(and(eq(occasionFields.id, parsed.titleFieldId), eq(occasionFields.occasionId, parsed.occasionId)))
        .limit(1);
      if (!field) throw new Error("Le champ du titre n’appartient pas à cette occasion.");
    }
    await getServiceDb()
      .update(occasions)
      .set({
        showRecipient: parsed.showRecipient === "true",
        showSender: parsed.showSender === "true",
        titleFieldId: parsed.titleFieldId || null,
        updatedAt: new Date(),
      })
      .where(eq(occasions.id, parsed.occasionId));
    await writeAuditLog({
      action: "occasion_fields.blocks.updated",
      actorId: session.user.id,
      targetType: "occasion",
      targetId: parsed.occasionId,
      metadata: { showRecipient: parsed.showRecipient, showSender: parsed.showSender, titleFieldId: parsed.titleFieldId },
    });
    revalidateOccasionFields(parsed.occasionId);
    return { ok: true, message: "Blocs intégrés enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les blocs intégrés.") };
  }
}

export async function createOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  let occasionId = "";
  try {
    const parsed = occasionFieldFormSchema.parse(Object.fromEntries(formData));
    occasionId = parsed.occasionId;
    if (parsed.active === "true") await assertRoomForActiveField(occasionId);
    const id = randomUUID();
    await getServiceDb()
      .insert(occasionFields)
      .values({
        id,
        occasionId,
        key: await uniqueKey(occasionId, parsed.label),
        label: parsed.label,
        helpText: parsed.helpText,
        icon: parsed.icon,
        placeholder: parsed.placeholder,
        type: parsed.type,
        options: parsed.options,
        config: parsed.config,
        required: parsed.required === "true",
        aiHint: parsed.aiHint,
        sortOrder: parsed.sortOrder,
        active: parsed.active === "true",
      });
    await writeAuditLog({
      action: "occasion_field.created",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { occasionId, label: parsed.label, type: parsed.type },
    });
    revalidateOccasionFields(occasionId);
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce champ.") };
  }
  redirect(withAdminNotice(`/admin/occasion-fields/${occasionId}`, "Champ créé."));
}

export async function updateOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const { id } = idSchema.parse(Object.fromEntries(formData));
    const parsed = occasionFieldFormSchema.parse(Object.fromEntries(formData));
    if (parsed.active === "true") await assertRoomForActiveField(parsed.occasionId, id);
    await getServiceDb()
      .update(occasionFields)
      .set({
        label: parsed.label,
        helpText: parsed.helpText,
        icon: parsed.icon,
        placeholder: parsed.placeholder,
        type: parsed.type,
        options: parsed.options,
        config: parsed.config,
        required: parsed.required === "true",
        aiHint: parsed.aiHint,
        sortOrder: parsed.sortOrder,
        active: parsed.active === "true",
        updatedAt: new Date(),
      })
      .where(and(eq(occasionFields.id, id), eq(occasionFields.occasionId, parsed.occasionId)));
    await writeAuditLog({
      action: "occasion_field.updated",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { label: parsed.label, type: parsed.type },
    });
    revalidateOccasionFields(parsed.occasionId);
    return { ok: true, message: "Champ enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce champ.") };
  }
}

export async function toggleOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = toggleSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true"; // le formulaire envoie l'état actuel
    const [field] = await getServiceDb()
      .select({ occasionId: occasionFields.occasionId })
      .from(occasionFields)
      .where(eq(occasionFields.id, parsed.id))
      .limit(1);
    if (!field) throw new Error("Champ introuvable.");
    if (active) await assertRoomForActiveField(field.occasionId, parsed.id);
    await getServiceDb()
      .update(occasionFields)
      .set({ active, updatedAt: new Date() })
      .where(eq(occasionFields.id, parsed.id));
    await writeAuditLog({
      action: "occasion_field.active.changed",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateOccasionFields(field.occasionId);
    return { ok: true, message: active ? "Champ activé." : "Champ désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce champ.") };
  }
}

export async function deleteOccasionField(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const { id } = idSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [field] = await database
      .select({ occasionId: occasionFields.occasionId })
      .from(occasionFields)
      .where(eq(occasionFields.id, id))
      .limit(1);
    // Un champ supprimé ne doit pas rester le « champ du titre » d'une occasion.
    await database.update(occasions).set({ titleFieldId: null }).where(eq(occasions.titleFieldId, id));
    await database.delete(occasionFields).where(eq(occasionFields.id, id));
    await writeAuditLog({
      action: "occasion_field.deleted",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
    });
    revalidateOccasionFields(field?.occasionId);
    return { ok: true, message: "Champ supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce champ.") };
  }
}

export async function duplicateOccasionField(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = duplicateSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [source] = await database.select().from(occasionFields).where(eq(occasionFields.id, parsed.id)).limit(1);
    if (!source) throw new Error("Champ introuvable.");
    const [target] = await database
      .select({ id: occasions.id })
      .from(occasions)
      .where(eq(occasions.id, parsed.targetOccasionId))
      .limit(1);
    if (!target) throw new Error("Occasion de destination introuvable.");
    await assertRoomForActiveField(target.id);
    const id = randomUUID();
    await database.insert(occasionFields).values({
      ...source,
      id,
      occasionId: target.id,
      key: await uniqueKey(target.id, source.label),
      translations: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await writeAuditLog({
      action: "occasion_field.duplicated",
      actorId: session.user.id,
      targetType: "occasion_field",
      targetId: id,
      metadata: { from: parsed.id, toOccasionId: target.id },
    });
    revalidateOccasionFields(target.id);
    return { ok: true, message: "Champ dupliqué. Lance « Actualiser les traductions » pour le traduire." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de dupliquer ce champ.") };
  }
}

export async function reorderOccasionFields(occasionId: string, formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database
    .select({ id: occasionFields.id })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId))
    .orderBy(asc(occasionFields.sortOrder));
  const existingIds = new Set(existing.map((field) => field.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des champs a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${occasionFields} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${occasionFields.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "occasion_field.reordered",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: occasionId,
    metadata: { order },
  });
  revalidateOccasionFields(occasionId);
}
```

- [ ] **Step 4: Composants admin**

`components/admin/AdminOccasionBlocksForm.tsx` :

```tsx
"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { updateOccasionBlocks } from "@/app/admin/occasion-fields/actions";

export default function AdminOccasionBlocksForm({
  occasionId,
  showRecipient,
  showSender,
  titleFieldId,
  fields,
}: {
  occasionId: string;
  showRecipient: boolean;
  showSender: boolean;
  titleFieldId: string | null;
  fields: Array<{ id: string; label: string }>;
}) {
  const yesNo = (label: string) => [
    { value: "true", label: `${label} — affiché` },
    { value: "false", label: `${label} — masqué` },
  ];
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={updateOccasionBlocks} className="admin-editor-grid admin-occasion-editor-grid">
        <input type="hidden" name="occasionId" value={occasionId} />
        <div className="admin-editor-field">
          <span>Bloc « La personne concernée » (nom, prononciation, lien)</span>
          <AdminSelect
            name="showRecipient"
            ariaLabel="Afficher la personne concernée"
            defaultValue={String(showRecipient)}
            options={yesNo("Personne concernée")}
          />
        </div>
        <div className="admin-editor-field">
          <span>Bloc « De la part de qui »</span>
          <AdminSelect
            name="showSender"
            ariaLabel="Afficher de la part de qui"
            defaultValue={String(showSender)}
            options={yesNo("De la part de qui")}
          />
        </div>
        <div className="admin-editor-field is-wide">
          <span>Champ utilisé pour le titre quand il n’y a pas de destinataire (ex. nom du produit)</span>
          <AdminSelect
            name="titleFieldId"
            ariaLabel="Champ du titre"
            defaultValue={titleFieldId ?? ""}
            options={[{ value: "", label: "Aucun — titre sans nom" }, ...fields.map((f) => ({ value: f.id, label: f.label }))]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <button type="submit">
            <Icon i="save" size={17} /> Enregistrer les blocs
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
```

`components/admin/AdminOccasionFieldForm.tsx` (création et modification ; les zones « options », « min/max », « longueur » ne s'affichent que pour les types concernés) :

```tsx
"use client";

import { useState } from "react";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminOccasionEmojiPicker from "@/components/admin/AdminOccasionEmojiPicker";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { FIELD_ICON_OPTIONS, formatOptionsText } from "@/lib/occasion-fields/form-schema";
import type { OccasionFieldDefinition } from "@/lib/occasion-fields/types";

const TYPE_OPTIONS = [
  { value: "short_text", label: "Texte court" },
  { value: "long_text", label: "Texte long" },
  { value: "select", label: "Liste de choix" },
  { value: "number", label: "Nombre" },
  { value: "date", label: "Date" },
];

export default function AdminOccasionFieldForm({
  action,
  occasionId,
  field,
}: {
  action: (previous: AdminActionState, data: FormData) => Promise<AdminActionState>;
  occasionId: string;
  field?: OccasionFieldDefinition & { active: boolean };
}) {
  const [type, setType] = useState<string>(field?.type ?? "short_text");
  const text = type === "short_text" || type === "long_text";
  return (
    <section className="admin-panel admin-editor-card">
      <AdminActionForm action={action} className="admin-editor-grid admin-occasion-editor-grid">
        <input type="hidden" name="occasionId" value={occasionId} />
        {field ? <input type="hidden" name="id" value={field.id} /> : null}
        <label className="admin-editor-field">
          <span>Libellé affiché au client</span>
          <input name="label" required minLength={2} maxLength={80} defaultValue={field?.label} placeholder="Ex. Jour de naissance" />
        </label>
        <div className="admin-editor-field">
          <span>Type de champ</span>
          <AdminSelect name="type" ariaLabel="Type de champ" value={type} onValueChange={setType} options={TYPE_OPTIONS} />
        </div>
        <label className="admin-editor-field">
          <span>Texte d’exemple dans le champ</span>
          <input name="placeholder" maxLength={60} defaultValue={field?.placeholder} placeholder="Ex: 15" />
        </label>
        <div className="admin-editor-field">
          <span>Icône devant le libellé</span>
          <AdminOccasionEmojiPicker defaultEmoji={field?.icon || "📝"} subject="du champ" options={FIELD_ICON_OPTIONS} />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Aide sous le libellé (facultatif)</span>
          <input name="helpText" maxLength={160} defaultValue={field?.helpText} />
        </label>
        {type === "select" ? (
          <>
            <label className="admin-editor-field is-wide">
              <span>Choix — un par ligne, avec un emoji devant (ex. « ❄️ Janvier »), de 2 à 12</span>
              <textarea name="optionsText" rows={6} maxLength={1500} defaultValue={field ? formatOptionsText(field.options) : ""} />
            </label>
            <div className="admin-editor-field">
              <span>Affichage</span>
              <AdminSelect
                name="display"
                ariaLabel="Affichage de la liste"
                defaultValue={field?.config.display ?? "tiles"}
                options={[
                  { value: "tiles", label: "Tuiles avec emoji" },
                  { value: "dropdown", label: "Liste déroulante" },
                ]}
              />
            </div>
          </>
        ) : null}
        {text ? (
          <label className="admin-editor-field">
            <span>Longueur maximale ({type === "short_text" ? "≤ 200" : "≤ 600"})</span>
            <input name="maxLength" type="number" min={1} max={type === "short_text" ? 200 : 600} defaultValue={field?.config.maxLength} />
          </label>
        ) : null}
        {type === "number" ? (
          <>
            <label className="admin-editor-field">
              <span>Minimum</span>
              <input name="min" type="number" defaultValue={field?.config.min} />
            </label>
            <label className="admin-editor-field">
              <span>Maximum</span>
              <input name="max" type="number" defaultValue={field?.config.max} />
            </label>
          </>
        ) : null}
        <div className="admin-editor-field">
          <span>Obligatoire</span>
          <AdminSelect
            name="required"
            ariaLabel="Champ obligatoire"
            defaultValue={String(field?.required ?? false)}
            options={[
              { value: "false", label: "Facultatif" },
              { value: "true", label: "Obligatoire" },
            ]}
          />
        </div>
        <label className="admin-editor-field is-wide">
          <span>Consigne pour l’IA (en anglais, invisible du client, 200 caractères max)</span>
          <input name="aiHint" maxLength={200} defaultValue={field?.aiHint} placeholder="Ex. Mention the birth month warmly." />
        </label>
        <label className="admin-editor-field">
          <span>Position d’affichage</span>
          <input name="sortOrder" required type="number" min={0} max={999} defaultValue={field?.sortOrder ?? 100} />
        </label>
        <div className="admin-editor-field">
          <span>État</span>
          <AdminSelect
            name="active"
            ariaLabel="État du champ"
            defaultValue={String(field?.active ?? true)}
            options={[
              { value: "true", label: "Actif — visible pour les clients" },
              { value: "false", label: "Désactivé — masqué" },
            ]}
          />
        </div>
        <div className="admin-editor-actions is-wide">
          <AdminBackLink href={`/admin/occasion-fields/${occasionId}`} label="Annuler" />
          <button type="submit">
            <Icon i={field ? "save" : "plus"} size={17} />
            {field ? "Enregistrer les modifications" : "Créer le champ"}
          </button>
        </div>
      </AdminActionForm>
    </section>
  );
}
```

> Note : `AdminOccasionEmojiPicker` écrit son emoji dans un `<input name="emoji">` ; **lire son JSX final** (fin du fichier). Si le nom est `emoji`, ajouter une prop `name?: string` (défaut `"emoji"`) au picker et passer `name="icon"` ici — changement additif, les autres usages restent identiques.

`components/admin/AdminOccasionFieldSortableGrid.tsx` (modèle : `AdminRecipientRelationSortableGrid.tsx`) — chaque carte affiche icône + libellé + type + « Obligatoire », et les boutons Modifier (lien), Activer/Désactiver, Supprimer (comme dans le modèle, avec `useActionState` local + `useAdminActionToast`) et un formulaire `AdminActionForm` « Dupliquer vers » avec `AdminSelect name="targetOccasionId"` :

```tsx
"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  deleteOccasionField,
  duplicateOccasionField,
  reorderOccasionFields,
  toggleOccasionField,
} from "@/app/admin/occasion-fields/actions";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import AdminSortableGrid from "@/components/admin/AdminSortableGrid";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import Icon from "@/components/banani/Icon";

export type SortableOccasionField = {
  id: string;
  label: string;
  icon: string;
  type: string;
  required: boolean;
  active: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  short_text: "Texte court",
  long_text: "Texte long",
  select: "Liste de choix",
  number: "Nombre",
  date: "Date",
};

function ToggleForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(toggleOccasionField, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} /> {active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}

function DeleteForm({ id, label }: { id: string; label: string }) {
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(deleteOccasionField, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="admin-style-delete"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(`Supprimer définitivement le champ « ${label} » ?`)) event.preventDefault();
        }}
      >
        <Icon i="trash" size={15} /> Supprimer
      </button>
    </form>
  );
}

export default function AdminOccasionFieldSortableGrid({
  occasionId,
  fields,
  otherOccasions,
}: {
  occasionId: string;
  fields: SortableOccasionField[];
  otherOccasions: Array<{ id: string; name: string }>;
}) {
  return (
    <AdminSortableGrid
      items={fields}
      onReorder={reorderOccasionFields.bind(null, occasionId)}
      className="admin-music-style-grid admin-recipient-relation-grid"
      itemLabel={(field) => field.label}
      renderItem={(field, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card ${field.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon" aria-hidden="true">{field.icon || "📝"}</span>
            <span className={`admin-status ${field.active ? "is-success" : "is-pending"}`}>
              {field.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{field.label}</h2>
          <small>
            {TYPE_LABELS[field.type] ?? field.type}
            {field.required ? " · Obligatoire" : ""} · Ordre {context.index + 1}
          </small>
          <footer className="admin-style-actions">
            <Link
              className="admin-secondary-action admin-style-edit"
              href={`/admin/occasion-fields/${occasionId}/fields/${field.id}`}
            >
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <ToggleForm id={field.id} active={field.active} />
            <DeleteForm id={field.id} label={field.label} />
          </footer>
          {otherOccasions.length ? (
            <AdminActionForm action={duplicateOccasionField} className="admin-style-actions">
              <input type="hidden" name="id" value={field.id} />
              <AdminSelect
                name="targetOccasionId"
                ariaLabel={`Dupliquer ${field.label} vers`}
                placeholder="Dupliquer vers…"
                defaultValue=""
                options={otherOccasions.map((occasion) => ({ value: occasion.id, label: occasion.name }))}
              />
              <button className="admin-secondary-action" type="submit">
                <Icon i="copy" size={15} /> Dupliquer
              </button>
            </AdminActionForm>
          ) : null}
        </article>
      )}
      renderPreview={(field) => (
        <>
          <span className="admin-catalog-icon">{field.icon || "📝"}</span>
          <strong>{field.label}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
```

- [ ] **Step 5: Pages**

`app/admin/occasion-fields/page.tsx` : `requireAdmin()`, liste des occasions avec nombre de champs actifs ; chaque ligne est un lien vers `/admin/occasion-fields/[id]`. Utiliser `AdminPage`/`AdminPageHeader` (`eyebrow="Configuration musicale"`, `title="Détails par occasion"`, `description="Choisis, pour chaque occasion, les blocs et les champs de l’étape « Personnalise ta chanson »."`).

```tsx
import { asc, count, eq, and } from "drizzle-orm";
import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminOccasionFieldsPage() {
  await requireAdmin();
  const database = getServiceDb();
  const rows = await database.select().from(occasions).orderBy(asc(occasions.sortOrder), asc(occasions.name));
  const counts = await database
    .select({ occasionId: occasionFields.occasionId, total: count() })
    .from(occasionFields)
    .where(and(eq(occasionFields.active, true)))
    .groupBy(occasionFields.occasionId);
  const totals = new Map(counts.map((row) => [row.occasionId, row.total]));
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Détails par occasion"
        description="Choisis, pour chaque occasion, les blocs et les champs de l’étape « Personnalise ta chanson »."
      />
      <div className="admin-music-style-grid admin-recipient-relation-grid">
        {rows.map((occasion) => (
          <Link key={occasion.id} href={`/admin/occasion-fields/${occasion.id}`} className="admin-catalog-card admin-music-style-card is-active">
            <div className="admin-catalog-card-head">
              <span className="admin-catalog-icon" aria-hidden="true">{occasion.emoji}</span>
              <span className={`admin-status ${occasion.active ? "is-success" : "is-pending"}`}>
                {occasion.active ? "Active" : "Désactivée"}
              </span>
            </div>
            <h2>{occasion.name}</h2>
            <small>{totals.get(occasion.id) ?? 0} champ(s) actif(s)</small>
            <span className="admin-secondary-action"><Icon i="pencil" size={15} /> Configurer</span>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
```

`app/admin/occasion-fields/[occasionId]/page.tsx` : charge l'occasion (404 sinon) et ses champs ; rend `AdminTabs` (`ariaLabel="Détails de l’occasion"`, onglets `blocks` « Blocs intégrés » et `fields` « Champs ») ; panneau `blocks` → `AdminOccasionBlocksForm` ; panneau `fields` → bouton « Nouveau champ » (`/admin/occasion-fields/[id]/fields/new`) + `AdminOccasionFieldSortableGrid` (ou état vide). `otherOccasions` = les autres occasions. Params : `{ params }: { params: Promise<{ occasionId: string }> }`.

`.../fields/new/page.tsx` : `AdminOccasionFieldForm action={createOccasionField} occasionId={occasionId}` avec `AdminBackLink`. `.../fields/[fieldId]/page.tsx` : charge le champ (404 s'il n'appartient pas à `occasionId`) et rend `AdminOccasionFieldForm action={updateOccasionField} occasionId field={...}` où `field` est la ligne convertie (`options`, `config` castés comme dans `lib/occasion-fields/server.ts`, `translations` omis).

- [ ] **Step 6: Entrées de menu**

`components/admin/AdminShell.tsx` (groupe « Configuration », juste après « Occasions ») :

```ts
      { href: "/admin/occasion-fields", icon: "list-checks", label: "Détails par occasion" },
```

`app/admin/menu/page.tsx` (tableau `links`, après la ligne des occasions) :

```ts
  ["/admin/occasion-fields", "Détails par occasion", "list-checks"],
```

Vérifier que l'icône `list-checks` existe dans `components/banani/Icon.tsx` ; sinon utiliser `list` ou `clipboard-list` déjà présentes.

- [ ] **Step 7: Traductions du catalogue**

Dans `app/admin/languages/actions.ts` :
1. Importer `occasionFields` depuis `@/db/schema` et `fieldTranslationInput` depuis `@/lib/occasion-fields/types`.
2. Ajouter `occasionFieldRows` (dernier élément du tableau du premier `Promise.all` : `serviceDb.select().from(occasionFields)`), `occasionFieldTranslations` (dernier élément du second `Promise.all` : `translateCatalogTable(occasionFieldRows.map((row) => ({ id: row.id, fields: fieldTranslationInput({ label: row.label, helpText: row.helpText, placeholder: row.placeholder, options: (row.options ?? []) as Array<{ label: string; emoji: string }> }) })))`), le lot de mises à jour correspondant (`serviceDb.update(occasionFields).set({ translations: occasionFieldTranslations.get(row.id) ?? {}, updatedAt: new Date() }).where(eq(occasionFields.id, row.id))`) et `occasionFields: occasionFieldRows.length` dans `counts`.

Dans `components/admin/RefreshCatalogTranslationsButton.tsx` : ajouter `occasionFields: number;` au type `Counts` et `, {counts.occasionFields} champs de détail` à la phrase de confirmation.

- [ ] **Step 8: Vérifier**

Run: `npx vitest run tests/occasion-fields-actions-shape.test.ts && npm run typecheck && npm run lint`
Expected: PASS, sans erreur de typage ni de lint.

- [ ] **Step 9: Vérification dans le navigateur (admin)**

`npm run dev`, se connecter en admin, ouvrir `/admin/occasion-fields` : vérifier la liste, l'onglet « Blocs intégrés » (enregistrer → toast vert), créer un champ liste avec 3 choix (toast + redirection avec notice), le modifier, le dupliquer vers une autre occasion, le désactiver, le réordonner, le supprimer ; tenter un 9ᵉ champ actif (toast rouge « 8 champs actifs »).

- [ ] **Step 10: Commit**

```bash
git add app/admin/occasion-fields components/admin app/admin/menu app/admin/languages tests/occasion-fields-actions-shape.test.ts
git commit -m "feat(admin): menu Détails par occasion (blocs intégrés et champs dynamiques)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4b: Assistant IA (proposer des champs, compléter un champ, suggérer les blocs)

**Files:**
- Create: `lib/occasion-fields/ai-schema.ts`, `lib/ai/occasion-field-suggestions.ts`, `app/admin/occasion-fields/ai-actions.ts`, `components/admin/AdminOccasionFieldAiPanel.tsx`
- Modify: `app/admin/occasion-fields/actions.ts` (ajout de `addProposedFields`), `components/admin/AdminOccasionFieldForm.tsx` (champs contrôlés + bouton), `components/admin/AdminOccasionBlocksForm.tsx` (sélecteurs contrôlés + bouton), `app/admin/occasion-fields/[occasionId]/page.tsx` (panneau IA dans l'onglet « Champs »)
- Test: `tests/occasion-fields-ai-schema.test.ts`

**Interfaces:**
- Consumes: Task 1 (`occasionFieldFormSchema`, `formatOptionsText`, types), Task 4 (actions, formulaires, page).
- Produces:
  - `type FieldProposal = { label: string; helpText: string; icon: string; placeholder: string; type: OccasionFieldType; options: OccasionFieldOption[]; config: OccasionFieldConfig; required: boolean; aiHint: string }`.
  - `MAX_AI_FIELD_PROPOSALS = 6`.
  - `sanitizeFieldProposals(rawText: string, ctx: { occasionId: string; existingLabels: string[]; room: number }): FieldProposal[]`.
  - `sanitizeSingleProposal(rawText: string, ctx: { occasionId: string }): FieldProposal | null`.
  - `parseBlockProposal(rawText: string, fields: Array<{ id: string; label: string }>): { showRecipient: boolean; showSender: boolean; titleFieldId: string | null } | null`.
  - `proposalToFormInput(proposal: FieldProposal, occasionId: string, sortOrder: number): Record<string, string>` (entrée de `occasionFieldFormSchema`).
  - Server Actions (lecture seule, `{ ok: true; … } | { ok: false; message: string }`) : `proposeOccasionFields(occasionId)`, `completeOccasionField({ occasionId, label })`, `proposeOccasionBlocks(occasionId)`.
  - Action `addProposedFields(previous: AdminActionState, formData: FormData): Promise<AdminActionState>` (champs `occasionId`, `proposals` = JSON).

- [ ] **Step 1: Tests de l'assainissement (échouent)**

Créer `tests/occasion-fields-ai-schema.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_AI_FIELD_PROPOSALS,
  parseBlockProposal,
  proposalToFormInput,
  sanitizeFieldProposals,
  sanitizeSingleProposal,
} from "@/lib/occasion-fields/ai-schema";
import { occasionFieldFormSchema } from "@/lib/occasion-fields/form-schema";

const ctx = { occasionId: "occ-1", existingLabels: [] as string[], room: 8 };

const good = {
  label: "Mois de naissance",
  type: "select",
  icon: "🗓️",
  placeholder: "",
  helpText: "",
  options: [
    { label: "Janvier", emoji: "❄️" },
    { label: "Février", emoji: "💝" },
  ],
  required: false,
  aiHint: "Evoke the birth month warmly.",
};

describe("sanitizeFieldProposals", () => {
  it("parses a JSON array, including inside a markdown fence or an object wrapper", () => {
    expect(sanitizeFieldProposals(JSON.stringify([good]), ctx)).toHaveLength(1);
    expect(sanitizeFieldProposals("```json\n" + JSON.stringify([good]) + "\n```", ctx)).toHaveLength(1);
    expect(sanitizeFieldProposals("Voici :\n" + JSON.stringify({ fields: [good] }), ctx)).toHaveLength(1);
  });

  it("returns an empty list for garbage instead of throwing", () => {
    expect(sanitizeFieldProposals("pas du json", ctx)).toEqual([]);
    expect(sanitizeFieldProposals("[1, 2, 3]", ctx)).toEqual([]);
  });

  it("drops invalid proposals but keeps the valid ones (unknown type, select with one option, bad emoji icon)", () => {
    const raw = JSON.stringify([
      good,
      { ...good, label: "Type inconnu", type: "checkbox" },
      { ...good, label: "Une seule option", options: [{ label: "Seul", emoji: "" }] },
      { ...good, label: "Icône texte", icon: "abc" },
    ]);
    const result = sanitizeFieldProposals(raw, ctx);
    expect(result.map((p) => p.label)).toEqual(["Mois de naissance"]);
  });

  it("drops labels that already exist, ignoring case and accents, and duplicates among proposals", () => {
    const raw = JSON.stringify([good, { ...good, label: "MOIS DE NAISSANCE" }, { ...good, label: "Âge fêté", type: "number" }]);
    const result = sanitizeFieldProposals(raw, { ...ctx, existingLabels: ["Âge Fete"] });
    expect(result.map((p) => p.label)).toEqual(["Mois de naissance"]);
  });

  it("caps the list at 6 and at the remaining room", () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...good, label: `Champ ${i}`, type: "short_text", options: [] }));
    expect(sanitizeFieldProposals(JSON.stringify(many), ctx)).toHaveLength(MAX_AI_FIELD_PROPOSALS);
    expect(sanitizeFieldProposals(JSON.stringify(many), { ...ctx, room: 2 })).toHaveLength(2);
    expect(sanitizeFieldProposals(JSON.stringify(many), { ...ctx, room: 0 })).toEqual([]);
  });

  it("clamps an over-long AI hint to what the form schema accepts by rejecting the proposal", () => {
    const result = sanitizeFieldProposals(JSON.stringify([{ ...good, aiHint: "x".repeat(250) }]), ctx);
    expect(result).toEqual([]);
  });

  it("produces proposals that the admin form schema accepts as-is", () => {
    const [proposal] = sanitizeFieldProposals(JSON.stringify([good]), ctx);
    expect(() => occasionFieldFormSchema.parse(proposalToFormInput(proposal, "occ-1", 10))).not.toThrow();
  });
});

describe("sanitizeSingleProposal", () => {
  it("accepts one object and rejects an invalid one", () => {
    expect(sanitizeSingleProposal(JSON.stringify(good), { occasionId: "occ-1" })?.label).toBe("Mois de naissance");
    expect(sanitizeSingleProposal(JSON.stringify({ ...good, type: "nope" }), { occasionId: "occ-1" })).toBeNull();
  });
});

describe("parseBlockProposal", () => {
  const fields = [
    { id: "f1", label: "Nom du produit ou de la marque" },
    { id: "f2", label: "Public ciblé" },
  ];
  it("maps the title field label to an existing field id", () => {
    expect(
      parseBlockProposal(
        JSON.stringify({ showRecipient: false, showSender: false, titleFieldLabel: "nom du produit ou de la marque" }),
        fields,
      ),
    ).toEqual({ showRecipient: false, showSender: false, titleFieldId: "f1" });
  });
  it("ignores an invented title field and refuses malformed output", () => {
    expect(
      parseBlockProposal(JSON.stringify({ showRecipient: true, showSender: true, titleFieldLabel: "Inconnu" }), fields),
    ).toEqual({ showRecipient: true, showSender: true, titleFieldId: null });
    expect(parseBlockProposal("n'importe quoi", fields)).toBeNull();
    expect(parseBlockProposal(JSON.stringify({ showRecipient: "oui" }), fields)).toBeNull();
  });
});
```

Run: `npx vitest run tests/occasion-fields-ai-schema.test.ts` → FAIL (module absent).

- [ ] **Step 2: Implémenter `lib/occasion-fields/ai-schema.ts`**

```ts
import { z } from "zod";
import { formatOptionsText, occasionFieldFormSchema } from "./form-schema";
import {
  OCCASION_FIELD_TYPES,
  type OccasionFieldConfig,
  type OccasionFieldOption,
  type OccasionFieldType,
} from "./types";

export const MAX_AI_FIELD_PROPOSALS = 6;

export type FieldProposal = {
  label: string;
  helpText: string;
  icon: string;
  placeholder: string;
  type: OccasionFieldType;
  options: OccasionFieldOption[];
  config: OccasionFieldConfig;
  required: boolean;
  aiHint: string;
};

const rawProposalSchema = z.object({
  label: z.string(),
  type: z.enum(OCCASION_FIELD_TYPES),
  icon: z.string().optional().default(""),
  placeholder: z.string().optional().default(""),
  helpText: z.string().optional().default(""),
  options: z
    .array(z.object({ label: z.string(), emoji: z.string().optional().default("") }))
    .optional()
    .default([]),
  required: z.boolean().optional().default(false),
  aiHint: z.string().optional().default(""),
  display: z.enum(["dropdown", "tiles"]).optional(),
  min: z.number().int().optional(),
  max: z.number().int().optional(),
  maxLength: z.number().int().optional(),
});

/** Extrait le premier tableau ou objet JSON d'une réponse de LLM (balises Markdown ou texte autour tolérés). */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const end = cleaned.lastIndexOf(open === "[" ? "]" : "}");
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

const normalizeLabel = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Entrée de `occasionFieldFormSchema` à partir d'une proposition (tout en chaînes, comme un FormData). */
export function proposalToFormInput(proposal: FieldProposal, occasionId: string, sortOrder: number): Record<string, string> {
  const input: Record<string, string> = {
    occasionId,
    label: proposal.label,
    helpText: proposal.helpText,
    icon: proposal.icon,
    placeholder: proposal.placeholder,
    type: proposal.type,
    optionsText: formatOptionsText(proposal.options),
    display: proposal.config.display ?? "tiles",
    required: String(proposal.required),
    aiHint: proposal.aiHint,
    active: "true",
    sortOrder: String(sortOrder),
  };
  if (proposal.config.maxLength !== undefined) input.maxLength = String(proposal.config.maxLength);
  if (proposal.config.min !== undefined) input.min = String(proposal.config.min);
  if (proposal.config.max !== undefined) input.max = String(proposal.config.max);
  return input;
}

function toProposal(candidate: unknown, occasionId: string): FieldProposal | null {
  const raw = rawProposalSchema.safeParse(candidate);
  if (!raw.success) return null;
  const value = raw.data;
  const input = {
    occasionId,
    label: value.label,
    helpText: value.helpText,
    icon: value.icon,
    placeholder: value.placeholder,
    type: value.type,
    optionsText: formatOptionsText(value.options),
    display: value.display ?? "tiles",
    required: String(value.required),
    aiHint: value.aiHint,
    active: "true",
    sortOrder: "100",
    ...(value.maxLength !== undefined ? { maxLength: String(value.maxLength) } : {}),
    ...(value.min !== undefined ? { min: String(value.min) } : {}),
    ...(value.max !== undefined ? { max: String(value.max) } : {}),
  };
  const parsed = occasionFieldFormSchema.safeParse(input);
  if (!parsed.success) return null;
  return {
    label: parsed.data.label,
    helpText: parsed.data.helpText,
    icon: parsed.data.icon,
    placeholder: parsed.data.placeholder,
    type: parsed.data.type,
    options: parsed.data.options,
    config: parsed.data.config,
    required: parsed.data.required === "true",
    aiHint: parsed.data.aiHint,
  };
}

export function sanitizeFieldProposals(
  rawText: string,
  ctx: { occasionId: string; existingLabels: string[]; room: number },
): FieldProposal[] {
  const json = extractJson(rawText);
  const list = Array.isArray(json)
    ? json
    : json && typeof json === "object" && Array.isArray((json as { fields?: unknown }).fields)
      ? (json as { fields: unknown[] }).fields
      : [];
  const seen = new Set(ctx.existingLabels.map(normalizeLabel));
  const result: FieldProposal[] = [];
  for (const candidate of list) {
    if (result.length >= Math.min(MAX_AI_FIELD_PROPOSALS, ctx.room)) break;
    const proposal = toProposal(candidate, ctx.occasionId);
    if (!proposal) continue;
    const key = normalizeLabel(proposal.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(proposal);
  }
  return result;
}

export function sanitizeSingleProposal(rawText: string, ctx: { occasionId: string }): FieldProposal | null {
  const json = extractJson(rawText);
  return json && typeof json === "object" && !Array.isArray(json) ? toProposal(json, ctx.occasionId) : null;
}

const blockProposalSchema = z.object({
  showRecipient: z.boolean(),
  showSender: z.boolean(),
  titleFieldLabel: z.string().nullable().optional(),
});

export function parseBlockProposal(
  rawText: string,
  fields: Array<{ id: string; label: string }>,
): { showRecipient: boolean; showSender: boolean; titleFieldId: string | null } | null {
  const parsed = blockProposalSchema.safeParse(extractJson(rawText));
  if (!parsed.success) return null;
  const wanted = parsed.data.titleFieldLabel ? normalizeLabel(parsed.data.titleFieldLabel) : "";
  const match = wanted ? fields.find((field) => normalizeLabel(field.label) === wanted) : undefined;
  return {
    showRecipient: parsed.data.showRecipient,
    showSender: parsed.data.showSender,
    titleFieldId: match?.id ?? null,
  };
}
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run tests/occasion-fields-ai-schema.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Appels au fournisseur IA — `lib/ai/occasion-field-suggestions.ts`**

```ts
import "server-only";
import { getLyricsProvider } from "./provider";
import { runProviderTextTask } from "./text-generation";
import { moderateText } from "./moderation";
import { writeAuditLog } from "@/lib/security/audit";
import {
  parseBlockProposal,
  sanitizeFieldProposals,
  sanitizeSingleProposal,
  MAX_AI_FIELD_PROPOSALS,
  type FieldProposal,
} from "@/lib/occasion-fields/ai-schema";

const SYSTEM_INSTRUCTIONS =
  "Tu es l'assistant éditorial de MusikPro, un SaaS qui génère des chansons personnalisées. Tu réponds uniquement par du JSON valide, sans commentaire ni balise Markdown.";

const FIELD_SPEC =
  "Un champ est un objet JSON : {\"label\": libellé français court affiché au client (2 à 80 caractères), \"type\": \"short_text\" | \"long_text\" | \"select\" | \"number\" | \"date\", \"icon\": UN seul emoji, \"placeholder\": exemple court dans le champ (peut être vide), \"helpText\": aide courte (peut être vide), \"options\": [{\"label\": choix français, \"emoji\": un emoji}] (2 à 12 choix, uniquement pour select, sinon []), \"required\": booléen, \"aiHint\": consigne EN ANGLAIS de 200 caractères maximum qui explique au parolier IA comment utiliser la réponse, \"min\": entier et \"max\": entier (uniquement pour number), \"maxLength\": entier (uniquement pour les textes)}. " +
  "Choisis le type le plus adapté : short_text pour un nom ou une courte information, long_text pour une anecdote, select pour un choix fermé (mois, type, humeur…), number pour un âge ou un jour, date pour une date complète. " +
  "Ne propose JAMAIS de champ demandant une donnée sensible : santé, pièce d'identité, numéro de téléphone, adresse, paiement, mot de passe, orientation ou opinion. Les champs doivent aider à personnaliser les paroles de la chanson.";

async function ask(prompt: string, audit: { actorId?: string; action: string; subject: string }) {
  const provider = await getLyricsProvider();
  if (!provider.enabled || !provider.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  const raw = await runProviderTextTask(provider, SYSTEM_INSTRUCTIONS, prompt);
  const verdict = await moderateText(raw.text, audit.subject);
  if (verdict.flagged) {
    await writeAuditLog({
      action: audit.action,
      actorId: audit.actorId,
      metadata: { subject: audit.subject, categories: verdict.categories },
    });
    throw new Error("CONTENT_BLOCKED_RESULT");
  }
  return raw.text;
}

type OccasionContext = { id: string; name: string; description: string };
type ExistingField = { id: string; label: string; type: string };

export async function suggestFieldsForOccasion(
  occasion: OccasionContext,
  existing: ExistingField[],
  room: number,
  actorId?: string,
): Promise<FieldProposal[]> {
  const already = existing.length ? existing.map((field) => `« ${field.label} » (${field.type})`).join(", ") : "aucun";
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Champs déjà configurés : ${already}.\n` +
      `Propose jusqu'à ${Math.min(MAX_AI_FIELD_PROPOSALS, room)} NOUVEAUX champs complémentaires (sans répéter les existants) que le client remplira pour que le parolier personnalise la chanson. ${FIELD_SPEC}\n` +
      "Réponds par un tableau JSON de champs.",
    { actorId, action: "ai.occasion_fields.blocked", subject: `Champs proposés pour l'occasion "${occasion.name}"` },
  );
  return sanitizeFieldProposals(text, {
    occasionId: occasion.id,
    existingLabels: existing.map((field) => field.label),
    room,
  });
}

export async function completeFieldForOccasion(
  occasion: OccasionContext,
  label: string,
  actorId?: string,
): Promise<FieldProposal | null> {
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Le propriétaire veut un champ intitulé « ${label} ». Complète sa définition. ${FIELD_SPEC}\n` +
      "Conserve le libellé fourni (tu peux seulement corriger l'orthographe). Réponds par UN objet JSON.",
    { actorId, action: "ai.occasion_field.blocked", subject: `Champ "${label}" pour l'occasion "${occasion.name}"` },
  );
  return sanitizeSingleProposal(text, { occasionId: occasion.id });
}

export async function suggestBlocksForOccasion(
  occasion: OccasionContext,
  fields: Array<{ id: string; label: string }>,
  actorId?: string,
) {
  const list = fields.length ? fields.map((field) => `« ${field.label} »`).join(", ") : "aucun";
  const text = await ask(
    `Occasion d'une chanson personnalisée : « ${occasion.name} ». Description : « ${occasion.description || "aucune"} ».\n` +
      `Champs configurés : ${list}.\n` +
      "Décide quels blocs fixes du formulaire ont du sens : « showRecipient » (la personne à qui la chanson est destinée : nom, prononciation, lien) et « showSender » (de la part de qui). " +
      "Pour une chanson publicitaire ou sans destinataire, mets-les à false. « titleFieldLabel » est le libellé EXACT d'un champ configuré dont la valeur peut servir de titre quand il n'y a pas de destinataire (ex. nom du produit), sinon null. " +
      "Réponds par un objet JSON : {\"showRecipient\": bool, \"showSender\": bool, \"titleFieldLabel\": string | null}.",
    { actorId, action: "ai.occasion_blocks.blocked", subject: `Blocs proposés pour l'occasion "${occasion.name}"` },
  );
  return parseBlockProposal(text, fields);
}
```

- [ ] **Step 5: Server Actions de suggestion — `app/admin/occasion-fields/ai-actions.ts`**

```ts
"use server";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { occasionFields, occasions } from "@/db/schema";
import { actionErrorMessage } from "@/lib/admin/action-state";
import {
  completeFieldForOccasion,
  suggestBlocksForOccasion,
  suggestFieldsForOccasion,
} from "@/lib/ai/occasion-field-suggestions";
import { requireAdmin } from "@/lib/auth/session";
import type { FieldProposal } from "@/lib/occasion-fields/ai-schema";
import { MAX_ACTIVE_FIELDS_PER_OCCASION } from "@/lib/occasion-fields/types";
import { rateLimit } from "@/lib/security/rate-limit";

type Failure = { ok: false; message: string };

async function loadOccasion(occasionId: string) {
  const database = getServiceDb();
  const [occasion] = await database
    .select({ id: occasions.id, name: occasions.name, description: occasions.description })
    .from(occasions)
    .where(eq(occasions.id, occasionId))
    .limit(1);
  if (!occasion) throw new Error("Occasion introuvable.");
  const fields = await database
    .select({ id: occasionFields.id, label: occasionFields.label, type: occasionFields.type, active: occasionFields.active })
    .from(occasionFields)
    .where(eq(occasionFields.occasionId, occasionId))
    .orderBy(asc(occasionFields.sortOrder));
  return { occasion, fields };
}

function failure(error: unknown, fallback: string): Failure {
  if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED")
    return { ok: false, message: "Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez." };
  if (error instanceof Error && error.message === "CONTENT_BLOCKED_RESULT")
    return { ok: false, message: "La suggestion a été bloquée par la modération. Reformule le nom ou la description." };
  if (error instanceof Error && error.message === "RATE_LIMITED")
    return { ok: false, message: "Trop de suggestions IA. Réessaie dans une heure." };
  return { ok: false, message: actionErrorMessage(error, fallback) };
}

async function guard(userId: string) {
  const limit = await rateLimit(`admin:occasion-fields-ai:${userId}`, 30, 3600);
  if (limit.backend === "unavailable") throw new Error("Le contrôle de débit est indisponible.");
  if (!limit.success) throw new Error("RATE_LIMITED");
}

const occasionIdSchema = z.string().trim().min(1).max(120);

export async function proposeOccasionFields(
  occasionId: string,
): Promise<{ ok: true; proposals: FieldProposal[] } | Failure> {
  const session = await requireAdmin();
  try {
    const id = occasionIdSchema.parse(occasionId);
    await guard(session.user.id);
    const { occasion, fields } = await loadOccasion(id);
    const room = MAX_ACTIVE_FIELDS_PER_OCCASION - fields.filter((field) => field.active).length;
    if (room <= 0) return { ok: false, message: `Cette occasion a déjà ${MAX_ACTIVE_FIELDS_PER_OCCASION} champs actifs.` };
    const proposals = await suggestFieldsForOccasion(occasion, fields, room, session.user.id);
    if (!proposals.length) return { ok: false, message: "L’IA n’a proposé aucun nouveau champ valide. Réessaie." };
    return { ok: true, proposals };
  } catch (error) {
    return failure(error, "Impossible de proposer des champs pour le moment.");
  }
}

export async function completeOccasionField(input: {
  occasionId: string;
  label: string;
}): Promise<{ ok: true; proposal: FieldProposal } | Failure> {
  const session = await requireAdmin();
  try {
    const parsed = z
      .object({ occasionId: occasionIdSchema, label: z.string().trim().min(2).max(80) })
      .parse(input);
    await guard(session.user.id);
    const { occasion } = await loadOccasion(parsed.occasionId);
    const proposal = await completeFieldForOccasion(occasion, parsed.label, session.user.id);
    if (!proposal) return { ok: false, message: "L’IA n’a pas pu compléter ce champ. Reformule le libellé." };
    return { ok: true, proposal };
  } catch (error) {
    return failure(error, "Impossible de compléter ce champ pour le moment.");
  }
}

export async function proposeOccasionBlocks(
  occasionId: string,
): Promise<{ ok: true; showRecipient: boolean; showSender: boolean; titleFieldId: string | null } | Failure> {
  const session = await requireAdmin();
  try {
    const id = occasionIdSchema.parse(occasionId);
    await guard(session.user.id);
    const { occasion, fields } = await loadOccasion(id);
    const proposal = await suggestBlocksForOccasion(
      occasion,
      fields.filter((field) => field.active).map(({ id: fieldId, label }) => ({ id: fieldId, label })),
      session.user.id,
    );
    if (!proposal) return { ok: false, message: "L’IA n’a pas pu proposer de blocs. Réessaie." };
    return { ok: true, ...proposal };
  } catch (error) {
    return failure(error, "Impossible de proposer les blocs pour le moment.");
  }
}
```

(`and` importé mais non utilisé : le retirer si le lint le signale.)

- [ ] **Step 6: `addProposedFields` dans `app/admin/occasion-fields/actions.ts`**

Ajouter les imports `proposalToFormInput` et `type FieldProposal` (`@/lib/occasion-fields/ai-schema`) puis :

```ts
const addProposedSchema = z.object({
  occasionId: z.string().trim().min(1).max(120),
  proposals: z
    .string()
    .max(40000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Propositions invalides." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.record(z.string(), z.unknown())).min(1).max(8)),
});

export async function addProposedFields(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = addProposedSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();
    const [activeRow] = await database
      .select({ total: count() })
      .from(occasionFields)
      .where(and(eq(occasionFields.occasionId, parsed.occasionId), eq(occasionFields.active, true)));
    const room = MAX_ACTIVE_FIELDS_PER_OCCASION - (activeRow?.total ?? 0);
    if (parsed.proposals.length > room)
      throw new Error(`Il reste de la place pour ${Math.max(room, 0)} champ(s) actif(s) seulement.`);
    const [last] = await database
      .select({ sortOrder: occasionFields.sortOrder })
      .from(occasionFields)
      .where(eq(occasionFields.occasionId, parsed.occasionId))
      .orderBy(sql`${occasionFields.sortOrder} desc`)
      .limit(1);
    let order = (last?.sortOrder ?? 0) + 10;
    const created: string[] = [];
    for (const candidate of parsed.proposals) {
      // Revalidation complète côté serveur : le navigateur n'est jamais cru sur parole.
      const row = occasionFieldFormSchema.parse(
        proposalToFormInput(candidate as unknown as FieldProposal, parsed.occasionId, order),
      );
      const id = randomUUID();
      await database.insert(occasionFields).values({
        id,
        occasionId: parsed.occasionId,
        key: await uniqueKey(parsed.occasionId, row.label),
        label: row.label,
        helpText: row.helpText,
        icon: row.icon,
        placeholder: row.placeholder,
        type: row.type,
        options: row.options,
        config: row.config,
        required: row.required === "true",
        aiHint: row.aiHint,
        sortOrder: order,
        active: true,
      });
      created.push(id);
      order += 10;
    }
    await writeAuditLog({
      action: "occasion_field.ai_added",
      actorId: session.user.id,
      targetType: "occasion",
      targetId: parsed.occasionId,
      metadata: { fieldIds: created },
    });
    revalidateOccasionFields(parsed.occasionId);
    return {
      ok: true,
      message: `${created.length} champ(s) ajouté(s). Lance « Actualiser les traductions » pour les traduire.`,
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter les champs proposés.") };
  }
}
```

Compléter `tests/occasion-fields-actions-shape.test.ts` avec : `expect(source).toContain("export async function addProposedFields")` et `expect(source).toContain("occasionFieldFormSchema.parse(")` (revalidation serveur).

- [ ] **Step 7: Panneau IA — `components/admin/AdminOccasionFieldAiPanel.tsx`**

```tsx
"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { addProposedFields } from "@/app/admin/occasion-fields/actions";
import { proposeOccasionFields } from "@/app/admin/occasion-fields/ai-actions";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import Icon from "@/components/banani/Icon";
import type { FieldProposal } from "@/lib/occasion-fields/ai-schema";

const TYPE_LABELS: Record<string, string> = {
  short_text: "Texte court",
  long_text: "Texte long",
  select: "Liste de choix",
  number: "Nombre",
  date: "Date",
};

export default function AdminOccasionFieldAiPanel({ occasionId }: { occasionId: string }) {
  const showToast = useAdminToast();
  const [proposals, setProposals] = useState<FieldProposal[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [loading, startLoad] = useTransition();
  const [state, formAction, adding] = useActionState<AdminActionState, FormData>(addProposedFields, null);
  useAdminActionToast(state);

  useEffect(() => {
    if (state?.ok) {
      setProposals([]);
      setChecked(new Set());
    }
  }, [state]);

  const propose = () =>
    startLoad(async () => {
      const result = await proposeOccasionFields(occasionId);
      if (!result.ok) {
        showToast({ message: result.message, tone: "error" });
        return;
      }
      setProposals(result.proposals);
      setChecked(new Set(result.proposals.map((_, index) => index)));
    });

  const selected = proposals.filter((_, index) => checked.has(index));
  return (
    <section className="admin-panel admin-editor-card">
      <button type="button" className="admin-secondary-action" onClick={propose} disabled={loading}>
        <Icon i="sparkles" size={16} /> {loading ? "L’IA réfléchit…" : "Proposer des champs avec l’IA"}
      </button>
      {proposals.length ? (
        <form action={formAction}>
          <input type="hidden" name="occasionId" value={occasionId} />
          <input type="hidden" name="proposals" value={JSON.stringify(selected)} />
          <ul className="admin-ai-proposals">
            {proposals.map((proposal, index) => (
              <li key={`${proposal.label}-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.has(index)}
                    onChange={() =>
                      setChecked((current) => {
                        const next = new Set(current);
                        if (next.has(index)) next.delete(index);
                        else next.add(index);
                        return next;
                      })
                    }
                  />{" "}
                  <span aria-hidden="true">{proposal.icon || "📝"}</span> <strong>{proposal.label}</strong> —{" "}
                  {TYPE_LABELS[proposal.type]}
                  {proposal.required ? " · obligatoire" : ""}
                  {proposal.options.length ? ` · ${proposal.options.map((option) => `${option.emoji} ${option.label}`).join(", ")}` : ""}
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" className="admin-primary-action" disabled={adding || !selected.length}>
            <Icon i="plus" size={16} /> Ajouter la sélection ({selected.length})
          </button>
        </form>
      ) : null}
    </section>
  );
}
```

Vérifier que `useAdminToast()` renvoie bien `showToast({ message, tone })` (usage identique dans `useAdminActionToast.ts`). Rendre le panneau dans l'onglet « Champs » de `app/admin/occasion-fields/[occasionId]/page.tsx`, au-dessus de la grille : `<AdminOccasionFieldAiPanel occasionId={occasion.id} />`.

- [ ] **Step 8: « Compléter avec l'IA » dans `AdminOccasionFieldForm.tsx`**

Rendre contrôlés les champs que l'IA remplit. Ajouter en haut du composant :

```tsx
const [draft, setDraft] = useState({
  label: field?.label ?? "",
  helpText: field?.helpText ?? "",
  placeholder: field?.placeholder ?? "",
  icon: field?.icon || "📝",
  optionsText: field ? formatOptionsText(field.options) : "",
  display: field?.config.display ?? "tiles",
  required: String(field?.required ?? false),
  aiHint: field?.aiHint ?? "",
  min: field?.config.min !== undefined ? String(field.config.min) : "",
  max: field?.config.max !== undefined ? String(field.config.max) : "",
  maxLength: field?.config.maxLength !== undefined ? String(field.config.maxLength) : "",
});
const showToast = useAdminToast();
const [completing, startComplete] = useTransition();
const patch = (values: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...values }));

const complete = () =>
  startComplete(async () => {
    const result = await completeOccasionField({ occasionId, label: draft.label });
    if (!result.ok) {
      showToast({ message: result.message, tone: "error" });
      return;
    }
    const p = result.proposal;
    setType(p.type);
    patch({
      label: p.label,
      helpText: p.helpText,
      placeholder: p.placeholder,
      icon: p.icon || "📝",
      optionsText: formatOptionsText(p.options),
      display: p.config.display ?? "tiles",
      required: String(p.required),
      aiHint: p.aiHint,
      min: p.config.min !== undefined ? String(p.config.min) : "",
      max: p.config.max !== undefined ? String(p.config.max) : "",
      maxLength: p.config.maxLength !== undefined ? String(p.config.maxLength) : "",
    });
    showToast({ message: "Champ prérempli par l’IA : relis puis enregistre.", tone: "success" });
  });
```

Remplacements dans le JSX : chaque `defaultValue={field?.xxx}` des champs concernés devient `value={draft.xxx}` + `onChange={(event) => patch({ xxx: event.target.value })}` (libellé, aide, exemple, consigne IA, options, min, max, longueur) ; les `AdminSelect` « Obligatoire » et « Affichage » passent à `value={draft.required}` / `value={draft.display}` + `onValueChange={(value) => patch({ required: value })}` / `patch({ display: value as "dropdown" | "tiles" })` ; le sélecteur d'icône est remonté à chaque changement : `<AdminOccasionEmojiPicker key={draft.icon} defaultEmoji={draft.icon} … />`. Ajouter, sous le champ « Libellé », le bouton :

```tsx
<button type="button" className="admin-secondary-action" onClick={complete} disabled={completing || draft.label.trim().length < 2}>
  <Icon i="sparkles" size={15} /> {completing ? "L’IA complète…" : "Compléter avec l’IA"}
</button>
```

Imports à ajouter : `useTransition`, `useAdminToast`, `completeOccasionField` (`@/app/admin/occasion-fields/ai-actions`).

- [ ] **Step 9: « Suggérer avec l'IA » dans `AdminOccasionBlocksForm.tsx`**

Passer les trois `AdminSelect` en contrôlés (`useState` initialisé avec les valeurs reçues, `value` + `onValueChange`) et ajouter :

```tsx
const showToast = useAdminToast();
const [suggesting, startSuggest] = useTransition();
const suggest = () =>
  startSuggest(async () => {
    const result = await proposeOccasionBlocks(occasionId);
    if (!result.ok) {
      showToast({ message: result.message, tone: "error" });
      return;
    }
    setRecipient(String(result.showRecipient));
    setSender(String(result.showSender));
    setTitleField(result.titleFieldId ?? "");
    showToast({ message: "Blocs suggérés par l’IA : relis puis enregistre.", tone: "success" });
  });
```

avec un bouton `Suggérer avec l’IA` (`type="button"`, icône `sparkles`) à côté de « Enregistrer les blocs ».

- [ ] **Step 10: Vérifier**

Run: `npx vitest run tests/occasion-fields-ai-schema.test.ts tests/occasion-fields-actions-shape.test.ts && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 11: Vérification dans le navigateur (admin, fournisseur IA configuré)**

1. Occasion « Anniversaire » : « Proposer des champs avec l'IA » → liste de propositions sans doublon avec les champs existants → décocher une ligne → « Ajouter la sélection » → toast vert, champs créés et visibles.
2. Formulaire d'un nouveau champ : taper « Prénom de la mère », « Compléter avec l'IA » → type, icône, exemple, consigne anglaise préremplis, rien enregistré avant « Créer le champ ».
3. « Spot publicitaire » → onglet Blocs → « Suggérer avec l'IA » → les deux blocs à « masqué », titre = « Nom du produit… ».
4. Sans fournisseur IA configuré (désactiver temporairement sur `development`) : toast rouge « Aucun fournisseur IA n'est configuré… ».
5. Plus de 30 clics en une heure : toast « Trop de suggestions IA ».

- [ ] **Step 12: Commit**

```bash
git add lib/occasion-fields/ai-schema.ts lib/ai/occasion-field-suggestions.ts app/admin/occasion-fields components/admin tests/occasion-fields-ai-schema.test.ts tests/occasion-fields-actions-shape.test.ts
git commit -m "feat(admin): assistant IA pour proposer, compléter et configurer les champs par occasion

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Parcours client — étape « Personnalise ta chanson »

**Files:**
- Create: `components/banani/OccasionFieldsSection.tsx`, `lib/occasion-fields/client.ts`
- Modify: `components/banani/DemoProvider.tsx`, `app/dashboard/layout.tsx`, `components/banani/StepRecipient.tsx`, `components/banani/StepAdditionalParams.tsx`, `app/dashboard/banani.css`, `lib/i18n/locales/{en,es,pt}.json` (générés)
- Test: `tests/occasion-fields-client.test.ts`

**Interfaces:**
- Consumes: Task 1 (`validateOccasionAnswers`, `buildOccasionDetails`, types), Task 3 (`getActiveOccasionFields`, `OccasionOption.showRecipient/showSender/titleFieldId`).
- Produces (dans `lib/occasion-fields/client.ts`, pur) :
  - `blockVisibility(occasion: { showRecipient?: boolean; showSender?: boolean } | undefined): { showRecipient: boolean; showSender: boolean }` (défaut `true`/`true`).
  - `clearHiddenBlockValues(visibility, current): { fields: Record<string,string>; choices: Record<string,string> }` — vide `recipientName`, `recipientPronunciation`, `recipientRelation` / `senderName`, `senderPronunciation` quand leur bloc est masqué.
  - `answerErrorCode`→texte traduit : `answerErrorText(code: AnswerErrorCode): string` (appels `t("…")` littéraux).
  - Contexte `useDemo()` gagne : `occasionFields: OccasionFieldClientDefinition[]` (champs de l'occasion courante), `details: Record<string,string>`, `setDetail(fieldId: string, value: string): void`, `occasionBlocks: { showRecipient: boolean; showSender: boolean }`.

- [ ] **Step 1: Tests de la logique pure (échouent)**

Créer `tests/occasion-fields-client.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { blockVisibility, clearHiddenBlockValues } from "@/lib/occasion-fields/client";

describe("blockVisibility", () => {
  it("defaults to showing both blocks (occasions without configuration are unchanged)", () => {
    expect(blockVisibility(undefined)).toEqual({ showRecipient: true, showSender: true });
    expect(blockVisibility({})).toEqual({ showRecipient: true, showSender: true });
  });
  it("honours the occasion settings", () => {
    expect(blockVisibility({ showRecipient: false, showSender: false })).toEqual({
      showRecipient: false,
      showSender: false,
    });
  });
});

describe("clearHiddenBlockValues", () => {
  const current = {
    fields: {
      recipientName: "Awa",
      recipientPronunciation: "A-wa",
      senderName: "Moussa",
      senderPronunciation: "Mou-ssa",
      story: "histoire",
    },
    choices: { recipientRelation: "Ma mère", genre: "Afrobeat" },
  };

  it("clears recipient and sender leftovers when their blocks are hidden, and nothing else", () => {
    const result = clearHiddenBlockValues({ showRecipient: false, showSender: false }, current);
    expect(result.fields).toMatchObject({
      recipientName: "",
      recipientPronunciation: "",
      senderName: "",
      senderPronunciation: "",
      story: "histoire",
    });
    expect(result.choices).toMatchObject({ recipientRelation: "", genre: "Afrobeat" });
  });

  it("keeps everything when both blocks are visible", () => {
    expect(clearHiddenBlockValues({ showRecipient: true, showSender: true }, current)).toEqual(current);
  });
});
```

Run: `npx vitest run tests/occasion-fields-client.test.ts` → FAIL.

- [ ] **Step 2: Implémenter `lib/occasion-fields/client.ts`**

```ts
import { translate as t } from "@/lib/i18n/translate";
import type { AnswerErrorCode } from "./answers";

export type BlockVisibility = { showRecipient: boolean; showSender: boolean };

export function blockVisibility(
  occasion: { showRecipient?: boolean; showSender?: boolean } | undefined,
): BlockVisibility {
  return { showRecipient: occasion?.showRecipient ?? true, showSender: occasion?.showSender ?? true };
}

/** Évite d'envoyer à la génération un nom saisi pour une occasion précédente dont le bloc est maintenant masqué. */
export function clearHiddenBlockValues(
  visibility: BlockVisibility,
  current: { fields: Record<string, string>; choices: Record<string, string> },
): { fields: Record<string, string>; choices: Record<string, string> } {
  const fields = { ...current.fields };
  const choices = { ...current.choices };
  if (!visibility.showRecipient) {
    fields.recipientName = "";
    fields.recipientPronunciation = "";
    choices.recipientRelation = "";
  }
  if (!visibility.showSender) {
    fields.senderName = "";
    fields.senderPronunciation = "";
  }
  return { fields, choices };
}

/** Appels `t("…")` littéraux : le scanner i18n:sync ne voit pas `t(variable)`. */
export function answerErrorText(code: AnswerErrorCode): string {
  switch (code) {
    case "required":
      return t("Ce champ est obligatoire.");
    case "option":
      return t("Choisis une option proposée.");
    case "number":
      return t("Entre un nombre entier valide.");
    case "range":
      return t("La valeur est hors des limites autorisées.");
    case "date":
      return t("Entre une date valide.");
    case "length":
      return t("Le texte est trop long.");
    case "duplicate":
      return t("Une réponse est en double.");
    case "unknown":
      return t("Un champ ne correspond plus à cette occasion. Recharge la page.");
  }
}
```

Run: `npx vitest run tests/occasion-fields-client.test.ts` → PASS.

- [ ] **Step 3: Charger les champs dans `app/dashboard/layout.tsx`**

Lire le fichier. Ajouter `import { getActiveOccasionFields } from "@/lib/occasion-fields/server";`, ajouter `getActiveOccasionFields({ demo })` au `Promise.all` existant (l. ~80, à côté de `getActiveOccasions({ demo })`) dans une variable `occasionFieldsByOccasion`, et passer au provider `initialOccasionFields={occasionFieldsByOccasion}` (juste après `initialRecipientRelations`).

- [ ] **Step 4: État `details` dans `DemoProvider.tsx`**

1. Import : `import type { OccasionFieldClientDefinition } from "@/lib/occasion-fields/types";`, `import { blockVisibility } from "@/lib/occasion-fields/client";`, `import { buildOccasionDetails } from "@/lib/occasion-fields/answers";`.
2. `useDemoState` : ajouter, après `initialRecipientRelations: RecipientRelationOption[],`, le paramètre `initialOccasionFields: Record<string, OccasionFieldClientDefinition[]>,` ; mettre à jour **tous les appels** (`useDemoState(...)` dans `DemoProvider`, en passant `initialOccasionFields` à la même position) et la signature/props de `DemoProvider` (`initialOccasionFields = {}` avec le type `Record<string, OccasionFieldClientDefinition[]>`).
3. Dans `useDemoState`, après `const [choices, setChoices] = …` :

```ts
  const [details, setDetails] = useState<Record<string, string>>({});
  const currentOccasion = initialOccasions.find((occasion) => occasion.name === choices.occasion);
  const occasionFields = currentOccasion ? (initialOccasionFields[currentOccasion.id] ?? []) : [];
  const occasionBlocks = blockVisibility(currentOccasion);
  const setDetail = (fieldId: string, value: string) => setDetails((prev) => ({ ...prev, [fieldId]: value }));
```

4. Dans `choose`, au début (avant `const nextChoices`) : réponses de l'occasion précédente effacées au changement d'occasion :

```ts
    if (key === "occasion" && value !== choices.occasion) setDetails({});
```

5. Ajouter `occasionFields`, `details`, `setDetail`, `occasionBlocks` à l'objet retourné (à côté de `recipientRelations,` l. ~842).
6. Dans `generateLyrics` (objet `input`), après `additionalDetails: fields.detail,` :

```ts
            occasionDetails: buildOccasionDetails(occasionFields, details),
```

7. Dans `startRealGeneration` (corps JSON), après `lyrics: fields.lyrics,` :

```ts
          occasionDetails: buildOccasionDetails(occasionFields, details),
```

- [ ] **Step 5: Composant `OccasionFieldsSection.tsx`**

```tsx
"use client";

import { useDemo } from "./DemoProvider";
import { InlineNotice } from "@/components/ui/inline-notice";
import MusikSelect from "./MusikSelect";
import { answerErrorText } from "@/lib/occasion-fields/client";
import type { AnswerErrorCode } from "@/lib/occasion-fields/answers";
import { localizeField } from "@/lib/i18n/translate";
import type { OccasionFieldClientDefinition } from "@/lib/occasion-fields/types";

function FieldLabel({ field, htmlFor }: { field: OccasionFieldClientDefinition; htmlFor?: string }) {
  const label = localizeField(field.label, field.translations, "label");
  const help = field.helpText ? localizeField(field.helpText, field.translations, "helpText") : "";
  return (
    <div className="occasion-field-heading">
      {field.icon ? <span aria-hidden="true">{field.icon}</span> : null}
      <label id={htmlFor ? undefined : `${field.id}-label`} htmlFor={htmlFor}>
        {label}
      </label>
      {help ? <small>{help}</small> : null}
    </div>
  );
}

export default function OccasionFieldsSection({
  errors,
  onChange,
}: {
  errors: Record<string, AnswerErrorCode>;
  onChange: (fieldId: string) => void;
}) {
  const demo = useDemo();
  if (!demo.occasionFields.length) return null;
  return (
    <div className="occasion-fields">
      {demo.occasionFields.map((field) => {
        const value = demo.details[field.id] ?? "";
        const error = errors[field.id];
        const set = (next: string) => {
          demo.setDetail(field.id, next);
          onChange(field.id);
        };
        const placeholder = field.placeholder ? localizeField(field.placeholder, field.translations, "placeholder") : undefined;
        const inputId = `occasion-field-${field.id}`;
        return (
          <section key={field.id} className="occasion-field story-recipient-card recipient-page-card">
            <FieldLabel field={field} htmlFor={field.type === "select" ? undefined : inputId} />
            {field.type === "short_text" ? (
              <input id={inputId} type="text" value={value} maxLength={field.config.maxLength ?? 100} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "long_text" ? (
              <textarea id={inputId} rows={3} value={value} maxLength={field.config.maxLength ?? 300} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "number" ? (
              <input id={inputId} type="number" inputMode="numeric" step={1} min={field.config.min} max={field.config.max} value={value} placeholder={placeholder} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "date" ? (
              <input id={inputId} type="date" value={value} aria-invalid={Boolean(error)} onChange={(event) => set(event.target.value)} />
            ) : null}
            {field.type === "select" && field.config.display === "dropdown" ? (
              <MusikSelect
                ariaLabel={localizeField(field.label, field.translations, "label")}
                placeholder={placeholder ?? ""}
                value={value}
                portal
                ariaInvalid={Boolean(error)}
                onChange={set}
                options={field.options.map((option, index) => ({
                  value: option.label,
                  label: localizeField(option.label, field.translations, `option${index}`),
                }))}
              />
            ) : null}
            {field.type === "select" && field.config.display !== "dropdown" ? (
              <div className="occasion-field-tiles" role="radiogroup" aria-labelledby={`${field.id}-label`}>
                {field.options.map((option, index) => (
                  <button
                    key={option.label}
                    type="button"
                    role="radio"
                    aria-checked={value === option.label}
                    className={`occasion-field-tile${value === option.label ? " is-selected" : ""}`}
                    onClick={() => set(value === option.label ? "" : option.label)}
                  >
                    <span aria-hidden="true">{option.emoji}</span>
                    {localizeField(option.label, field.translations, `option${index}`)}
                  </button>
                ))}
              </div>
            ) : null}
            {error ? (
              <InlineNotice tone="error" className="field-notice">
                {answerErrorText(error)}
              </InlineNotice>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
```

> Vérifier les props réellement acceptées par `MusikSelect` (`ariaLabel`, `placeholder`, `value`, `onChange`, `options`, `portal`, `ariaInvalid`, `icon` optionnel) en lisant `components/banani/MusikSelect.tsx` avant de figer ce JSX, et ajuster si une prop est obligatoire.

- [ ] **Step 6: Adapter `StepRecipient.tsx`**

1. Imports : `import OccasionFieldsSection from "./OccasionFieldsSection";`, `import { validateOccasionAnswers, type AnswerErrorCode } from "@/lib/occasion-fields/answers";`, `import { buildOccasionDetails } from "@/lib/occasion-fields/answers";`, `import { clearHiddenBlockValues } from "@/lib/occasion-fields/client";`.
2. État : `const [detailErrors, setDetailErrors] = useState<Record<string, AnswerErrorCode>>({});` ; l'effet qui efface `fieldErrors` après 4,2 s efface aussi `detailErrors` (même `setTimeout`).
3. Remplacer `continueToStyle` : valider le destinataire seulement si `demo.occasionBlocks.showRecipient`, l'expéditeur seulement si `showSender`, et les champs dynamiques avec `validateOccasionAnswers(demo.occasionFields, buildOccasionDetails(demo.occasionFields, demo.details))` :

```tsx
  const continueToStyle = () => {
    const { showRecipient, showSender } = demo.occasionBlocks;
    const parsedRecipient = showRecipient
      ? demoRecipientSchema.safeParse({
          name: demo.fields.recipientName,
          pronunciation: demo.fields.recipientPronunciation,
          relation: demo.choices.recipientRelation,
        })
      : null;
    const parsedSender = showSender
      ? demoSenderSchema.safeParse({
          name: demo.fields.senderName,
          pronunciation: demo.fields.senderPronunciation,
        })
      : null;
    const details = validateOccasionAnswers(
      demo.occasionFields,
      buildOccasionDetails(demo.occasionFields, demo.details),
    );
    const recipientFailed = parsedRecipient !== null && !parsedRecipient.success;
    const senderFailed = parsedSender !== null && !parsedSender.success;
    if (recipientFailed || senderFailed || !details.ok) {
      const nextErrors: Partial<Record<RecipientField | SenderField, string>> = {};
      for (const issue of recipientFailed ? parsedRecipient.error.issues : []) {
        const field = issue.path[0];
        if ((field === "name" || field === "pronunciation" || field === "relation") && !nextErrors[field]) {
          nextErrors[field] = issue.message;
        }
      }
      for (const issue of senderFailed ? parsedSender.error.issues : []) {
        const field = issue.path[0] === "name" ? "senderName" : issue.path[0] === "pronunciation" ? "senderPronunciation" : undefined;
        if (field && !nextErrors[field]) nextErrors[field] = issue.message;
      }
      setFieldErrors(nextErrors);
      setDetailErrors(details.ok ? {} : details.errors);
      return;
    }
    setFieldErrors({});
    setDetailErrors({});
    // Un bloc masqué ne doit rien envoyer à la génération, même avec une saisie héritée d'une autre occasion.
    const cleared = clearHiddenBlockValues(demo.occasionBlocks, { fields: demo.fields, choices: demo.choices });
    if (!showRecipient) {
      demo.field("recipientName", cleared.fields.recipientName);
      demo.field("recipientPronunciation", cleared.fields.recipientPronunciation);
      demo.choose("recipientRelation", cleared.choices.recipientRelation);
    } else if (parsedRecipient?.success) {
      demo.field("recipientName", parsedRecipient.data.name);
      demo.field("recipientPronunciation", parsedRecipient.data.pronunciation);
      demo.choose("recipientRelation", parsedRecipient.data.relation);
    }
    if (!showSender) {
      demo.field("senderName", cleared.fields.senderName);
      demo.field("senderPronunciation", cleared.fields.senderPronunciation);
    } else if (parsedSender?.success) {
      demo.field("senderName", parsedSender.data.name);
      demo.field("senderPronunciation", parsedSender.data.pronunciation);
    }
    demo.go("/dashboard/create/style");
  };
```

4. Titre et sous-titre : `t("Personnalise ta chanson")` et `t("Quelques détails pour que ce soit vraiment la tienne")` (remplacent « À qui est destinée la chanson ? » et le paragraphe actuel) ; mettre à jour `export const displayName` en `"Étape 3 — Personnalisation de la chanson"`.
5. Envelopper la `<section … aria-labelledby="recipient-form-title">` (« La personne concernée ») dans `{demo.occasionBlocks.showRecipient ? ( … ) : null}` et la `<section … aria-labelledby="sender-form-title">` dans `{demo.occasionBlocks.showSender ? ( … ) : null}` ; ajouter après elles, dans `recipient-form-shell` : 

```tsx
        <OccasionFieldsSection
          errors={detailErrors}
          onChange={(fieldId) =>
            setDetailErrors((current) => {
              if (!current[fieldId]) return current;
              const next = { ...current };
              delete next[fieldId];
              return next;
            })
          }
        />
```

6. Masquer la section « Pourquoi remplir cette partie ? » (`recipient-tips`) quand les deux blocs sont masqués (elle parle de prononciation) : `{demo.occasionBlocks.showRecipient || demo.occasionBlocks.showSender ? (<section …/>) : null}`.
7. Les effets de prononciation IA existants ne s'exécutent que si le nom est non vide ; avec le bloc masqué et les valeurs vidées, ils ne font rien.

- [ ] **Step 7: Renommer l'étape 5**

Dans `components/banani/StepAdditionalParams.tsx`, remplacer `{t("Paramètres additionnels")}` par `{t("Langue et voix")}` (l. 49) et le sous-titre `{t("Affine ta chanson avec plus d'options")}` par `{t("Choisis la langue des paroles et la voix du chanteur")}`. Mettre à jour son `displayName` s'il cite l'ancien titre.

- [ ] **Step 8: Styles**

Dans `app/dashboard/banani.css`, ajouter (à côté des règles `.recipient-page-card`) :

```css
.occasion-fields {
  display: grid;
  gap: 14px;
}
.occasion-field-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-weight: 700;
}
.occasion-field-heading small {
  flex-basis: 100%;
  font-weight: 400;
  color: var(--muted-foreground);
}
.occasion-field :is(input, textarea) {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card);
  font: inherit;
}
.occasion-field-tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.occasion-field-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 6px;
  border: 2px solid var(--border);
  border-radius: 16px;
  background: var(--card);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}
.occasion-field-tile > span {
  font-size: 1.4rem;
}
.occasion-field-tile.is-selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, var(--card));
}
```

Vérifier que les variables (`--border`, `--card`, `--primary`, `--muted-foreground`) existent dans la feuille ; sinon reprendre celles utilisées par `.story-recipient-card`.

- [ ] **Step 9: i18n**

```bash
npx tsx --env-file=.env.local scripts/i18n-sync.mts
npm run i18n:check
```

Expected : les nouvelles clés (« Personnalise ta chanson », « Quelques détails pour que ce soit vraiment la tienne », « Langue et voix », « Choisis la langue des paroles et la voix du chanteur », messages d'erreur) sont ajoutées à `lib/i18n/locales/{en,es,pt}.json` ; `i18n:check` passe. Lire le diff des `.json` : aucune traduction écrite à la main.

- [ ] **Step 10: Vérifier**

Run: `npx vitest run tests/occasion-fields-client.test.ts && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 11: Vérification dans le navigateur (client)**

`npm run dev`, parcours réel : (a) « Anniversaire » → étape 3 « Personnalise ta chanson » avec blocs + jour (nombre, « Ex: 15 ») + mois en tuiles (3 colonnes) ; (b) « Spot publicitaire » → ni « La personne concernée » ni « De la part de qui », « Nom du produit » obligatoire (erreur si vide) ; (c) saisir un nom en Anniversaire, revenir, choisir « Spot publicitaire », continuer → vérifier dans l'onglet réseau que `recipientName` est vide et qu'aucune réponse d'Anniversaire n'est envoyée ; (d) changer de langue → libellés traduits après « Actualiser les traductions ».

- [ ] **Step 12: Commit**

```bash
git add components/banani app/dashboard lib/occasion-fields/client.ts lib/i18n/locales tests/occasion-fields-client.test.ts
git commit -m "feat(create): étape Personnalise ta chanson avec blocs conditionnels et champs dynamiques

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Génération — prompt des paroles, titre et `requestPayload`

**Files:**
- Modify: `lib/validation/ai.ts`, `lib/ai/lyrics.ts`, `app/api/ai/generate/route.ts`, `app/api/songs/generate/route.ts`, `lib/ai/songs.ts`, `lib/ai/music-jobs.ts`
- Test: `tests/lyrics-occasion-details.test.ts`, mise à jour éventuelle de `tests/lyrics-unknown-words-rule.test.ts` (aucun changement attendu : `promptFor(task)` reste valide)

**Interfaces:**
- Consumes: Task 1 (`occasionAnswersSchema`, `formatAnswersForPrompt`, `ANSWER_ERROR_MESSAGES`), Task 3 (`resolveOccasionDetails`, `OccasionDetailsError`).
- Produces: `promptFor(task, details: ResolvedAnswer[] = [])`, `runLyricsTask(task, actorId?, details: ResolvedAnswer[] = [])`, `lyricsContextSchema.occasionDetails`, `songGenerateRequestSchema.occasionDetails`, `MusicJobGroupContext.occasionDetails?: Array<{ fieldId: string; label: string; value: string }>`.

- [ ] **Step 1: Tests (échouent)**

Créer `tests/lyrics-occasion-details.test.ts` :

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/provider", () => ({ getLyricsProvider: vi.fn() }));
vi.mock("@/lib/ai/text-generation", () => ({ runProviderTextTask: vi.fn() }));
vi.mock("@/lib/ai/moderation", () => ({ moderateText: vi.fn() }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLog: vi.fn() }));

import { promptFor } from "@/lib/ai/lyrics";
import { aiLyricsTaskSchema, songGenerateRequestSchema } from "@/lib/validation/ai";
import type { ResolvedAnswer } from "@/lib/occasion-fields/types";

const input = {
  occasion: "Spot publicitaire",
  story: "Un café qui réveille Abidjan.",
  genre: "Afrobeat",
  language: "Français",
  voice: "Femme",
};

const answers: ResolvedAnswer[] = [
  { fieldId: "p", key: "product_name", label: "Nom du produit", type: "short_text", value: "Café Soleil", aiHint: "Repeat it in the chorus." },
];

describe("occasionDetails in schemas", () => {
  it("defaults to an empty list (existing clients keep working)", () => {
    const parsed = aiLyricsTaskSchema.parse({ task: "lyrics.generate", input });
    expect(parsed.input.occasionDetails).toEqual([]);
    expect(songGenerateRequestSchema.parse({ occasion: "x", genre: "y", lyrics: "z" }).occasionDetails).toEqual([]);
  });

  it("rejects more than 8 answers and over-long values", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ fieldId: `f${i}`, value: "x" }));
    expect(aiLyricsTaskSchema.safeParse({ task: "lyrics.generate", input: { ...input, occasionDetails: many } }).success).toBe(false);
    expect(
      aiLyricsTaskSchema.safeParse({
        task: "lyrics.generate",
        input: { ...input, occasionDetails: [{ fieldId: "f", value: "x".repeat(601) }] },
      }).success,
    ).toBe(false);
  });
});

describe("promptFor with occasion details", () => {
  const task = aiLyricsTaskSchema.parse({ task: "lyrics.generate", input });

  it("adds the personalised block with the AI hint", () => {
    const prompt = promptFor(task, answers);
    expect(prompt).toContain("Informations personnalisées:");
    expect(prompt).toContain("- Nom du produit : Café Soleil (consigne : Repeat it in the chorus.)");
  });

  it("is unchanged without details", () => {
    expect(promptFor(task)).not.toContain("Informations personnalisées");
    expect(promptFor(task, [])).toBe(promptFor(task));
  });

  it("applies to extend and rewrite tasks too", () => {
    const extend = aiLyricsTaskSchema.parse({
      task: "lyrics.extend",
      input: { ...input, lyrics: "Premier couplet de la chanson qui continue ici." },
    });
    expect(promptFor(extend, answers)).toContain("Café Soleil");
  });
});
```

Run: `npx vitest run tests/lyrics-occasion-details.test.ts` → FAIL.

- [ ] **Step 2: Schémas Zod**

Dans `lib/validation/ai.ts`, importer `occasionAnswersSchema` depuis `@/lib/occasion-fields/answers`. Dans `lyricsContextSchema`, ajouter après `additionalDetails` :

```ts
  occasionDetails: occasionAnswersSchema,
```

Dans `songGenerateRequestSchema`, ajouter après `lyrics` :

```ts
  occasionDetails: occasionAnswersSchema,
```

- [ ] **Step 3: `promptFor` et `runLyricsTask`**

Dans `lib/ai/lyrics.ts` : importer `formatAnswersForPrompt` (`@/lib/occasion-fields/answers`) et le type `ResolvedAnswer` ; changer la signature `export function promptFor(task: AiLyricsTask, details: ResolvedAnswer[] = [])` ; construire le bloc :

```ts
  const personalised = formatAnswersForPrompt(details);
  const context = [
    /* …lignes existantes inchangées… */
    `Détails supplémentaires: ${input.additionalDetails || "aucun"}`,
    ...(personalised ? [personalised] : []),
  ].join("\n");
```

Dans le prompt de génération (dernier `return`), compléter la phrase d'obligation : remplacer `…à la voix et au souvenir.` par `…à la voix et au souvenir, et utilise les informations personnalisées éventuelles en suivant leur consigne.`.

`runLyricsTask(task, actorId?, details: ResolvedAnswer[] = [])` : inclure les valeurs dans la modération (`const requestText = [task.input.story, task.input.additionalDetails, task.input.recipientName, task.input.senderName, ...details.map((answer) => answer.value)]`) et appeler `promptFor(task, details)`.

- [ ] **Step 4: Route `/api/ai/generate`**

Importer `resolveOccasionDetails`, `OccasionDetailsError` (`@/lib/occasion-fields/server`) et `ANSWER_ERROR_MESSAGES`. Après la validation `parsed`, avant `runLyricsTask` :

```ts
  let details: Awaited<ReturnType<typeof resolveOccasionDetails>>["answers"] = [];
  try {
    details = (await resolveOccasionDetails(parsed.data.input.occasion, parsed.data.input.occasionDetails)).answers;
  } catch (error) {
    if (error instanceof OccasionDetailsError) {
      const first = Object.values(error.errors)[0];
      return NextResponse.json(
        {
          error: `Certaines informations personnalisées sont invalides (${ANSWER_ERROR_MESSAGES[first]}). Vérifie l’étape « Personnalise ta chanson ».`,
          code: "OCCASION_DETAILS_INVALID",
          fields: error.errors,
        },
        { status: 422 },
      );
    }
    throw error;
  }
```

Puis `runLyricsTask(parsed.data, session.user.id, details)`. (L'appel `resolveOccasionDetails` est dans le premier `try` ? Non : il précède le `try` existant ; une erreur inattendue de base remonte en 500, comme les autres routes.)

- [ ] **Step 5: Route `/api/songs/generate`, titre et `requestPayload`**

Dans `app/api/songs/generate/route.ts`, après `const input = parsed.data;` (et avant la déduction des crédits, pour ne pas débiter une génération refusée) :

```ts
  let occasionDetails: Awaited<ReturnType<typeof resolveOccasionDetails>>;
  try {
    occasionDetails = await resolveOccasionDetails(input.occasion, input.occasionDetails);
  } catch (error) {
    if (error instanceof OccasionDetailsError) {
      return NextResponse.json(
        { error: "Certaines informations personnalisées sont invalides.", code: "OCCASION_DETAILS_INVALID", fields: error.errors },
        { status: 422 },
      );
    }
    throw error;
  }
```

Remplacer la construction du titre par :

```ts
  const title = buildSongTitle({
    recipientName: input.recipientName || occasionDetails.titleValue,
    occasion: input.occasion,
    genre: input.genre,
  });
```

Ajouter à l'appel `submitSongGeneration(…)` (objet `input`) :

```ts
        occasionDetails: occasionDetails.answers.map(({ fieldId, label, value }) => ({ fieldId, label, value })),
```

(imports : `resolveOccasionDetails`, `OccasionDetailsError`.)

Dans `lib/ai/songs.ts` : ajouter `occasionDetails?: Array<{ fieldId: string; label: string; value: string }>;` au type de l'argument `input` de `submitSongGeneration` et passer `occasionDetails: input.occasionDetails` dans le 4ᵉ argument (contexte) de `createMusicJob`.

Dans `lib/ai/music-jobs.ts` : ajouter `occasionDetails?: Array<{ fieldId: string; label: string; value: string }>;` à `MusicJobGroupContext`, et remplacer `requestPayload: input,` par :

```ts
      requestPayload: context.occasionDetails?.length ? { ...input, occasionDetails: context.occasionDetails } : input,
```

- [ ] **Step 6: Vérifier**

Run: `npx vitest run tests/lyrics-occasion-details.test.ts tests/lyrics-unknown-words-rule.test.ts tests/ai-lyrics-validation.test.ts && npm run typecheck && npm run lint`
Expected: PASS (les tests existants restent verts : `occasionDetails` vaut `[]` par défaut).

- [ ] **Step 7: Vérification bout en bout**

`npm run dev`, parcours Anniversaire jusqu'aux paroles : vérifier dans les logs/réseau que `/api/ai/generate` reçoit `occasionDetails` et que les paroles évoquent le mois/la passion. Tester côté API (curl avec session) : `fieldId` d'une autre occasion → 422 `OCCASION_DETAILS_INVALID` ; champ `required` du spot absent → 422 ; mois « Smarch » → 422. Générer une chanson du spot publicitaire : titre « Café Soleil — Spot publicitaire — … ». Vérifier `music_generation_jobs.request_payload` contient `occasionDetails`.

- [ ] **Step 8: Commit**

```bash
git add lib/validation/ai.ts lib/ai app/api/ai/generate app/api/songs/generate tests/lyrics-occasion-details.test.ts
git commit -m "feat(ai): réponses de personnalisation dans le prompt des paroles, le titre et requestPayload

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Vérifications du kit, traductions et préparation du déploiement

**Files:** aucun nouveau fichier (corrections éventuelles issues des contrôles).

- [ ] **Step 1: Contrôles complets**

```bash
npm run typecheck && npm run lint && npm run test
npm run i18n:check
npm run kit:integrity
npm run kit:audit
npm run validation:zod-check
```

Expected: tous verts. Corriger toute régression avant de continuer (ne pas ignorer un test existant qui échoue : le comprendre).

- [ ] **Step 2: Audit de sécurité**

Lancer `/security-saas`. Points à confirmer : `ai_hint` absent de toute réponse destinée au navigateur (`grep -rn "aiHint" app/dashboard components/banani` ne doit montrer aucune lecture côté client), routes admin sous `requireAdmin`, entrées Zod.

- [ ] **Step 3: Test navigateur complet (Computer Use / Playwright)**

Rejouer les parcours des Task 4 (admin) et 5 (client) sur mobile (largeur 390 px) : tuiles sur 3 colonnes, aucun débordement horizontal, bouton « Continuer » visible, erreurs sous les champs, 4 langues (FR/EN/ES/PT) après « Actualiser les traductions » dans `/admin/languages`. Si un test réel réussit : `npm run computer-use:claude:mark -- --status=verified --evidence="…"`.

- [ ] **Step 4: Traductions du catalogue (développement)**

Dans `/admin/languages`, cliquer « Actualiser les traductions » ; vérifier qu'un champ (« Mois de naissance ») et ses options ont `translations.en/es/pt` (`SELECT label, translations FROM occasion_fields LIMIT 3;` sur `development`).

- [ ] **Step 5: Préparation du déploiement (sans l'exécuter)**

1. Relire en lecture seule la base **production** (`br-orange-river-b487b3h2`) : `SELECT id, name, slug FROM occasions;` pour confirmer que les slugs du seed correspondent (Task 2, Step 1).
2. Comparer les migrations récentes avec la production (colonnes de `occasions`, présence de `occasion_fields`) et **prévenir l'utilisateur** : la migration 0062 doit être appliquée à la production **avant** le déploiement, uniquement après son « applique » explicite, en SQL idempotent via `run_sql` avec `branch_id` explicite.
3. Résumer à l'utilisateur : ce qui est livré, ce qui a été vérifié (sorties de commandes), et les actions de production restantes (migration, `Actualiser les traductions` en production, `npm run deploy:production:check`).

- [ ] **Step 6: Finaliser**

Invoquer `superpowers:finishing-a-development-branch` pour décider de l'intégration (PR vers `main`).

---

## Self-Review

**Couverture de la spec :**
- §3 modèle de données (table, colonnes, migration idempotente, grants, seed, slugs manquants) → Task 2. Champs par défaut + maquette (jour = nombre « Ex: 15 », mois = tuiles emoji, `icon`, `placeholder`, `options{label,emoji}`, `display`) → Task 2 (SQL) + Task 1 (types/schéma) + Task 5 (rendu).
- §4 admin (menu, `AdminTabs`, blocs intégrés, champs triables, dupliquer, toasts, Zod, plafond de 8, traductions) → Task 4.
- §5 parcours client (titres, blocs conditionnels, champs dynamiques, état effacé au changement d'occasion, schéma partagé) → Task 5 (+ Task 1).
- §6 génération (`occasionDetails`, revalidation serveur, `promptFor`, `requestPayload`, titre sans destinataire, pas dans le prompt musical) → Task 6.
- §7 sécurité/compatibilité/vérifications → Task 7 et contraintes globales. §8 points ouverts (slugs réels ; doublons avec « Raconte ton histoire » / « Souvenir spécial ») : slugs → Task 2 Step 1 et Task 7 Step 5 ; doublons → à arbitrer par l'utilisateur lors de la revue visuelle de la Task 5 Step 11 (les champs restent éditables depuis l'admin).
- Hors périmètre respecté : la relation reste un `MusikSelect`.

**Placeholders :** aucun « TBD ». Deux étapes demandent de lire un fichier avant d'ajuster (`AdminOccasionEmojiPicker` nom de l'input ; props de `MusikSelect`) car leur JSX complet n'a pas été relu : ce sont des vérifications explicites, pas des trous.

**Cohérence des types :** `OccasionFieldClientDefinition` / `OccasionFieldDefinition` / `ResolvedAnswer` / `AnswerErrorCode` sont définis en Task 1 et réutilisés tels quels (Tasks 3 à 6). `buildOccasionDetails(fields, details)` : même signature en Task 1 et Task 5. `resolveOccasionDetails(name, raw)` retourne `{ answers, titleValue }` en Task 3 et est consommé ainsi en Task 6. `reorderOccasionFields(occasionId, formData)` est lié par `.bind` en Task 4.

**Review Focus :** les cinq lignes ont leur test — (1) `buildOccasionDetails` + reset sur `choose` (Task 1 test + Task 5 Step 11c) ; (2) `clearHiddenBlockValues` (Task 5 Step 1) ; (3) `validateOccasionAnswers` requis/inconnu + routes 422 (Task 1, Task 6 Step 7) ; (4) valeurs hostiles : `1e9`, `2026-02-31`, option hors liste, aplatissement des retours à la ligne (Task 1) ; (5) champ désactivé/supprimé → « Champ inconnu » (Task 1 `unknown`, Task 6 Step 7).
