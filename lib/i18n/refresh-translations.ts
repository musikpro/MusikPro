import "server-only";
import { eq, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getServiceDb } from "@/db";
import {
  heroAnimatedTexts,
  heroAnimationSettings,
  moods,
  musicStyles,
  occasionFields,
  occasions,
  phonePrefixes,
  plans,
  recipientRelations,
  uiTranslations,
} from "@/db/schema";
import { creditPlanFeaturesSchema } from "@/lib/credit-plans/catalog";
import { fieldTranslationInput } from "@/lib/occasion-fields/types";
import { TranslationParseError, translateBatch } from "./ai-translate";
import { TRANSLATION_LOCALES, type TranslationLocale } from "./incremental";
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import manifest from "./manifest.json";
import { OVERLAY_TAG } from "./overlay-server";
import { runRefresh, type CatalogSource, type RefreshResult } from "./refresh-core";
import type { CatalogTranslations } from "./translate";
import { loadStoredUiTexts } from "./untranslated-server";

export const MAX_BATCHES_PER_CALL = 5;
export const BATCH_SIZE = 40;
/** Plafond de caractères par lot : au-delà, le JSON renvoyé par l'IA risque d'être tronqué. */
export const MAX_CHARS_PER_BATCH = 6000;
/** Budget de temps avant d'arrêter de lancer des lots (la fonction a maxDuration = 300 s sur la page). */
export const MAX_MILLIS_PER_CALL = 100_000;
const UI_INSERT_CHUNK = 200;

export type Counts = {
  occasions: number;
  moods: number;
  musicStyles: number;
  recipientRelations: number;
  plans: number;
  phonePrefixes: number;
  heroAnimatedTexts: number;
  occasionFields: number;
};

/**
 * Une passe de « Actualiser les traductions » : textes fixes de l'interface (table `ui_translations`)
 * et tables catalogue (colonne `translations`), de façon incrémentale — voir refresh-core.ts.
 */
export async function runTranslationsRefresh(): Promise<RefreshResult & { counts: Counts }> {
  const serviceDb = getServiceDb();

  const [
    occasionRows,
    moodRows,
    styleRows,
    relationRows,
    planRows,
    prefixRows,
    heroTextRows,
    heroSettingsRows,
    occasionFieldRows,
  ] = await Promise.all([
    serviceDb.select().from(occasions),
    serviceDb.select().from(moods),
    serviceDb.select().from(musicStyles),
    serviceDb.select().from(recipientRelations),
    serviceDb.select().from(plans),
    serviceDb.select().from(phonePrefixes),
    serviceDb.select().from(heroAnimatedTexts),
    serviceDb.select().from(heroAnimationSettings),
    serviceDb.select().from(occasionFields),
  ]);

  const asTranslations = (value: unknown) => value as CatalogTranslations | null;

  const sources: CatalogSource[] = [
    {
      key: "occasions",
      rows: occasionRows.map((row) => ({
        id: row.id,
        fields: { name: row.name, description: row.description },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb.update(occasions).set({ translations, updatedAt: new Date() }).where(eq(occasions.id, id));
      },
    },
    {
      key: "moods",
      rows: moodRows.map((row) => ({
        id: row.id,
        fields: { name: row.name, description: row.description },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb.update(moods).set({ translations, updatedAt: new Date() }).where(eq(moods.id, id));
      },
    },
    {
      key: "musicStyles",
      rows: styleRows.map((row) => ({
        id: row.id,
        fields: { name: row.name, description: row.description },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb.update(musicStyles).set({ translations, updatedAt: new Date() }).where(eq(musicStyles.id, id));
      },
    },
    {
      key: "recipientRelations",
      rows: relationRows.map((row) => ({
        id: row.id,
        fields: { name: row.name },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb
          .update(recipientRelations)
          .set({ translations, updatedAt: new Date() })
          .where(eq(recipientRelations.id, id));
      },
    },
    {
      key: "plans",
      rows: planRows.map((row) => {
        const features = creditPlanFeaturesSchema.safeParse(row.features);
        return {
          id: row.id,
          fields: {
            name: row.name,
            description: row.description,
            bonus: features.success ? features.data.bonus : null,
          },
          translations: asTranslations(row.translations),
        };
      }),
      save: async (id, translations) => {
        await serviceDb.update(plans).set({ translations }).where(eq(plans.id, id));
      },
    },
    {
      key: "phonePrefixes",
      rows: prefixRows.map((row) => ({
        id: row.id,
        fields: { countryName: row.countryName },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb
          .update(phonePrefixes)
          .set({ translations, updatedAt: new Date() })
          .where(eq(phonePrefixes.id, id));
      },
    },
    {
      key: "heroAnimatedTexts",
      rows: heroTextRows.map((row) => ({
        id: row.id,
        fields: { label: row.label },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb
          .update(heroAnimatedTexts)
          .set({ translations, updatedAt: new Date() })
          .where(eq(heroAnimatedTexts.id, id));
      },
    },
    {
      key: "heroAnimationSettings",
      rows: heroSettingsRows.map((row) => ({
        id: row.id,
        fields: { headline: row.headline },
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb.update(heroAnimationSettings).set({ translations }).where(eq(heroAnimationSettings.id, id));
      },
    },
    {
      key: "occasionFields",
      rows: occasionFieldRows.map((row) => ({
        id: row.id,
        fields: fieldTranslationInput({
          label: row.label,
          helpText: row.helpText,
          placeholder: row.placeholder,
          options: (row.options ?? []) as Array<{ label: string; emoji: string }>,
        }),
        translations: asTranslations(row.translations),
      })),
      save: async (id, translations) => {
        await serviceDb
          .update(occasionFields)
          .set({ translations, updatedAt: new Date() })
          .where(eq(occasionFields.id, id));
      },
    },
  ];

  const stored = await loadStoredUiTexts(serviceDb);

  const saveUi = async (locale: TranslationLocale, entries: Record<string, string>) => {
    const values = Object.entries(entries).map(([sourceText, translation]) => ({ locale, sourceText, translation }));
    for (let i = 0; i < values.length; i += UI_INSERT_CHUNK) {
      await serviceDb
        .insert(uiTranslations)
        .values(values.slice(i, i + UI_INSERT_CHUNK))
        .onConflictDoUpdate({
          target: [uiTranslations.locale, uiTranslations.sourceText],
          set: { translation: sql`excluded.translation`, updatedAt: new Date() },
        });
    }
  };

  let result: RefreshResult;
  try {
    result = await runRefresh({
      manifest,
      json: { en, es, pt },
      stored,
      sources,
      translateBatch,
      saveUi,
      maxBatches: MAX_BATCHES_PER_CALL,
      batchSize: BATCH_SIZE,
      maxMillis: MAX_MILLIS_PER_CALL,
      maxCharsPerBatch: MAX_CHARS_PER_BATCH,
      isRetryableError: (e) => e instanceof TranslationParseError,
    });
  } finally {
    // Toujours invalider : même en cas d'échec, un saveUi partiel a pu écrire des lignes.
    revalidateTag(OVERLAY_TAG, { expire: 0 });
  }

  const counts: Counts = {
    occasions: occasionRows.length,
    moods: moodRows.length,
    musicStyles: styleRows.length,
    recipientRelations: relationRows.length,
    plans: planRows.length,
    phonePrefixes: prefixRows.length,
    heroAnimatedTexts: heroTextRows.length,
    occasionFields: occasionFieldRows.length,
  };
  return { ...result, counts };
}
