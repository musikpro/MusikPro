import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { musicStyles } from "@/db/schema";
import { DEFAULT_MUSIC_STYLES, isMusicStyleIcon, isMusicStyleTone, type MusicStyleOption } from "./catalog";

export async function getActiveMusicStyles(options: { demo?: boolean } = {}): Promise<MusicStyleOption[]> {
  if (options.demo) return DEFAULT_MUSIC_STYLES;

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
