import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moods } from "@/db/schema";
import { DEFAULT_MOODS, type MoodOption } from "./catalog";

/** Ambiances actives, dans l'ordre choisi par le propriétaire (menu admin « Ambiances »). */
export async function getActiveMoods(options: { demo?: boolean } = {}): Promise<MoodOption[]> {
  try {
    const rows = await db
      .select()
      .from(moods)
      .where(eq(moods.active, true))
      .orderBy(asc(moods.sortOrder), asc(moods.name));
    // La consigne IA (aiHint) reste côté serveur : elle n'est pas renvoyée au navigateur du client.
    return rows.map(({ id, name, slug, description, emoji, translations }) => ({
      id,
      name,
      slug,
      description,
      emoji,
      translations: translations as MoodOption["translations"],
    }));
  } catch (error) {
    if (options.demo) return DEFAULT_MOODS.map(({ aiHint: _aiHint, ...mood }) => mood);
    throw error;
  }
}
