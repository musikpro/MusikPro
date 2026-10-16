import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cachedCatalog } from "@/lib/catalog-cache/cached";
import { musicStyles } from "@/db/schema";
import { DEFAULT_MUSIC_STYLES, isMusicStyleIcon, isMusicStyleTone, type MusicStyleOption } from "./catalog";

/** Lecture en base ; lève en cas d'erreur (jamais mise en cache, voir cachedCatalog). */
async function loadActiveMusicStyles(): Promise<MusicStyleOption[]> {
  const rows = await db
    .select()
    .from(musicStyles)
    .where(eq(musicStyles.active, true))
    .orderBy(asc(musicStyles.sortOrder), asc(musicStyles.name));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: isMusicStyleIcon(row.icon) ? row.icon : "music-2",
    tone: isMusicStyleTone(row.tone) ? row.tone : "orange",
    translations: row.translations as MusicStyleOption["translations"],
  }));
}

/** Catalogue actif, en cache jusqu'à la prochaine modification admin (tag « catalog:music-styles »). */
export async function getActiveMusicStyles(options: { demo?: boolean } = {}): Promise<MusicStyleOption[]> {
  if (options.demo) return DEFAULT_MUSIC_STYLES;

  try {
    return await cachedCatalog("musicStyles", loadActiveMusicStyles);
  } catch {
    return DEFAULT_MUSIC_STYLES;
  }
}
