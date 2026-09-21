import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { occasions } from "@/db/schema";
import { DEFAULT_OCCASIONS, type OccasionOption } from "./catalog";

export async function getActiveOccasions(options: { demo?: boolean } = {}): Promise<OccasionOption[]> {
  try {
    const rows = await db
      .select()
      .from(occasions)
      .where(eq(occasions.active, true))
      .orderBy(asc(occasions.sortOrder), asc(occasions.name));

    return rows.map(({ id, name, slug, description, emoji }) => ({ id, name, slug, description, emoji }));
  } catch (error) {
    if (options.demo) return DEFAULT_OCCASIONS;
    throw error;
  }
}
