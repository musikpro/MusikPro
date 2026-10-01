import "server-only";
import { eq, ilike, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { moods, musicStyles, occasions } from "@/db/schema";
import { buildMoodText, buildStylePrompt } from "./style-prompt-builder";

export { buildMoodText, buildStylePrompt, buildVocalHint, MUSICFUL_STYLE_MAX_LENGTH } from "./style-prompt-builder";

/**
 * Musicful's `style` field is free text with no controlled vocabulary — a bare genre name
 * like "Zouglou" gives its model very little to work with, and it can drift toward a more
 * generic genre it has more training data for. The admin's music-style catalog has a curated
 * `aiDescription` per style written specifically to guide the generation AI (rhythm,
 * instrumentation, tempo, vocal codes). Only that field is ever sent here — the client-facing
 * `description` is deliberately excluded (it's marketing copy for the song-creation screen, not
 * production guidance, and must never leak into the Musicful prompt). Styles with no
 * `aiDescription` yet simply fall back to the bare genre name, as they always did before this
 * field existed. This looks it up live for whatever genre name the client submitted, so every
 * current and future catalog style benefits automatically — nothing here is hardcoded per style.
 */
export async function resolveStylePrompt(
  genreName: string,
  mood: string,
  strictStyleAdherence: boolean,
  occasion = "",
  vocalHint = "",
): Promise<string> {
  const database = getServiceDb();
  const [exact] = await database
    .select({ aiDescription: musicStyles.aiDescription })
    .from(musicStyles)
    .where(eq(musicStyles.name, genreName))
    .limit(1);
  const [fuzzy] = exact
    ? []
    : await database
        .select({ aiDescription: musicStyles.aiDescription })
        .from(musicStyles)
        .where(ilike(musicStyles.name, genreName))
        .limit(1);
  const description = (exact ?? fuzzy)?.aiDescription?.trim();
  return buildStylePrompt(
    genreName,
    description,
    await resolveMoodText(mood),
    strictStyleAdherence,
    await resolveOccasionHint(occasion),
    vocalHint,
  );
}

/**
 * L'ambiance choisie par le client est le nom français d'une ligne du catalogue « Ambiances » : si le
 * propriétaire y a rédigé une consigne IA, elle est envoyée à Musicful avec le nom (jamais montrée au client).
 * Ambiance inconnue (supprimée entre-temps) ou sans consigne : le nom seul, comme avant.
 */
async function resolveMoodText(mood: string): Promise<string> {
  const name = mood.trim();
  if (!name) return "";
  // Comparaison insensible à la casse SANS joker (ilike interpréterait % et _ saisis par le client).
  const [row] = await getServiceDb()
    .select({ aiHint: moods.aiHint })
    .from(moods)
    .where(sql`lower(${moods.name}) = lower(${name})`)
    .limit(1);
  return buildMoodText(name, row?.aiHint);
}

/**
 * L'occasion choisie par le client est le nom français d'une ligne du catalogue « Occasions » : seule la consigne
 * IA (anglais) rédigée par le propriétaire est envoyée à Musicful, jamais le nom. Sans consigne (ou occasion
 * inconnue) : rien n'est ajouté — le rédacteur de paroles et le titre continuent d'utiliser le nom français.
 */
async function resolveOccasionHint(occasion: string): Promise<string> {
  const name = occasion.trim();
  if (!name) return "";
  const [row] = await getServiceDb()
    .select({ aiHint: occasions.aiHint })
    .from(occasions)
    .where(sql`lower(${occasions.name}) = lower(${name})`)
    .limit(1);
  return row?.aiHint?.trim() ?? "";
}
