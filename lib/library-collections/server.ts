import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { libraryCollections } from "@/db/schema";
import { DEFAULT_LIBRARY_COLLECTIONS, parseCollectionStyles, type LibraryCollectionOption } from "./catalog";

export async function getPublishedLibraryCollections(): Promise<LibraryCollectionOption[]> {
  try {
    const rows = await db
      .select()
      .from(libraryCollections)
      .where(and(eq(libraryCollections.active, true), eq(libraryCollections.access, "public")))
      .orderBy(asc(libraryCollections.sortOrder), asc(libraryCollections.name));
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      access: "public",
      styles: parseCollectionStyles(row.styles),
      sortOrder: row.sortOrder,
    }));
  } catch {
    return DEFAULT_LIBRARY_COLLECTIONS;
  }
}
