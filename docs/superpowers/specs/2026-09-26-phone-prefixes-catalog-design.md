# Catalogue « Préfixes téléphoniques » — Design

## Contexte

`/admin/phone-prefixes` est aujourd'hui un écran 100% factice : 8 pays codés en dur dans
`app/admin/phone-prefixes/page.tsx`, affichés en lecture seule via le composant générique
`AdminCatalogPage` (pas de base, pas d'action de création/modification/suppression — le
`sourceNote` de la page l'admet explicitement : « La configuration centrale et les mutations ne
sont pas encore persistées »).

Côté client, le sélecteur d'indicatif du formulaire « Personne concernée »
(`components/banani/PaymentScreen.tsx`, écran affiché pendant la commande) a sa **propre** liste
de 8 pays codée en dur, complètement déconnectée de la page admin. Une **troisième** source
existe : `lib/validation/musikpro-demo.ts` (`DEMO_PHONE_RULES`) fixe, par pays, le nombre de
chiffres attendu et un exemple de numéro, utilisés pour la validation et le `maxLength` du champ.

Les deux listes ont déjà divergé :

- Admin (factice) : Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Niger, Ghana (actifs) + Togo,
  Bénin (« à préparer »).
- Client (réel) : Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Niger, Ghana, **Nigeria, France**
  (tous actifs) — Togo et Bénin n'existent pas côté client.

**Objectif** : une seule source de vérité en base, gérée depuis `/admin/phone-prefixes` avec un
vrai CRUD (créer, modifier, activer/désactiver, réordonner, supprimer), lue en direct par le
formulaire client — ajouter un pays en admin doit le faire apparaître immédiatement dans le
sélecteur du champ téléphone, avec sa propre règle de validation (nombre de chiffres, exemple de
numéro).

## Modèle de données

Nouvelle table `phone_prefixes`, calquée sur `occasions` (patron déjà utilisé pour
occasions/styles musicaux/relations destinataire) :

```ts
export const phonePrefixes = pgTable(
  "phone_prefixes",
  {
    id: text("id").primaryKey(),
    countryCode: text("country_code").notNull().unique(), // ISO-2, ex. "CI"
    countryName: text("country_name").notNull(), // français, clé canonique — voir i18n plus bas
    flag: text("flag").notNull(),
    dialCode: text("dial_code").notNull(), // ex. "+225"
    digits: integer("digits").notNull(), // nombre de chiffres attendu après l'indicatif
    placeholder: text("placeholder").notNull(), // exemple de numéro, ex. "0708807015"
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

### Migration + seed de réconciliation

La migration crée la table, l'index, et **seed les 10 pays des deux listes actuelles réunies**
(aucune perte de données), avec les règles de validation reprises de `DEMO_PHONE_RULES` pour les
8 pays qui y figurent déjà ; Togo et Bénin (jamais actifs côté client) récupèrent une règle par
défaut à 8 chiffres, cohérente avec leurs voisins UEMOA (Mali/Burkina/Niger), à ajuster par un
admin avant activation si besoin :

| countryCode | countryName   | flag | dialCode | digits | placeholder | active |
| ----------- | ------------- | ---- | -------- | ------ | ----------- | ------ |
| CI          | Côte d'Ivoire | 🇨🇮   | +225     | 10     | 0708807015  | true   |
| SN          | Sénégal       | 🇸🇳   | +221     | 9      | 771234567   | true   |
| ML          | Mali          | 🇲🇱   | +223     | 8      | 70123456    | true   |
| BF          | Burkina Faso  | 🇧🇫   | +226     | 8      | 70123456    | true   |
| NE          | Niger         | 🇳🇪   | +227     | 8      | 90123456    | true   |
| GH          | Ghana         | 🇬🇭   | +233     | 9      | 241234567   | true   |
| NG          | Nigeria       | 🇳🇬   | +234     | 10     | 8012345678  | true   |
| FR          | France        | 🇫🇷   | +33      | 9      | 612345678   | true   |
| TG          | Togo          | 🇹🇬   | +228     | 8      | 90123456    | false  |
| BJ          | Bénin         | 🇧🇯   | +229     | 8      | 90123456    | false  |

Suivant le patron `occasions`/`0006_tired_franklin_richards.sql` : `INSERT ... ON CONFLICT
("country_code") DO NOTHING` dans la même migration (pas de script séparé), puis :

```sql
GRANT SELECT ON TABLE "phone_prefixes" TO musikpro_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "phone_prefixes" TO musikpro_service;
```

### Sécurité

`config/security-rls.json`, section `exempt`, nouvelle entrée :

```json
"phone_prefixes": "global phone-prefix catalog, server-managed; client reads are filtered by active flag"
```

## Lecture / branchement (patron `occasions` → `lib/occasions/server.ts`)

- `lib/phone-prefixes/catalog.ts` : type `PhonePrefixOption` (`id, countryCode, countryName, flag,
dialCode, digits, placeholder, translations?`) + `DEFAULT_PHONE_PREFIXES` (secours si Neon vide/
  indisponible en mode démo, reprend exactement les 8 pays actifs du tableau ci-dessus — Togo/Bénin
  exclus du secours puisqu'inactifs).
- `lib/phone-prefixes/server.ts` (`"server-only"`) : `getActivePhonePrefixes({ demo })` — lit
  `phone_prefixes` où `active = true`, ordonné par `sortOrder`/`countryName`, retombe sur
  `DEFAULT_PHONE_PREFIXES` uniquement si la requête échoue et `demo` est vrai (même logique que
  `getActiveOccasions`).
- `app/dashboard/layout.tsx` : ajoute `const phonePrefixOptions = await getActivePhonePrefixes({
demo });` et la prop `initialPhonePrefixes={phonePrefixOptions}` sur `<DemoProvider>`.
- `components/banani/DemoProvider.tsx` : nouvelle prop `initialPhonePrefixes: PhonePrefixOption[]`,
  exposée sur le contexte comme `phonePrefixes` (même traitement que `occasions`/`musicStyles`).

## Écran client — `components/banani/PaymentScreen.tsx`

- Supprime le tableau local `phonePrefixes` (lignes 19-28) ; construit les options du
  `MusikSelect` à partir de `demo.phonePrefixes` :
  `demo.phonePrefixes.map((p) => ({ value: p.countryCode, label: localizeField(p.countryName, p.translations, "countryName"), display: \`${p.flag} ${p.dialCode}\` }))`.
- `phoneRule` (ligne 34) : `demo.phonePrefixes.find((p) => p.countryCode === selectedCountry) ??
demo.phonePrefixes[0]` au lieu de `DEMO_PHONE_RULES[selectedCountry]`.
- `selectedCountry` reste une simple chaîne (`string`), plus un littéral `DemoPhoneCountry` (type
  supprimé, voir validation ci-dessous).
- Ligne 170 (`onChange` du sélecteur) : tronque `payment.phone` à `country.digits` (valeur trouvée
  dans `demo.phonePrefixes`, plus dans `DEMO_PHONE_RULES`).
- Ligne 191 (aide sous le champ) : `{phoneRule.digits} chiffres requis...` — inchangé dans le
  fond, `phoneRule` vient maintenant de la liste live.

## Validation dynamique — `lib/validation/musikpro-demo.ts`

`DEMO_PHONE_RULES`/`DemoPhoneCountry`/`demoPaymentSchema`/`demoPaymentDraftSchema` (statiques,
enum figé sur les 8 clés compile-time) sont remplacés par des **fabriques** prenant la liste réelle
en paramètre — même technique que `isAdminRole(role, extraAdminSlugs)` et la validation
`roleSchema.role` du chantier rôles personnalisés (élargir en `z.string()`, vérifier
l'appartenance à l'exécution plutôt qu'au typage) :

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

Ce fichier n'importe pas `@/db` (comme aujourd'hui) : les fabriques restent testables sans base,
en leur passant un tableau `PhoneRule[]` de test — pas de régression sur la testabilité qui avait
motivé l'extraction de `lib/validation/custom-roles.ts` plus tôt dans le projet.

Appelants à mettre à jour :

- `components/banani/DemoProvider.tsx:156` — `demoPaymentDraftSchema.safeParse(...)` devient
  `buildDemoPaymentDraftSchema(initialPhonePrefixes).safeParse(...)` (les préfixes sont déjà une
  prop du composant à cet endroit).
- `components/banani/PaymentScreen.tsx:54` — `demoPaymentSchema.safeParse(...)` devient
  `buildDemoPaymentSchema(demo.phonePrefixes).safeParse(...)`.
- `tests/musikpro-search.test.ts` n'est pas concerné (aucune référence à ces symboles).
- `tests/musikpro-demo.test.ts:8,71-75` — remplace l'import de `demoPaymentSchema` par
  `buildDemoPaymentSchema`, construit un tableau `PhoneRule[]` de test en tête de fichier
  (reprenant CI/BF/SN avec les mêmes chiffres qu'aujourd'hui) et appelle
  `buildDemoPaymentSchema(testPrefixes).safeParse(...)`.

## Admin — remplacement complet de l'écran factice

Patron répliqué depuis `app/admin/occasions/` (table ci-dessus → actions → formulaire → grille) :

- **`app/admin/phone-prefixes/actions.ts`** (nouveau) : `createPhonePrefix`, `updatePhonePrefix`,
  `togglePhonePrefix`, `deletePhonePrefix`, `reorderPhonePrefixes` — même structure que
  `app/admin/occasions/actions.ts` (Zod, `getServiceDb()`, `writeAuditLog`). Le champ téléphone vit
  sur `app/dashboard/payment-preview/page.tsx` (confirmé : c'est la seule route qui rend
  `PaymentScreen`, pas d'équivalent `/demo/...` pour cet écran) ; `initialPhonePrefixes` est chargé
  dans `app/dashboard/layout.tsx`, donc `revalidatePath("/admin/phone-prefixes")` +
  `revalidatePath("/dashboard/payment-preview")` après chaque mutation suffisent à invalider le
  layout et la page.
  **Écart volontaire par rapport au patron `occasions`** : `createOccasion` fait un `redirect()` nu
  après création, ce qui n'affiche pas de toast de succès sur la liste — c'était déjà le cas avant
  la règle obligatoire de toast introduite dans ce projet. `createPhonePrefix` doit s'y conformer
  et utiliser `redirect(withAdminNotice("/admin/phone-prefixes", "Préfixe créé.", "success"))`
  (`lib/admin/notice-redirect.ts`), pas un `redirect()` nu.
  Validation du formulaire : `countryCode` (2 lettres majuscules), `countryName`/`flag` préremplis
  par le choix dans `COUNTRIES_REFERENCE` mais resaisissables, `dialCode` (regex `^\+\d{1,4}$`),
  `digits` (entier 6-12), `placeholder` (chiffres uniquement, longueur = `digits`), `active`,
  `sortOrder`. `countryCode` unique — erreur claire si doublon (contrainte DB + message Zod/catch).
- **`app/admin/phone-prefixes/page.tsx`** (remplace entièrement le fichier factice actuel) :
  lit `getServiceDb().select().from(phonePrefixes).orderBy(asc(phonePrefixes.sortOrder), asc(phonePrefixes.countryName))`,
  `AdminPageHeader` avec `action={{ href: "/admin/phone-prefixes/new", label: "Nouveau préfixe" }}`
  — **c'est la section « ajouter un nouveau préfixe » demandée** — et bannière « Catalogue connecté
  à Neon » (même formulation que occasions/plans). Rend `<AdminPhonePrefixSortableGrid prefixes={rows} />`.
- **`app/admin/phone-prefixes/new/page.tsx`** (nouveau) : `requireAdmin()` + `<AdminPhonePrefixForm action={createPhonePrefix} />`.
- **`app/admin/phone-prefixes/[id]/page.tsx`** (nouveau, édition — même route plate que `occasions`,
  pas `[id]/edit/`) : charge la ligne, `notFound()` si absente, `<AdminPhonePrefixForm action={updatePhonePrefix} values={...} />`.
- **`components/admin/AdminPhonePrefixForm.tsx`** (nouveau, `"use client"`, patron `AdminActionForm`
  comme `AdminCustomRoleForm.tsx`) : sélection du pays via un `<select>` natif ou `AdminSelect`
  peuplé depuis `COUNTRIES_REFERENCE` (`lib/languages/countries-reference.ts`, déjà utilisé pour
  `/admin/languages`) qui préremplit `countryCode`/`countryName`/`flag` en JS au choix (pas de
  round-trip serveur), puis champs texte pour `dialCode`, `digits`, `placeholder`, `AdminSelect`
  pour `active`, input pour `sortOrder` — mêmes libellés d'état que `AdminOccasionForm`
  (« Active — visible pour les clients » / « Désactivée — masquée pour les clients »).
- **`components/admin/AdminPhonePrefixSortableGrid.tsx`** (nouveau, patron
  `AdminOccasionSortableGrid.tsx`) : glisser-déposer pour réordonner (`reorderPhonePrefixes`),
  bouton Modifier/Activer-Désactiver/Supprimer par carte (`AdminActionForm` + toast).
- **`components/admin/AdminDeletePhonePrefixButton.tsx`** (nouveau, copie de
  `AdminDeleteOccasionButton.tsx` adaptée au libellé « préfixe »).

## i18n

`countryName` est un champ catalogue admin affiché au client (comme `occasions.name`) : intégré à
`refreshCatalogTranslations()` (`app/admin/languages/actions.ts`) via `translateCatalogTable()`
(`lib/i18n/catalog-translate.ts`), donc couvert par le bouton existant « Actualiser les
traductions » sur `/admin/languages` — pas de nouveau mécanisme. Affiché avec `localizeField()`
côté `PaymentScreen.tsx`. Le drapeau et l'indicatif (`dialCode`) ne sont jamais traduits (ce ne
sont pas des textes).

## Hors périmètre

- `components/banani/ContactSupportScreen.tsx:159` contient seulement un `placeholder="+225 XX XX
XX XX"` sur un champ texte libre — pas de liste déroulante à réconcilier, aucune action requise.
- Aucune validation réelle de format de numéro par pays au-delà du nombre de chiffres (comme
  aujourd'hui) — un futur besoin de règles plus fines (regex par pays) sortirait de ce chantier.

## Tests

- `tests/musikpro-demo.test.ts` : migre vers `buildDemoPaymentSchema`/`buildDemoPaymentDraftSchema`
  avec un tableau de test explicite (voir ci-dessus) ; mêmes cas qu'aujourd'hui (CI valide/invalide,
  BF avec 8 chiffres, réutilisation d'un numéro CI sur un indicatif BF → invalide).
- Nouveau : test unitaire de `buildDemoPaymentSchema` avec une liste vide de préfixes (aucun crash,
  rejette tout `phoneCountry`) — couvre le cas où le catalogue serait vidé par erreur.
- Pas de test DB-dépendant pour `lib/phone-prefixes/server.ts` (même limitation que les autres
  modules `*/server.ts` de ce projet, vérifiée par lecture attentive + `tsc`/`eslint`, cf.
  précédent établi dans ce projet).
