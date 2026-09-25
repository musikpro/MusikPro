"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { libraryCollections } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";

export type LibraryCollectionActionState = { ok: boolean; message: string } | null;

const baseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(5).max(280),
  access: z.enum(["public", "private"]),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
  styles: z.array(z.string().trim().min(1).max(60)).max(30),
});
const idSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleSchema = idSchema.extend({ active: z.enum(["true", "false"]) });
const reorderSchema = z.object({
  order: z
    .string()
    .max(30000)
    .transform((value, context) => {
      try {
        return JSON.parse(value) as unknown;
      } catch {
        context.addIssue({ code: "custom", message: "Ordre invalide." });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(200))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque collection doit apparaître une seule fois."),
});

function payload(formData: FormData) {
  return baseSchema.parse({ ...Object.fromEntries(formData), styles: formData.getAll("styles") });
}
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}
function refresh() {
  revalidatePath("/admin/library");
  revalidatePath("/dashboard/discover");
  revalidatePath("/demo/discover");
}

export async function createLibraryCollection(
  _previous: LibraryCollectionActionState,
  formData: FormData,
): Promise<LibraryCollectionActionState> {
  const session = await requireAdmin();
  const parsed = payload(formData);
  const id = randomUUID();
  const slug = slugify(parsed.name);
  if (!slug) throw new Error("Le nom de la collection est invalide.");
  await getServiceDb()
    .insert(libraryCollections)
    .values({ ...parsed, id, slug, active: parsed.active === "true" });
  await writeAuditLog({
    action: "library_collection.created",
    actorId: session.user.id,
    targetType: "library_collection",
    targetId: id,
    metadata: { name: parsed.name, access: parsed.access },
  });
  refresh();
  redirect("/admin/library");
}
export async function updateLibraryCollection(
  _previous: LibraryCollectionActionState,
  formData: FormData,
): Promise<LibraryCollectionActionState> {
  const session = await requireAdmin();
  try {
    const id = idSchema.parse(Object.fromEntries(formData)).id;
    const parsed = payload(formData);
    const slug = slugify(parsed.name);
    if (!slug) throw new Error("Le nom de la collection est invalide.");
    await getServiceDb()
      .update(libraryCollections)
      .set({
        name: parsed.name,
        slug,
        description: parsed.description,
        access: parsed.access,
        active: parsed.active === "true",
        styles: parsed.styles,
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(libraryCollections.id, id));
    await writeAuditLog({
      action: "library_collection.updated",
      actorId: session.user.id,
      targetType: "library_collection",
      targetId: id,
      metadata: { name: parsed.name, access: parsed.access },
    });
    refresh();
    return { ok: true, message: "Collection enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette collection.") };
  }
}
export async function toggleLibraryCollection(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await getServiceDb()
    .update(libraryCollections)
    .set({ active, updatedAt: new Date() })
    .where(eq(libraryCollections.id, parsed.id));
  await writeAuditLog({
    action: "library_collection.active.changed",
    actorId: session.user.id,
    targetType: "library_collection",
    targetId: parsed.id,
    metadata: { active },
  });
  refresh();
}
export async function deleteLibraryCollection(formData: FormData) {
  const session = await requireAdmin();
  const { id } = idSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(libraryCollections).where(eq(libraryCollections.id, id));
  await writeAuditLog({
    action: "library_collection.deleted",
    actorId: session.user.id,
    targetType: "library_collection",
    targetId: id,
  });
  refresh();
}
export async function reorderLibraryCollections(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: libraryCollections.id }).from(libraryCollections);
  const ids = new Set(existing.map((row) => row.id));
  if (order.length !== ids.size || order.some((id) => !ids.has(id)))
    throw new Error("La liste des collections a changé. Recharge la page.");
  const rows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${libraryCollections} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${rows}::jsonb) as ordered(id text, sort_order integer) where ${libraryCollections.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "library_collection.reordered",
    actorId: session.user.id,
    targetType: "library_collection_catalog",
    targetId: "global",
    metadata: { order },
  });
  refresh();
}
