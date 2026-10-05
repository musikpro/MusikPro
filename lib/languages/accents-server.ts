import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { languageAccents, languages, musicStyleAccents, musicStyles } from "@/db/schema";

/**
 * Consigne d'accent (anglais) liée au couple style × langue choisis par le client, ou « » s'il n'y en a pas.
 * Le client ne voit jamais ces variantes : seule la consigne part vers Musicful (voir buildVocalHint). Comparaisons
 * insensibles à la casse SANS joker (valeurs saisies par le client). Toute erreur de lecture → « » : la génération
 * continue exactement comme avant l'existence des accents.
 */
export async function resolveAccentHint(genreName: string, language: string): Promise<string> {
  const genre = genreName.trim();
  const lang = language.trim();
  if (!genre || !lang) return "";
  try {
    const database = getServiceDb();
    const [row] = await database
      .select({ aiHint: languageAccents.aiHint })
      .from(musicStyleAccents)
      .innerJoin(musicStyles, eq(musicStyles.id, musicStyleAccents.styleId))
      .innerJoin(languageAccents, eq(languageAccents.id, musicStyleAccents.accentId))
      .innerJoin(languages, eq(languages.code, musicStyleAccents.languageCode))
      .where(
        and(
          sql`lower(${musicStyles.name}) = lower(${genre})`,
          sql`(lower(${languages.name}) = lower(${lang}) or lower(${languages.nativeName}) = lower(${lang}))`,
          eq(languageAccents.active, true),
        ),
      )
      .limit(1);
    return row?.aiHint?.trim() ?? "";
  } catch {
    return "";
  }
}
