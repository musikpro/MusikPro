# Catalogue « Préfixes téléphoniques » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer l'écran admin factice `/admin/phone-prefixes` par un vrai catalogue connecté à
Neon (CRUD complet, dont un bouton d'ajout), et brancher le sélecteur d'indicatif téléphonique du
formulaire client (`PaymentScreen.tsx`) sur ce même catalogue, avec une validation dynamique qui
suit la liste réelle.

**Architecture:** Nouvelle table `phone_prefixes` calquée sur `occasions`. Lecture via
`lib/phone-prefixes/server.ts` → `app/dashboard/layout.tsx` → `DemoProvider` → `useDemo().phonePrefixes`,
consommée par `PaymentScreen.tsx`. Validation (`lib/validation/musikpro-demo.ts`) passe de schémas
Zod statiques à des fabriques prenant la liste de préfixes en paramètre. Admin CRUD suit
exactement le patron `app/admin/occasions/` (actions Server + `AdminActionForm`/`useAdminActionToast`).

**Tech Stack:** Next.js App Router, Drizzle ORM (Neon), Zod, React 19, vitest.

**Spec:** `docs/superpowers/specs/2026-09-26-phone-prefixes-catalog-design.md`

## Global Constraints

- Toute action d'enregistrement/suppression/activation du dashboard admin doit rendre compte via
  `AdminActionForm`/`useAdminActionToast`/`AdminActionState`/`actionErrorMessage` — jamais de
  `<form action={fn}>` brut ni de `redirect()` nu sur succès sans `withAdminNotice()`.
- Toute entrée non fiable (formulaires admin) validée côté serveur avec Zod.
- `lib/validation/musikpro-demo.ts` ne doit importer aucun module touchant `@/db` — les fabriques
  de schéma prennent leurs données en paramètre, pas par lecture DB, pour rester testables sans
  `DATABASE_URL`.
- `countryName` est un champ catalogue traduit (comme `occasions.name`) : jamais de traduction
  écrite à la main, uniquement via `translateCatalogTable()`/le bouton « Actualiser les traductions ».
- Toute nouvelle migration de table crée un `GRANT SELECT ... TO musikpro_runtime` (lecture client)
  et un `GRANT SELECT, INSERT, UPDATE, DELETE ... TO musikpro_service` (écritures admin) dans le
  même fichier de migration.
- Ne pas modifier `components/banani/ContactSupportScreen.tsx` (hors périmètre, cf. spec).
- Toute réponse à l'utilisateur en français ; ne pas pousser vers GitHub sans autorisation
  explicite (règle permanente de ce projet).

## Review Focus

- Un pays existant vidé de sa `translations` (jamais rafraîchi) doit quand même s'afficher en
  français côté client — `localizeField()` doit retomber sur `countryName` sans planter (couvert
  par le comportement déjà générique de `localizeField`, à vérifier dans Task 5).
- Ajouter un pays déjà présent (même `countryCode`) doit échouer proprement avec un message
  compréhensible, pas un crash — couvert Task 6 (contrainte unique + `actionErrorMessage`) et par
  le filtrage de la liste déroulante dans Task 7.
- Un numéro dont la longueur ne correspond pas au pays sélectionné doit être rejeté par
  `buildDemoPaymentSchema`, y compris pour un pays ajouté après coup par un admin (pas seulement
  les 10 pays du seed) — test dédié Task 3.
- Désactiver un préfixe déjà sélectionné par un client dans un panier en cours ne doit pas casser
  l'écran (le formulaire retombe sur le premier préfixe actif disponible) — couvert Task 5 par le
  fallback `demo.phonePrefixes[0]`.
- Un catalogue vide (tous les préfixes supprimés) ne doit pas faire planter
  `buildDemoPaymentSchema`/`buildDemoPaymentDraftSchema` ni le rendu de `PaymentScreen` — test
  dédié Task 3 + garde-fou Task 5.

---

### Task 1: Schéma DB, migration et classification sécurité

**Files:**

- Modify: `db/schema/index.ts`
- Modify: `config/security-rls.json`
- Create: `db/migrations/00XX_<auto>.sql` (généré par `drizzle-kit generate`, nom exact inconnu à
  l'avance)

**Interfaces:**

- Produces: table Drizzle `phonePrefixes` (export nommé depuis `db/schema/index.ts`), colonnes
  `id, countryCode, countryName, flag, dialCode, digits, placeholder, active, sortOrder,
translations, createdAt, updatedAt` — consommée par toutes les tâches suivantes.

- [ ] **Step 1: Ajouter la table au schéma**

Ajouter à la fin de `db/schema/index.ts` (après la table `customRoles` existante) :

```ts
export const phonePrefixes = pgTable(
  "phone_prefixes",
  {
    id: text("id").primaryKey(),
    countryCode: text("country_code").notNull().unique(),
    countryName: text("country_name").notNull(),
    flag: text("flag").notNull(),
    dialCode: text("dial_code").notNull(),
    digits: integer("digits").notNull(),
    placeholder: text("placeholder").notNull(),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(100),
    /** AI-generated per-locale { en: { countryName }, es: {...}, pt: {...} } — see lib/i18n/catalog-translate.ts. */
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    activeOrderIndex: index("phone_prefixes_active_order_idx").on(table.active, table.sortOrder),
  }),
);
```

`index`, `integer`, `boolean`, `text`, `jsonb`, `timestamp`, `pgTable` sont déjà importés en tête
de fichier (utilisés par `occasions` juste au-dessus) — ne rien ajouter aux imports.

- [ ] **Step 2: Classer la table dans le manifeste RLS**

Dans `config/security-rls.json`, ajouter dans `"exempt"` (à côté de `"occasions"`) :

```json
"phone_prefixes": "global phone-prefix catalog, server-managed; client reads are filtered by active flag",
```

- [ ] **Step 3: Générer la migration**

Run: `npm run db:generate`
Expected: `[✓] Your SQL migration file ➜ db/migrations/00XX_....sql 🚀` — un nouveau fichier de
migration est créé, contenant `CREATE TABLE "phone_prefixes"` et l'index.

- [ ] **Step 4: Compléter la migration générée avec les GRANT et le seed de réconciliation**

Ouvrir le fichier de migration généré à l'étape 3 et lui ajouter, après le `CREATE INDEX` (même
forme que `db/migrations/0006_tired_franklin_richards.sql` pour `occasions`) :

```sql
--> statement-breakpoint
INSERT INTO "phone_prefixes" ("id", "country_code", "country_name", "flag", "dial_code", "digits", "placeholder", "active", "sort_order") VALUES
	('default-ci', 'CI', 'Côte d’Ivoire', '🇨🇮', '+225', 10, '0708807015', true, 10),
	('default-sn', 'SN', 'Sénégal', '🇸🇳', '+221', 9, '771234567', true, 20),
	('default-ml', 'ML', 'Mali', '🇲🇱', '+223', 8, '70123456', true, 30),
	('default-bf', 'BF', 'Burkina Faso', '🇧🇫', '+226', 8, '70123456', true, 40),
	('default-ne', 'NE', 'Niger', '🇳🇪', '+227', 8, '90123456', true, 50),
	('default-gh', 'GH', 'Ghana', '🇬🇭', '+233', 9, '241234567', true, 60),
	('default-ng', 'NG', 'Nigeria', '🇳🇬', '+234', 10, '8012345678', true, 70),
	('default-fr', 'FR', 'France', '🇫🇷', '+33', 9, '612345678', true, 80),
	('default-tg', 'TG', 'Togo', '🇹🇬', '+228', 8, '90123456', false, 90),
	('default-bj', 'BJ', 'Bénin', '🇧🇯', '+229', 8, '90123456', false, 100)
ON CONFLICT ("country_code") DO NOTHING;
--> statement-breakpoint
GRANT SELECT ON TABLE "phone_prefixes" TO musikpro_runtime;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "phone_prefixes" TO musikpro_service;
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune sortie (0 erreur).

Run: `npm run security:baseline`
Expected: `Security baseline: PASS — 21 API routes and 39 DB tables classified.` (39, pas 38 —
`phone_prefixes` vient d'être ajouté).

- [ ] **Step 6: Commit**

```bash
git add db/schema/index.ts config/security-rls.json db/migrations/
git commit -m "feat: ajouter la table phone_prefixes (catalogue préfixes téléphoniques)"
```

---

### Task 2: Catalogue de secours et lecture serveur

**Files:**

- Create: `lib/phone-prefixes/catalog.ts`
- Create: `lib/phone-prefixes/server.ts`

**Interfaces:**

- Consumes: table `phonePrefixes` (Task 1).
- Produces: `PhonePrefixOption` type, `DEFAULT_PHONE_PREFIXES`, `getActivePhonePrefixes({ demo })`
  — consommés par Task 4 (`app/dashboard/layout.tsx`).

- [ ] **Step 1: Créer le type et le secours statique**

Create `lib/phone-prefixes/catalog.ts`:

```ts
import type { CatalogTranslations } from "@/lib/i18n/translate";

export type PhonePrefixOption = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  placeholder: string;
  translations?: CatalogTranslations | null;
};

export const DEFAULT_PHONE_PREFIXES: PhonePrefixOption[] = [
  {
    id: "default-ci",
    countryCode: "CI",
    countryName: "Côte d’Ivoire",
    flag: "🇨🇮",
    dialCode: "+225",
    digits: 10,
    placeholder: "0708807015",
  },
  {
    id: "default-sn",
    countryCode: "SN",
    countryName: "Sénégal",
    flag: "🇸🇳",
    dialCode: "+221",
    digits: 9,
    placeholder: "771234567",
  },
  {
    id: "default-ml",
    countryCode: "ML",
    countryName: "Mali",
    flag: "🇲🇱",
    dialCode: "+223",
    digits: 8,
    placeholder: "70123456",
  },
  {
    id: "default-bf",
    countryCode: "BF",
    countryName: "Burkina Faso",
    flag: "🇧🇫",
    dialCode: "+226",
    digits: 8,
    placeholder: "70123456",
  },
  {
    id: "default-ne",
    countryCode: "NE",
    countryName: "Niger",
    flag: "🇳🇪",
    dialCode: "+227",
    digits: 8,
    placeholder: "90123456",
  },
  {
    id: "default-gh",
    countryCode: "GH",
    countryName: "Ghana",
    flag: "🇬🇭",
    dialCode: "+233",
    digits: 9,
    placeholder: "241234567",
  },
  {
    id: "default-ng",
    countryCode: "NG",
    countryName: "Nigeria",
    flag: "🇳🇬",
    dialCode: "+234",
    digits: 10,
    placeholder: "8012345678",
  },
  {
    id: "default-fr",
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    dialCode: "+33",
    digits: 9,
    placeholder: "612345678",
  },
];
```

(Togo/Bénin exclus du secours : ils sont inactifs en base, le secours ne doit servir que si Neon
est indisponible, avec la liste des pays réellement actifs.)

- [ ] **Step 2: Créer le lecteur serveur**

Create `lib/phone-prefixes/server.ts`:

```ts
import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { DEFAULT_PHONE_PREFIXES, type PhonePrefixOption } from "./catalog";

export async function getActivePhonePrefixes(options: { demo?: boolean } = {}): Promise<PhonePrefixOption[]> {
  try {
    const rows = await db
      .select()
      .from(phonePrefixes)
      .where(and(eq(phonePrefixes.active, true)))
      .orderBy(asc(phonePrefixes.sortOrder), asc(phonePrefixes.countryName));
    if (rows.length || !options.demo) {
      return rows.map((row) => ({
        id: row.id,
        countryCode: row.countryCode,
        countryName: row.countryName,
        flag: row.flag,
        dialCode: row.dialCode,
        digits: row.digits,
        placeholder: row.placeholder,
        translations: row.translations as PhonePrefixOption["translations"],
      }));
    }
  } catch (error) {
    if (!options.demo) throw error;
  }
  return DEFAULT_PHONE_PREFIXES;
}
```

Ce fichier suit exactement `lib/occasions/server.ts` / `lib/credit-plans/server.ts` (essai DB,
secours uniquement en mode démo si la requête échoue ou si la base est vide).

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint lib/phone-prefixes/catalog.ts lib/phone-prefixes/server.ts`
Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add lib/phone-prefixes/
git commit -m "feat: lecteur serveur et secours statique pour le catalogue de préfixes"
```

---

### Task 3: Validation dynamique du téléphone (TDD)

**Files:**

- Modify: `lib/validation/musikpro-demo.ts`
- Modify: `tests/musikpro-demo.test.ts`

**Interfaces:**

- Consumes: rien de nouveau (fichier sans dépendance DB, conforme à Global Constraints).
- Produces: `PhoneRule` type, `buildDemoPaymentSchema(prefixes)`,
  `buildDemoPaymentDraftSchema(prefixes)` — remplacent `DEMO_PHONE_RULES`, `DemoPhoneCountry`,
  `demoPaymentSchema`, `demoPaymentDraftSchema`. Consommés par Task 4
  (`components/banani/DemoProvider.tsx`) et Task 5 (`components/banani/PaymentScreen.tsx`).

- [ ] **Step 1: Lire les tests actuels**

Lire `tests/musikpro-demo.test.ts` en entier pour connaître le contexte exact (imports partagés,
style des autres `describe`) avant de le modifier — ne pas deviner sa structure.

- [ ] **Step 2: Écrire les tests pour les nouvelles fabriques (RED)**

Remplacer, dans `tests/musikpro-demo.test.ts`, l'import de `demoPaymentSchema` par
`buildDemoPaymentSchema`, et ajouter en tête de fichier (après les imports existants) :

```ts
const testPhoneRules = [
  { countryCode: "CI", digits: 10, placeholder: "0708807015" },
  { countryCode: "BF", digits: 8, placeholder: "70123456" },
  { countryCode: "SN", digits: 9, placeholder: "771234567" },
];
```

Remplacer le bloc de test existant qui utilisait `demoPaymentSchema` par :

```ts
it("valide le téléphone selon l’indicatif choisi", () => {
  const schema = buildDemoPaymentSchema(testPhoneRules);
  const payment = { name: "Awa Koné", email: "awa@example.com", phoneCountry: "CI", phone: "0708807015" };
  expect(schema.safeParse(payment).success).toBe(true);
  expect(schema.safeParse({ ...payment, phone: "0102" }).success).toBe(false);
  expect(schema.safeParse({ ...payment, phoneCountry: "BF", phone: "70123456" }).success).toBe(true);
  expect(schema.safeParse({ ...payment, phoneCountry: "SN", phone: "771234567" }).success).toBe(true);
  expect(schema.safeParse({ ...payment, phoneCountry: "BF", phone: "0708807015" }).success).toBe(false);
});

it("rejette un indicatif qui n’existe pas dans la liste fournie", () => {
  const schema = buildDemoPaymentSchema(testPhoneRules);
  const payment = { name: "Awa Koné", email: "awa@example.com", phoneCountry: "XX", phone: "12345678" };
  expect(schema.safeParse(payment).success).toBe(false);
});

it("ne plante pas avec une liste de préfixes vide", () => {
  const schema = buildDemoPaymentSchema([]);
  expect(
    schema.safeParse({ name: "Awa Koné", email: "awa@example.com", phoneCountry: "CI", phone: "0708807015" }).success,
  ).toBe(false);
});
```

- [ ] **Step 3: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run tests/musikpro-demo.test.ts`
Expected: FAIL — `buildDemoPaymentSchema` n'existe pas encore dans `lib/validation/musikpro-demo.ts`.

- [ ] **Step 4: Implémenter les fabriques (GREEN)**

Dans `lib/validation/musikpro-demo.ts`, remplacer les lignes 17-28 (`DEMO_PHONE_RULES` et
`DemoPhoneCountry`) ainsi que les définitions de `demoPaymentDraftSchema` (ligne 69, 73) et
`demoPaymentSchema` (lignes 75-91) par :

```ts
export type PhoneRule = { countryCode: string; digits: number; placeholder: string };

export function buildDemoPaymentDraftSchema(prefixes: PhoneRule[]) {
  const codes = new Set(prefixes.map((p) => p.countryCode));
  const fallback = prefixes[0]?.countryCode ?? "";
  return z.object({
    name: z.string().trim().max(100).catch(""),
    email: z.string().trim().max(254).catch(""),
    phone: z.string().trim().max(25).regex(/^\d*$/).catch(""),
    phoneCountry: z
      .string()
      .catch(fallback)
      .transform((value) => (codes.has(value) ? value : fallback)),
  });
}

export function buildDemoPaymentSchema(prefixes: PhoneRule[]) {
  const rules = new Map(prefixes.map((p) => [p.countryCode, p]));
  return z
    .object({
      name: z.string().trim().min(2, "Indique ton nom complet.").max(100),
      email: z.email("Saisis une adresse e-mail valide.").max(254),
      phoneCountry: z.string().min(2).max(4),
      phone: z.string().regex(/^\d*$/, "Utilise uniquement des chiffres."),
    })
    .superRefine(({ phoneCountry, phone }, context) => {
      const rule = rules.get(phoneCountry);
      if (!rule) {
        context.addIssue({ code: "custom", path: ["phoneCountry"], message: "Indicatif téléphonique invalide." });
        return;
      }
      if (phone.length !== rule.digits) {
        context.addIssue({
          code: "custom",
          path: ["phone"],
          message: `Saisis exactement ${rule.digits} chiffres pour cet indicatif.`,
        });
      }
    });
}
```

Le reste du fichier (`demoCreationChoicesSchema`, `demoStorySchema`, `demoRecipientSchema`,
`demoLyricsSchema`, `demoDetailSchema`, `demoProfileSchema`, `demoSupportSchema`) reste inchangé.

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run tests/musikpro-demo.test.ts`
Expected: PASS, tous les tests du fichier au vert.

- [ ] **Step 6: Vérifier l'ensemble du projet**

Run: `npx tsc --noEmit`
Expected: des erreurs apparaîtront dans `DemoProvider.tsx` et `PaymentScreen.tsx` (imports de
symboles supprimés) — **normal à ce stade**, ces fichiers sont corrigés dans les Tasks 4 et 5.
Ne pas chercher à les corriger ici ; noter simplement que la commande a bien identifié ces deux
fichiers comme seuls appelants affectés (cohérent avec la recherche de la spec).

- [ ] **Step 7: Commit**

```bash
git add lib/validation/musikpro-demo.ts tests/musikpro-demo.test.ts
git commit -m "feat: valider le téléphone dynamiquement contre la liste réelle de préfixes"
```

---

### Task 4: Branchement DemoProvider et dashboard layout

**Files:**

- Modify: `components/banani/DemoProvider.tsx`
- Modify: `app/dashboard/layout.tsx`

**Interfaces:**

- Consumes: `getActivePhonePrefixes` (Task 2), `buildDemoPaymentDraftSchema` (Task 3).
- Produces: `useDemo().phonePrefixes: PhonePrefixOption[]` — consommé par Task 5.

- [ ] **Step 1: Lire les points d'insertion exacts**

Lire `components/banani/DemoProvider.tsx` autour des lignes 9-15 (imports), 83, 279-283 (props →
consts), 587, 602-606 (exposition sur le contexte), 679, 695, 711 (prop `versionsPerGeneration`,
qui suit le même schéma que la nouvelle prop `initialPhonePrefixes`) pour reproduire exactement la
même mécanique de props → state → contexte, sans deviner les noms de variables voisines.

- [ ] **Step 2: Ajouter la prop et l'exposer sur le contexte**

Dans `components/banani/DemoProvider.tsx` :

- Importer `PhonePrefixOption` depuis `@/lib/phone-prefixes/catalog` et `buildDemoPaymentDraftSchema`
  à la place de `demoPaymentDraftSchema` (remplacer l'import existant venant de
  `@/lib/validation/musikpro-demo`).
- Ajouter `initialPhonePrefixes: PhonePrefixOption[]` à la liste de props du composant exporté
  (même position que `versionsPerGeneration`), avec le type dans l'objet de props inline.
- Remplacer l'appel `demoPaymentDraftSchema.safeParse(JSON.parse(saved))` (ligne 156) par
  `buildDemoPaymentDraftSchema(initialPhonePrefixes).safeParse(JSON.parse(saved))`.
- Exposer `phonePrefixes: initialPhonePrefixes` dans l'objet retourné par le contexte, au même
  endroit que `occasions`/`musicStyles`.

- [ ] **Step 3: Fournir la prop depuis le layout**

Dans `app/dashboard/layout.tsx` :

- Importer `getActivePhonePrefixes` depuis `@/lib/phone-prefixes/server`.
- Ajouter `const phonePrefixOptions = await getActivePhonePrefixes({ demo });` au même endroit que
  les autres appels `getActive*` (`occasionOptions`, `musicStyleOptions`, etc.).
- Ajouter `initialPhonePrefixes={phonePrefixOptions}` sur `<DemoProvider>`, au même endroit que
  `initialOccasions={occasionOptions}`.

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: les erreurs de Task 3 concernant `DemoProvider.tsx` ont disparu ; il ne doit rester que
celles touchant `PaymentScreen.tsx` (corrigées Task 5).

- [ ] **Step 5: Commit**

```bash
git add components/banani/DemoProvider.tsx app/dashboard/layout.tsx
git commit -m "feat: brancher le catalogue de préfixes téléphoniques sur DemoProvider"
```

---

### Task 5: Écran client — PaymentScreen

**Files:**

- Modify: `components/banani/PaymentScreen.tsx`

**Interfaces:**

- Consumes: `useDemo().phonePrefixes` (Task 4), `buildDemoPaymentSchema` (Task 3).

- [ ] **Step 1: Lire le fichier en entier**

Lire `components/banani/PaymentScreen.tsx` en entier (les lignes 1-60 et 140-200 sont déjà connues
de la spec, mais relire pour confirmer qu'aucune autre référence à `phonePrefixes`,
`DEMO_PHONE_RULES` ou `DemoPhoneCountry` n'existe ailleurs dans le fichier).

- [ ] **Step 2: Retirer la liste locale et le type statique**

Supprimer le tableau local `phonePrefixes` (lignes 19-28) et l'import
`DEMO_PHONE_RULES, demoPaymentSchema, type DemoPhoneCountry` (ligne 10), remplacé par :

```ts
import { buildDemoPaymentSchema } from "@/lib/validation/musikpro-demo";
import { localizeField } from "@/lib/i18n/translate";
```

(`localizeField` est peut-être déjà importé plus haut dans le fichier pour d'autres champs —
vérifier avant d'ajouter un import en double.)

- [ ] **Step 3: Construire les options et la règle active depuis `demo.phonePrefixes`**

Remplacer (ligne 33-34) :

```ts
const selectedCountry = (demo.choices.phoneCountry || "CI") as DemoPhoneCountry;
const phoneRule = DEMO_PHONE_RULES[selectedCountry] ?? DEMO_PHONE_RULES.CI;
```

par :

```ts
const selectedCountry = demo.choices.phoneCountry || demo.phonePrefixes[0]?.countryCode || "";
const phoneRule = demo.phonePrefixes.find((prefix) => prefix.countryCode === selectedCountry) ?? demo.phonePrefixes[0];
const phonePrefixOptions = demo.phonePrefixes.map((prefix) => ({
  value: prefix.countryCode,
  label: localizeField(prefix.countryName, prefix.translations, "countryName"),
  display: `${prefix.flag} ${prefix.dialCode}`,
}));
```

`phoneRule` peut être `undefined` si `demo.phonePrefixes` est vide (catalogue vidé) — gérer ce cas
au Step 5.

- [ ] **Step 4: Mettre à jour la validation à la soumission**

Remplacer (ligne 54) :

```ts
const parsed = demoPaymentSchema.safeParse({
```

par :

```ts
const parsed = buildDemoPaymentSchema(demo.phonePrefixes).safeParse({
```

(le reste de l'appel — `name`, `email`, `phone`, `phoneCountry: selectedCountry` — ne change pas).

- [ ] **Step 5: Mettre à jour le sélecteur et le champ, gérer le catalogue vide**

Remplacer (lignes 156-198, le bloc du sélecteur et du champ téléphone) — même structure, mais
`options={phonePrefixOptions}` au lieu de `options={phonePrefixes}`, `onChange` sans le cast
`as DemoPhoneCountry`, et `phoneRule?.digits`/`phoneRule?.placeholder` avec repli à `0`/`""` :

```tsx
<MusikSelect
  className="checkout-prefix-select"
  menuClassName="checkout-prefix-menu"
  ariaLabel="Indicatif téléphonique"
  portal
  portalWidth={126}
  showOptionLabels={false}
  showSelectionMark={false}
  value={selectedCountry}
  onChange={(value) => {
    const country = value;
    demo.choose("phoneCountry", country);
    const nextRule = demo.phonePrefixes.find((prefix) => prefix.countryCode === country);
    demo.field("payment.phone", demo.fields["payment.phone"].slice(0, nextRule?.digits ?? 0));
    clearFieldError("phone");
  }}
  options={phonePrefixOptions}
/>
<span className="checkout-phone-divider" aria-hidden="true" />
<DemoField
  name="payment.phone"
  label="Numéro de téléphone"
  type="tel"
  placeholder={phoneRule?.placeholder ?? ""}
  maxLength={phoneRule?.digits ?? 0}
  className="checkout-input checkout-phone-input"
  ariaInvalid={Boolean(fieldErrors.phone)}
  describedBy={fieldErrors.phone ? "payment-phone-help payment-phone-error" : "payment-phone-help"}
  transformValue={(value) => value.replace(/\D/g, "").slice(0, phoneRule?.digits ?? 0)}
  onValueChange={() => clearFieldError("phone")}
/>
</span>
<small id="payment-phone-help">
  {phoneRule ? `${phoneRule.digits} chiffres requis pour cet indicatif, sans espaces.` : "Aucun indicatif disponible."}
</small>
```

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur restante (toutes les erreurs ouvertes depuis Task 3 sont résolues).

Run: `npx eslint components/banani/PaymentScreen.tsx`
Expected: aucune sortie.

Run: `npx vitest run`
Expected: `187/188` (ou plus, selon les tests ajoutés Task 3) passent, `1 skipped`, aucune
régression.

- [ ] **Step 7: Commit**

```bash
git add components/banani/PaymentScreen.tsx
git commit -m "feat: brancher le sélecteur d'indicatif du paiement sur le catalogue réel"
```

---

### Task 6: Actions serveur admin (CRUD)

**Files:**

- Create: `app/admin/phone-prefixes/actions.ts`

**Interfaces:**

- Consumes: table `phonePrefixes` (Task 1), `COUNTRIES_REFERENCE` (`lib/languages/countries-reference.ts`, existant).
- Produces: `PhonePrefixActionState` (= `AdminActionState`), `createPhonePrefix`,
  `updatePhonePrefix`, `togglePhonePrefix`, `deletePhonePrefix`, `reorderPhonePrefixes` —
  consommés par Task 7 (formulaire) et Task 8 (grille triable).

- [ ] **Step 1: Écrire le fichier**

Create `app/admin/phone-prefixes/actions.ts`:

```ts
"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type PhonePrefixActionState = AdminActionState;

const createPhonePrefixSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((code) => COUNTRIES_REFERENCE.some((country) => country.code === code), "Pays inconnu."),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Format attendu : +225"),
  digits: z.coerce.number().int().min(6).max(12),
  placeholder: z.string().trim().regex(/^\d+$/, "Chiffres uniquement."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const updatePhonePrefixSchema = z.object({
  id: z.string().trim().min(1).max(120),
  dialCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "Format attendu : +225"),
  digits: z.coerce.number().int().min(6).max(12),
  placeholder: z.string().trim().regex(/^\d+$/, "Chiffres uniquement."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const prefixMutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
const togglePrefixSchema = prefixMutationSchema.extend({ active: z.enum(["true", "false"]) });
const reorderPrefixesSchema = z.object({
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
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(200))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque préfixe doit apparaître une seule fois."),
});

function checkDigitsMatchPlaceholder(digits: number, placeholder: string) {
  if (placeholder.length !== digits)
    throw new Error(`L’exemple de numéro doit contenir exactement ${digits} chiffres.`);
}

function revalidatePhonePrefixes() {
  revalidatePath("/admin/phone-prefixes");
  revalidatePath("/dashboard/payment-preview");
}

export async function createPhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = createPhonePrefixSchema.parse(Object.fromEntries(formData));
    checkDigitsMatchPlaceholder(parsed.digits, parsed.placeholder);
    const country = COUNTRIES_REFERENCE.find((entry) => entry.code === parsed.countryCode)!;
    const id = randomUUID();
    await getServiceDb()
      .insert(phonePrefixes)
      .values({
        id,
        countryCode: parsed.countryCode,
        countryName: country.name,
        flag: country.flag,
        dialCode: parsed.dialCode,
        digits: parsed.digits,
        placeholder: parsed.placeholder,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
      });
    await writeAuditLog({
      action: "phone_prefix.created",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: id,
      metadata: { countryCode: parsed.countryCode },
    });
    revalidatePhonePrefixes();
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer ce préfixe.") };
  }
  redirect(withAdminNotice("/admin/phone-prefixes", "Préfixe créé.", "success"));
}

export async function updatePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = updatePhonePrefixSchema.parse(Object.fromEntries(formData));
    checkDigitsMatchPlaceholder(parsed.digits, parsed.placeholder);
    await getServiceDb()
      .update(phonePrefixes)
      .set({
        dialCode: parsed.dialCode,
        digits: parsed.digits,
        placeholder: parsed.placeholder,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.updated",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
    });
    revalidatePhonePrefixes();
    return { ok: true, message: "Préfixe enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce préfixe.") };
  }
}

export async function togglePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = togglePrefixSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true";
    await getServiceDb()
      .update(phonePrefixes)
      .set({ active, updatedAt: new Date() })
      .where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.active.changed",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidatePhonePrefixes();
    return { ok: true, message: active ? "Préfixe activé." : "Préfixe désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce préfixe.") };
  }
}

export async function deletePhonePrefix(
  _previous: PhonePrefixActionState,
  formData: FormData,
): Promise<PhonePrefixActionState> {
  const session = await requireAdmin();
  try {
    const parsed = prefixMutationSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(phonePrefixes).where(eq(phonePrefixes.id, parsed.id));
    await writeAuditLog({
      action: "phone_prefix.deleted",
      actorId: session.user.id,
      targetType: "phone_prefix",
      targetId: parsed.id,
    });
    revalidatePhonePrefixes();
    return { ok: true, message: "Préfixe supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce préfixe.") };
  }
}

export async function reorderPhonePrefixes(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderPrefixesSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: phonePrefixes.id }).from(phonePrefixes);
  const existingIds = new Set(existing.map((row) => row.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des préfixes a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${phonePrefixes} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${phonePrefixes.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "phone_prefix.reordered",
    actorId: session.user.id,
    targetType: "phone_prefix_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidatePhonePrefixes();
}
```

Note : `createPhonePrefix` utilise `redirect(withAdminNotice(...))` (pas un `redirect()` nu, à la
différence de `createOccasion` qui prédate la règle obligatoire de toast — voir Global Constraints
et la spec).

- [ ] **Step 2: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans ce fichier (des erreurs peuvent subsister ailleurs si Task 7/8 ne sont
pas encore faites — normal, ce fichier n'est consommé par personne avant Task 7).

Run: `npx eslint app/admin/phone-prefixes/actions.ts`
Expected: aucune sortie.

- [ ] **Step 3: Commit**

```bash
git add app/admin/phone-prefixes/actions.ts
git commit -m "feat: actions serveur CRUD pour le catalogue de préfixes téléphoniques"
```

---

### Task 7: Formulaire admin (création / édition)

**Files:**

- Create: `components/admin/AdminPhonePrefixForm.tsx`
- Create: `app/admin/phone-prefixes/new/page.tsx`
- Create: `app/admin/phone-prefixes/[id]/page.tsx`

**Interfaces:**

- Consumes: `createPhonePrefix`, `updatePhonePrefix` (Task 6), `COUNTRIES_REFERENCE`
  (`lib/languages/countries-reference.ts`), `AdminActionForm` (existant).
- Produces: route `/admin/phone-prefixes/new`, route `/admin/phone-prefixes/[id]` — consommées par
  Task 8 (liens « Modifier »/« Nouveau préfixe »).

- [ ] **Step 1: Créer le formulaire partagé**

Create `components/admin/AdminPhonePrefixForm.tsx`:

```tsx
"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { AdminBackLink } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import type { CountryReference } from "@/lib/languages/countries-reference";
import type { PhonePrefixActionState } from "@/app/admin/phone-prefixes/actions";

export type PhonePrefixFormValue = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  placeholder: string;
  active: boolean;
  sortOrder: number;
};

export default function AdminPhonePrefixForm({
  action,
  prefix,
  availableCountries = [],
}: {
  action: (previous: PhonePrefixActionState, formData: FormData) => Promise<PhonePrefixActionState>;
  prefix?: PhonePrefixFormValue;
  availableCountries?: CountryReference[];
}) {
  const editing = Boolean(prefix);
  return (
    <AdminActionForm action={action} className="admin-editor-grid">
      {editing ? (
        <>
          <input type="hidden" name="id" value={prefix!.id} />
          <div className="admin-editor-field is-wide">
            <span>Pays</span>
            <p>
              {prefix!.flag} {prefix!.countryName} ({prefix!.countryCode})
            </p>
          </div>
        </>
      ) : (
        <label className="admin-editor-field is-wide">
          <span>Pays</span>
          <AdminSelect
            name="countryCode"
            defaultValue={availableCountries[0]?.code ?? ""}
            ariaLabel="Pays"
            options={availableCountries.map((country) => ({
              value: country.code,
              label: `${country.flag} ${country.name}`,
            }))}
          />
        </label>
      )}
      <label className="admin-editor-field">
        <span>Indicatif</span>
        <input name="dialCode" required placeholder="+225" defaultValue={prefix?.dialCode} />
      </label>
      <label className="admin-editor-field">
        <span>Chiffres attendus</span>
        <input name="digits" required type="number" min="6" max="12" defaultValue={prefix?.digits ?? 8} />
      </label>
      <label className="admin-editor-field is-wide">
        <span>Exemple de numéro</span>
        <input name="placeholder" required placeholder="0708807015" defaultValue={prefix?.placeholder} />
      </label>
      <label className="admin-editor-field">
        <span>Position d’affichage</span>
        <input name="sortOrder" required type="number" min="0" max="999" defaultValue={prefix?.sortOrder ?? 100} />
      </label>
      <div className="admin-editor-field">
        <span>État</span>
        <AdminSelect
          name="active"
          defaultValue={String(prefix?.active ?? true)}
          ariaLabel="État du préfixe"
          options={[
            { value: "true", label: "Actif — visible pour les clients" },
            { value: "false", label: "Désactivé — masqué pour les clients" },
          ]}
        />
      </div>
      <div className="admin-editor-actions is-wide">
        <AdminBackLink href="/admin/phone-prefixes" label="Annuler" />
        <button type="submit">
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer les modifications" : "Créer le préfixe"}
        </button>
      </div>
    </AdminActionForm>
  );
}
```

`CountryReference` est déjà exporté (`export interface CountryReference { code: string; name:
string; flag: string; }`, ligne 1 de `lib/languages/countries-reference.ts`) — aucune modification
de ce fichier n'est nécessaire.

- [ ] **Step 2: Page de création**

Create `app/admin/phone-prefixes/new/page.tsx`:

```tsx
import AdminPhonePrefixForm from "@/components/admin/AdminPhonePrefixForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { COUNTRIES_REFERENCE } from "@/lib/languages/countries-reference";
import { createPhonePrefix } from "../actions";

export default async function AdminNewPhonePrefixPage() {
  await requireAdmin();
  const existing = await getServiceDb().select({ countryCode: phonePrefixes.countryCode }).from(phonePrefixes);
  const existingCodes = new Set(existing.map((row) => row.countryCode));
  const availableCountries = COUNTRIES_REFERENCE.filter((country) => !existingCodes.has(country.code));
  return (
    <AdminPage>
      <AdminBackLink href="/admin/phone-prefixes" />
      <AdminPageHeader
        eyebrow="Téléphonie"
        title="Nouveau préfixe"
        description="Ajoute un pays au sélecteur d’indicatif du parcours client."
      />
      {availableCountries.length ? (
        <AdminPhonePrefixForm action={createPhonePrefix} availableCountries={availableCountries} />
      ) : (
        <p>Tous les pays de la liste de référence ont déjà un préfixe enregistré.</p>
      )}
    </AdminPage>
  );
}
```

- [ ] **Step 3: Page d'édition**

Create `app/admin/phone-prefixes/[id]/page.tsx`:

```tsx
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminPhonePrefixForm from "@/components/admin/AdminPhonePrefixForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updatePhonePrefix } from "../actions";

export default async function AdminEditPhonePrefixPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [prefix] = await getServiceDb().select().from(phonePrefixes).where(eq(phonePrefixes.id, id)).limit(1);
  if (!prefix) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/phone-prefixes" />
      <AdminPageHeader
        eyebrow="Téléphonie"
        title={`Modifier ${prefix.countryName}`}
        description="Les changements apparaîtront dans le parcours de paiement client."
      />
      <AdminPhonePrefixForm action={updatePhonePrefix} prefix={prefix} />
    </AdminPage>
  );
}
```

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint components/admin/AdminPhonePrefixForm.tsx app/admin/phone-prefixes/new/page.tsx "app/admin/phone-prefixes/[id]/page.tsx"`
Expected: aucune sortie.

- [ ] **Step 5: Commit**

```bash
git add components/admin/AdminPhonePrefixForm.tsx app/admin/phone-prefixes/new app/admin/phone-prefixes/[id]
git commit -m "feat: formulaire admin de création/édition d'un préfixe téléphonique"
```

---

### Task 8: Liste admin, grille triable et suppression

**Files:**

- Modify (remplacement complet): `app/admin/phone-prefixes/page.tsx`
- Create: `components/admin/AdminPhonePrefixSortableGrid.tsx`
- Create: `components/admin/AdminDeletePhonePrefixButton.tsx`

**Interfaces:**

- Consumes: `toggleUnused` retiré ; `reorderPhonePrefixes`, `deletePhonePrefix`, `togglePhonePrefix`
  (Task 6), `AdminSortableGrid` (existant), `useAdminActionToast` (existant).

- [ ] **Step 1: Lire le fichier factice actuel en entier**

Lire `app/admin/phone-prefixes/page.tsx` (34 lignes, déjà cité en intégralité dans la spec) pour
confirmer qu'il n'y a rien d'autre à préserver (pas de logique cachée) avant de le remplacer
entièrement.

- [ ] **Step 2: Créer le bouton de suppression**

Create `components/admin/AdminDeletePhonePrefixButton.tsx`:

```tsx
"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeletePhonePrefixButton({ name, pending = false }: { name: string; pending?: boolean }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement le préfixe « ${name} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
```

- [ ] **Step 3: Créer la grille triable**

Create `components/admin/AdminPhonePrefixSortableGrid.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  deletePhonePrefix,
  reorderPhonePrefixes,
  togglePhonePrefix,
  type PhonePrefixActionState,
} from "@/app/admin/phone-prefixes/actions";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast } from "./useAdminActionToast";
import AdminDeletePhonePrefixButton from "./AdminDeletePhonePrefixButton";
import AdminSortableGrid from "./AdminSortableGrid";

function TogglePhonePrefixForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<PhonePrefixActionState, FormData>(togglePhonePrefix, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} />
        {active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}

function DeletePhonePrefixForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<PhonePrefixActionState, FormData>(deletePhonePrefix, null);
  useAdminActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeletePhonePrefixButton name={name} pending={pending} />
    </form>
  );
}

export type SortablePhonePrefix = {
  id: string;
  countryCode: string;
  countryName: string;
  flag: string;
  dialCode: string;
  digits: number;
  active: boolean;
  sortOrder: number;
};

export default function AdminPhonePrefixSortableGrid({ prefixes }: { prefixes: SortablePhonePrefix[] }) {
  return (
    <AdminSortableGrid
      items={prefixes}
      onReorder={reorderPhonePrefixes}
      className="admin-music-style-grid admin-phone-prefix-grid"
      itemLabel={(prefix) => prefix.countryName}
      renderItem={(prefix, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-phone-prefix-card ${prefix.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon" aria-hidden="true">
              {prefix.flag}
            </span>
            <span className={`admin-status ${prefix.active ? "is-success" : "is-pending"}`}>
              {prefix.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{prefix.countryName}</h2>
          <p>{prefix.dialCode}</p>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/phone-prefixes/${prefix.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <TogglePhonePrefixForm id={prefix.id} active={prefix.active} />
            <DeletePhonePrefixForm id={prefix.id} name={prefix.countryName} />
          </footer>
        </article>
      )}
      renderPreview={(prefix) => (
        <>
          <span className="admin-catalog-icon">{prefix.flag}</span>
          <strong>{prefix.countryName}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
```

- [ ] **Step 4: Remplacer la page liste factice**

Replace entièrement `app/admin/phone-prefixes/page.tsx` par :

```tsx
import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminPhonePrefixSortableGrid from "@/components/admin/AdminPhonePrefixSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPhonePrefixesPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(phonePrefixes)
    .orderBy(asc(phonePrefixes.sortOrder), asc(phonePrefixes.countryName));
  const activeCount = rows.filter((prefix) => prefix.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Téléphonie"
        title="Préfixes téléphoniques"
        description={`${activeCount} préfixe${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Le même catalogue alimente le champ téléphone du parcours client.`}
        action={{ href: "/admin/phone-prefixes/new", label: "Nouveau préfixe" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>L’indicatif, le nombre de chiffres, l’état et l’ordre sont appliqués au parcours de paiement client.</p>
        </div>
      </div>
      {rows.length ? (
        <AdminPhonePrefixSortableGrid prefixes={rows} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="phone" size={24} />
          <strong>Aucun préfixe enregistré</strong>
          <p>Ajoute un préfixe pour le proposer dans le champ téléphone du parcours client.</p>
          <Link className="admin-primary-action" href="/admin/phone-prefixes/new">
            <Icon i="plus" size={16} /> Ajouter un préfixe
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
```

- [ ] **Step 5: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur dans tout le projet — c'est la première fois que toutes les pièces
(Tasks 1 à 8) sont assemblées.

Run: `npx eslint "app/admin/phone-prefixes/page.tsx" components/admin/AdminPhonePrefixSortableGrid.tsx components/admin/AdminDeletePhonePrefixButton.tsx`
Expected: aucune sortie.

Run: `npx vitest run`
Expected: tous les tests passent (187+/188+ selon Task 3), `1 skipped`, aucune régression.

- [ ] **Step 6: Commit**

```bash
git add "app/admin/phone-prefixes/page.tsx" components/admin/AdminPhonePrefixSortableGrid.tsx components/admin/AdminDeletePhonePrefixButton.tsx
git commit -m "feat: remplacer l'écran factice des préfixes téléphoniques par un vrai catalogue admin"
```

---

### Task 9: Intégration au bouton « Actualiser les traductions »

**Files:**

- Modify: `app/admin/languages/actions.ts`

**Interfaces:**

- Consumes: table `phonePrefixes` (Task 1), `translateCatalogTable` (existant,
  `lib/i18n/catalog-translate.ts`).

- [ ] **Step 1: Lire `refreshCatalogTranslations` en entier**

Relire `app/admin/languages/actions.ts` (fonction `refreshCatalogTranslations`, actuellement
occasions/styles/relations/plans) pour confirmer la structure exacte avant modification — la
spec en cite déjà l'essentiel, mais lire le fichier réel évite une divergence de détail.

- [ ] **Step 2: Ajouter `phone_prefixes` aux trois `Promise.all`**

Dans `app/admin/languages/actions.ts` :

- Importer `phonePrefixes` depuis `@/db/schema` (ajouter à l'import existant de `occasions,
musicStyles, recipientRelations, plans`).
- Premier `Promise.all` (lecture) : ajouter `serviceDb.select().from(phonePrefixes)`, récupérer
  dans `prefixRows`.
- Deuxième `Promise.all` (traduction) : ajouter
  `translateCatalogTable(prefixRows.map((row) => ({ id: row.id, fields: { countryName: row.countryName } })))`,
  récupérer dans `prefixTranslations`.
- Troisième `Promise.all` (écriture) : ajouter
  ```ts
  ...prefixRows.map((row) =>
    serviceDb
      .update(phonePrefixes)
      .set({ translations: prefixTranslations.get(row.id) ?? {}, updatedAt: new Date() })
      .where(eq(phonePrefixes.id, row.id)),
  ),
  ```
- `counts` : ajouter `phonePrefixes: prefixRows.length`.

- [ ] **Step 3: Vérifier**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

Run: `npx eslint app/admin/languages/actions.ts`
Expected: aucune sortie.

- [ ] **Step 4: Commit**

```bash
git add app/admin/languages/actions.ts
git commit -m "feat: inclure les préfixes téléphoniques dans l'actualisation des traductions"
```
