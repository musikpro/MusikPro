# Détection automatique de la devise par pays — Spec

## Contexte

L'admin gère déjà une table `country_languages` (page `/admin/languages`, libellée
« Langues » dans le menu) qui associe un pays à une langue d'interface. Au runtime,
`lib/languages/detection.ts` détecte le pays du visiteur (en-tête géo Vercel, sinon IP +
`country.is`, avec cache Upstash/mémoire), cherche une ligne `country_languages` pour ce
pays, et l'utilise comme override de langue ; à défaut, une heuristique statique
(`lib/languages/country-language.ts`) prend le relais. Le résultat est passé à
`DemoProvider` via `initialDetectedInterfaceLanguage`, qui pré-sélectionne la langue au
premier chargement (l'utilisateur garde un sélecteur manuel).

La devise, elle, n'a aujourd'hui **aucun lien avec le pays** : c'est un choix 100% manuel
du visiteur sur l'écran crédits/tarifs (`components/banani/CreditsPurchaseScreen.tsx` et
apparentés), initialisé à `"XOF"` en dur dans `DemoProvider` (`choices.currency`). La
liste des devises supportées et leurs taux de change (par rapport au XOF, source de
vérité) vivent dans `lib/credit-plans/currency.ts` (`creditCurrencies`, `unitsPerXof`) —
6 devises aujourd'hui : XOF, XAF, EUR, USD, NGN, GHS.

C'est une couche d'**affichage/estimation de prix** uniquement (conversion pour montrer un
prix approximatif dans la devise locale) — elle ne pilote pas la devise réellement
facturée par le prestataire de paiement (Chariow), qui reste gérée séparément
(`payment_country_routes`, hors périmètre ici).

## Objectif

1. Renommer le menu admin « Langues » en **« Langues et Monnaies »**, et la boîte
   « Association pays → langue » en **« Association pays, langue et monnaie »**.
2. Ajouter une devise à chaque association pays/langue existante, éditable dans le même
   formulaire admin.
3. Détecter automatiquement la devise du visiteur de la même façon que la langue
   (`country.is` → table `country_languages`), et l'utiliser comme **valeur par défaut
   modifiable** de `choices.currency` — le sélecteur manuel sur l'écran crédits reste en
   place.
4. Étendre `creditCurrencies` avec les devises locales manquantes pour que chacun des 20
   pays du catalogue ait sa vraie devise (pas de repli nécessaire) : KES (Kenya), CDF
   (RDC), RWF (Rwanda), TZS (Tanzanie), UGX (Ouganda), ZMW (Zambie), MZN (Mozambique), et
   GNF (Guinée — pas listée explicitement par l'utilisateur mais nécessaire pour la même
   raison : le franc guinéen n'existe pas encore dans le système).

## Modèle de données

**Modification additive** de `db/schema/index.ts` — `countryLanguages` (nom de table
technique inchangé, ne pas renommer : changement additif/rétrocompatible par préférence
CLAUDE.md) :

```ts
export const countryLanguages = pgTable("country_languages", {
  countryCode: text("country_code").primaryKey(),
  countryName: text("country_name").notNull(),
  flag: text("flag").notNull().default("🌍"),
  languageCode: text("language_code").notNull(),
  currencyCode: text("currency_code").notNull().default("XOF"), // nouveau
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Migration Drizzle** (nouveau fichier, généré par `drizzle-kit generate`) :

```sql
ALTER TABLE "country_languages" ADD COLUMN "currency_code" text DEFAULT 'XOF' NOT NULL;
--> statement-breakpoint
UPDATE "country_languages" SET "currency_code" = CASE "country_code"
  WHEN 'BJ' THEN 'XOF' WHEN 'BF' THEN 'XOF' WHEN 'CM' THEN 'XAF' WHEN 'TD' THEN 'XAF'
  WHEN 'CG' THEN 'XAF' WHEN 'CD' THEN 'CDF' WHEN 'CI' THEN 'XOF' WHEN 'GA' THEN 'XAF'
  WHEN 'GH' THEN 'GHS' WHEN 'GN' THEN 'GNF' WHEN 'KE' THEN 'KES' WHEN 'ML' THEN 'XOF'
  WHEN 'MZ' THEN 'MZN' WHEN 'NE' THEN 'XOF' WHEN 'NG' THEN 'NGN' WHEN 'RW' THEN 'RWF'
  WHEN 'SN' THEN 'XOF' WHEN 'TZ' THEN 'TZS' WHEN 'UG' THEN 'UGX' WHEN 'ZM' THEN 'ZMW'
  ELSE "currency_code" END;
```

(Les `GRANT` existants sur `country_languages` couvrent déjà la nouvelle colonne — pas de
nouveau `GRANT` nécessaire, seule une colonne est ajoutée à une table déjà exemptée dans
`config/security-rls.json`.)

Cette table de correspondance code pays → devise n'est qu'un point-in-time pour la
migration ; toute future évolution passe par l'admin.

## Devises supplémentaires (`lib/credit-plans/currency.ts`)

Taux illustratifs (comme le commentaire existant l'indique, « can later be refreshed by a
server-side FX provider »), dérivés d'un taux USD/XOF ≈ 1/600 déjà en place :

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
```

**Ruling — arrondi d'affichage** : les devises à forte valeur nominale (peu de centimes
utilisés en pratique) s'affichent sans décimales, comme XOF/XAF/NGN déjà en place :
`CDF, RWF, TZS, UGX, GNF, KES`. `ZMW` et `MZN` gardent 2 décimales (même style que `GHS`,
magnitude comparable). Coût si mal jugé : arrondi visuel légèrement trop agressif ou trop
précis sur une devise — aucun impact fonctionnel, ajustable en un import ultérieur.

## Interface admin (`app/admin/languages/`)

- `components/admin/AdminShell.tsx:42` et `app/admin/menu/page.tsx:15` : libellé menu
  `"Langues"` → `"Langues et Monnaies"`.
- `app/admin/languages/page.tsx` (section `CountryLanguageSection`) : titre de la boîte
  `"Association pays → langue"` → `"Association pays, langue et monnaie"` ; description
  mise à jour pour mentionner la monnaie.
- Chaque carte pays (actuellement badge langue en haut à droite, ex. `FR`) affiche en plus
  un second badge/texte pour la devise juste en dessous (ex. `FR` puis `XOF`).
- Formulaire d'ajout : 3ᵉ `<select>` **« Monnaie »**, options = `creditCurrencies`
  (réutilisation directe, pas de nouvelle liste).
- `app/admin/languages/actions.ts` — `setCountryLanguage` : schéma Zod étendu avec
  `currencyCode: z.enum(creditCurrencies.map(c => c.code))`, upsert incluant
  `currencyCode` dans `.values()` et `.onConflictDoUpdate()`. Suit déjà
  `AdminActionForm`/toast obligatoire — aucun changement de mécanisme.
- `removeCountryLanguage` : inchangé (supprime toute la ligne, langue + devise).

## Détection runtime (`lib/languages/detection.ts`)

Extraction d'un helper partagé pour éviter de dupliquer la résolution IP → pays :

```ts
async function resolveVisitorCountryCode(
  headersList: Headers,
  ttlSeconds: number,
  fallbackCountryCode: string | null,
): Promise<string | null> {
  let country = extractVercelCountryHeader(headersList);
  if (!country) {
    const ip = visitorIpFromHeaders(headersList);
    if (ip) country = await lookupCountry(ip, ttlSeconds);
  }
  return country ?? fallbackCountryCode;
}
```

`detectInterfaceLanguage` est refactorée pour appeler ce helper (comportement identique,
même signature, même valeur de retour — non-régressif). Nouvelle fonction sœur, même
fichier :

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
    // Migration pas encore appliquée : pas de détection possible, valeur par défaut du provider.
  }
  const country = await resolveVisitorCountryCode(headersList, ttlSeconds, fallbackCountryCode);
  if (!country) return null;
  try {
    const [row] = await db
      .select({ currencyCode: countryLanguages.currencyCode })
      .from(countryLanguages)
      .where(eq(countryLanguages.countryCode, country))
      .limit(1);
    const code = row?.currencyCode;
    return creditCurrencies.some((c) => c.code === code) ? (code as CreditCurrencyCode) : null;
  } catch {
    return null;
  }
}
```

Si la détection automatique est désactivée globalement (`localizationSettings.automaticDetectionEnabled = false`),
`detectCurrency` renvoie tout de même une valeur si un pays est résolu par en-tête Vercel —
**ruling** : le flag `automaticDetectionEnabled` du panneau `/admin/settings` gouverne
historiquement la détection de _langue_ uniquement ; par cohérence avec le mécanisme
existant et pour rester une modification additive minimale, on ne le réutilise pas pour la
devise dans cette première itération (aucune UI ne le présente comme couvrant la devise).
Coût si mal jugé : un admin qui désactive la détection de langue s'attend peut-être aussi à
couper la détection de devise — correction triviale (ajouter le même check) si signalé.

## Câblage `DemoProvider` (`app/dashboard/layout.tsx` + `components/banani/DemoProvider.tsx`)

- `app/dashboard/layout.tsx` : `const detectedCurrency = await detectCurrency(await headers());`
  puis nouvelle prop `initialDetectedCurrency={detectedCurrency}` sur `<DemoProvider>`.
- `DemoProvider` : nouveau prop `initialDetectedCurrency: CreditCurrencyCode | null`. Un
  nouveau `useEffect` (miroir exact de celui de `appLanguage`, lignes 201-229) lit
  `musikpro:currency:${persistenceId}` en `localStorage` en priorité, sinon
  `initialDetectedCurrency` si présent dans `creditCurrencies`, sinon `"XOF"` (valeur par
  défaut actuelle, inchangée). Écrit dans `choices.currency` — le sélecteur manuel
  existant (`demo.choose("currency", value)`) continue d'écraser ce choix normalement et
  persiste déjà dans `localStorage` via le mécanisme générique de `choices` (à vérifier au
  moment de l'implémentation — sinon ajouter l'écriture symétrique comme pour
  `appLanguage`).

## i18n

Les codes de devise (XOF, GHS, KES…) et leurs libellés courts (« Franc CFA (XOF) ») sont
des codes ISO/labels techniques, pas du texte narratif — même traitement que les codes
pays existants : **non concernés** par le mécanisme `translate`/`t()` ni par
`translations` jsonb (comme noté par l'exploration initiale, cohérent avec la règle i18n
du CLAUDE.md qui exempte ce type de contenu). Les libellés admin ajoutés (« Langues et
Monnaies », « Association pays, langue et monnaie », le texte du 3ᵉ select) sont du texte
fixe d'interface **admin**, hors périmètre de la règle i18n (qui s'applique au parcours
client, pas au dashboard propriétaire).

## Hors périmètre

- La devise réellement facturée par Chariow (`payment_country_routes`) — cette spec ne
  touche que l'affichage/estimation de prix, pas le routing de paiement.
- Rafraîchissement des taux de change via un fournisseur FX externe — reste une TODO
  déjà documentée dans le code existant, non traitée ici.
- Lier `automaticDetectionEnabled` à la devise (voir ruling ci-dessus).

## Review Focus

1. Un pays présent dans `country_languages` mais dont la `currencyCode` stockée ne
   correspond à aucune entrée de `creditCurrencies` (donnée corrompue ou future
   régression) ne doit pas casser `detectCurrency` ni l'écran crédits — repli sur `null`
   côté détection, sur `"XOF"` côté `DemoProvider`.
2. Un visiteur dont le pays n'est pas dans `country_languages` du tout (ex. pays hors des
   20 seedés) doit recevoir `detectCurrency() === null` proprement, sans exception, et
   `DemoProvider` doit retomber sur `"XOF"`.
3. Modifier uniquement la devise d'une association existante (sans toucher à la langue)
   via le formulaire admin doit préserver la langue déjà choisie pour ce pays — pas
   d'écrasement accidentel par une valeur de formulaire vide.
4. Un visiteur qui a déjà un choix de devise sauvegardé en `localStorage` (retour sur le
   site) ne doit jamais voir ce choix écrasé par la détection au rechargement — même
   garantie que pour la langue.
5. La migration doit s'appliquer proprement sur les 20 lignes existantes sans laisser
   aucune ligne à `currencyCode = 'XOF'` par défaut alors qu'une vraie devise locale
   existe (vérifier après coup qu'aucune ligne n'a été oubliée dans le `CASE`).
