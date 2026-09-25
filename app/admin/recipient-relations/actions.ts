"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { recipientRelations } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const relationFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});
const relationMutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleRelationSchema = relationMutationSchema.extend({ active: z.enum(["true", "false"]) });
const reorderRelationsSchema = z.object({
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
    .refine((ids) => new Set(ids).size === ids.length, "Chaque lien doit apparaître une seule fois."),
});
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
function revalidateRelations() {
  revalidatePath("/admin/recipient-relations");
  revalidatePath("/dashboard/create/recipient");
  revalidatePath("/demo/create/recipient");
}

export async function createRecipientRelation(formData: FormData) {
  const session = await requireAdmin();
  const parsed = relationFormSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  const slug = slugify(parsed.name);
  if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
  await getServiceDb()
    .insert(recipientRelations)
    .values({ id, name: parsed.name, slug, active: parsed.active === "true", sortOrder: parsed.sortOrder });
  await writeAuditLog({
    action: "recipient_relation.created",
    actorId: session.user.id,
    targetType: "recipient_relation",
    targetId: id,
    metadata: { name: parsed.name, slug },
  });
  revalidateRelations();
  redirect("/admin/recipient-relations");
}
export async function updateRecipientRelation(formData: FormData) {
  const session = await requireAdmin();
  const parsed = relationFormSchema
    .extend({ id: z.string().trim().min(1).max(120) })
    .parse(Object.fromEntries(formData));
  const slug = slugify(parsed.name);
  if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
  await getServiceDb()
    .update(recipientRelations)
    .set({
      name: parsed.name,
      slug,
      active: parsed.active === "true",
      sortOrder: parsed.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(recipientRelations.id, parsed.id));
  await writeAuditLog({
    action: "recipient_relation.updated",
    actorId: session.user.id,
    targetType: "recipient_relation",
    targetId: parsed.id,
    metadata: { name: parsed.name, slug },
  });
  revalidateRelations();
  redirect("/admin/recipient-relations");
}
export async function toggleRecipientRelation(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleRelationSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await getServiceDb()
    .update(recipientRelations)
    .set({ active, updatedAt: new Date() })
    .where(eq(recipientRelations.id, parsed.id));
  await writeAuditLog({
    action: "recipient_relation.active.changed",
    actorId: session.user.id,
    targetType: "recipient_relation",
    targetId: parsed.id,
    metadata: { active },
  });
  revalidateRelations();
}
export async function deleteRecipientRelation(formData: FormData) {
  const session = await requireAdmin();
  const parsed = relationMutationSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(recipientRelations).where(eq(recipientRelations.id, parsed.id));
  await writeAuditLog({
    action: "recipient_relation.deleted",
    actorId: session.user.id,
    targetType: "recipient_relation",
    targetId: parsed.id,
  });
  revalidateRelations();
}
export async function reorderRecipientRelations(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderRelationsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: recipientRelations.id }).from(recipientRelations);
  const existingIds = new Set(existing.map((relation) => relation.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des liens a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${recipientRelations} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${recipientRelations.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "recipient_relation.reordered",
    actorId: session.user.id,
    targetType: "recipient_relation_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidateRelations();
}
