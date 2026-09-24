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
/**
 * Musicful's official OpenAPI spec documents no parameter for ending/outro/fade-out control,
 * and no seed/diversity parameter for the two auto-generated variants a single request
 * returns — both are entirely up to the model given the free-text `style` it receives. These
 * two directives are the only available lever: they ask for a natural fade-out ending instead
 * of an abrupt stop, and for the pair to diverge musically instead of sounding near-identical.
 * Best-effort prompt guidance, not a guaranteed platform-level control.
 */
const PRODUCTION_DIRECTIVES =
  "Termine la chanson par un outro naturel : la mélodie et les instruments diminuent progressivement (fade-out) sur les dernières secondes, sans coupure brutale. Les deux interprétations générées pour cette demande doivent avoir des mélodies, arrangements et tempos nettement distincts l'un de l'autre, tout en respectant fidèlement ce style musical et ces paroles.";

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
  const withMood = mood ? `${base} — Ambiance : ${mood}` : base;
  return `${withMood} — ${PRODUCTION_DIRECTIVES}`;
}
