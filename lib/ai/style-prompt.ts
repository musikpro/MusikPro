import "server-only";
import { eq, ilike } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";

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
export async function resolveStylePrompt(genreName: string, mood: string, strictStyleAdherence: boolean): Promise<string> {
  const database = getServiceDb();
  const [exact] = await database.select({ aiDescription: musicStyles.aiDescription }).from(musicStyles).where(eq(musicStyles.name, genreName)).limit(1);
  const [fuzzy] = exact ? [] : await database.select({ aiDescription: musicStyles.aiDescription }).from(musicStyles).where(ilike(musicStyles.name, genreName)).limit(1);
  const description = (exact ?? fuzzy)?.aiDescription?.trim();

  let base = genreName;
  if (description) {
    base = strictStyleAdherence
      ? `${genreName} (${description}). Respecte fidèlement les codes rythmiques, instrumentaux et vocaux authentiques de ce style musical précis, sans dériver vers un genre plus générique.`
      : `${genreName} — ${description}`;
  }
  return mood ? `${base} — Ambiance : ${mood}` : base;
}
