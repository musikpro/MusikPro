import "server-only";
import { sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicStyles, occasions } from "@/db/schema";
import type { LyricsGuidance } from "./lyrics-guidance";

/**
 * L'occasion et le style choisis par le client sont les noms français des lignes des catalogues « Occasions » et
 * « Styles musicaux » : on y retrouve les consignes d'écriture rédigées par le propriétaire. Comparaison insensible
 * à la casse SANS joker (ilike interpréterait % et _). Nom inconnu, consigne vide ou colonne pas encore migrée
 * (0083) : chaîne vide, les paroles se génèrent comme avant.
 */
export async function resolveLyricsGuidance(occasionName: string, styleName: string): Promise<LyricsGuidance> {
  const database = getServiceDb();
  const occasion = occasionName.trim();
  const style = styleName.trim();
  try {
    const [occasionRow, styleRow] = await Promise.all([
      occasion
        ? database
            .select({ guidance: occasions.lyricsGuidance })
            .from(occasions)
            .where(sql`lower(${occasions.name}) = lower(${occasion})`)
            .limit(1)
        : Promise.resolve([]),
      style
        ? database
            .select({ guidance: musicStyles.lyricsGuidance })
            .from(musicStyles)
            .where(sql`lower(${musicStyles.name}) = lower(${style})`)
            .limit(1)
        : Promise.resolve([]),
    ]);
    return { occasion: occasionRow[0]?.guidance?.trim() ?? "", style: styleRow[0]?.guidance?.trim() ?? "" };
  } catch {
    return { occasion: "", style: "" };
  }
}
