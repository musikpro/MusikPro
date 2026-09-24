import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { recipientRelations } from "@/db/schema";
import { DEFAULT_RECIPIENT_RELATIONS, type RecipientRelationOption } from "./catalog";

export async function getActiveRecipientRelations(options: { demo?: boolean } = {}): Promise<RecipientRelationOption[]> {
  try {
    const rows = await db
      .select()
      .from(recipientRelations)
      .where(eq(recipientRelations.active, true))
      .orderBy(asc(recipientRelations.sortOrder), asc(recipientRelations.name));

    return rows.map(({ id, name, slug }) => ({ id, name, slug }));
  } catch (error) {
    if (options.demo) return DEFAULT_RECIPIENT_RELATIONS;
    throw error;
  }
}
