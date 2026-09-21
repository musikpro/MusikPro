"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { occasions } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { isOccasionEmoji } from "@/lib/occasions/catalog";
import { writeAuditLog } from "@/lib/security/audit";

const occasionFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(240),
  emoji: z.string().trim().min(1).max(16).refine(isOccasionEmoji, "Choisis un emoji dans la liste proposée."),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});
const occasionMutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleOccasionSchema = occasionMutationSchema.extend({ active: z.enum(["true", "false"]) });
const reorderOccasionsSchema = z.object({
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
    .refine((ids) => new Set(ids).size === ids.length, "Chaque occasion doit apparaître une seule fois."),
});
function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
function revalidateOccasions() {
  revalidatePath("/admin/occasions");
  revalidatePath("/dashboard/create");
  revalidatePath("/demo/create");
}

export async function createOccasion(formData: FormData) {
  const session = await requireAdmin();
  const parsed = occasionFormSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  const slug = slugify(parsed.name);
  if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
  await getServiceDb()
    .insert(occasions)
    .values({ ...parsed, id, slug, active: parsed.active === "true" });
  await writeAuditLog({
    action: "occasion.created",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: id,
    metadata: { name: parsed.name, slug },
  });
  revalidateOccasions();
  redirect("/admin/occasions");
}
export async function updateOccasion(formData: FormData) {
  const session = await requireAdmin();
  const parsed = occasionFormSchema
    .extend({ id: z.string().trim().min(1).max(120) })
    .parse(Object.fromEntries(formData));
  const slug = slugify(parsed.name);
  if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
  await getServiceDb()
    .update(occasions)
    .set({
      name: parsed.name,
      slug,
      description: parsed.description,
      emoji: parsed.emoji,
      active: parsed.active === "true",
      sortOrder: parsed.sortOrder,
      updatedAt: new Date(),
    })
    .where(eq(occasions.id, parsed.id));
  await writeAuditLog({
    action: "occasion.updated",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: parsed.id,
    metadata: { name: parsed.name, slug },
  });
  revalidateOccasions();
  redirect("/admin/occasions");
}
export async function toggleOccasion(formData: FormData) {
  const session = await requireAdmin();
  const parsed = toggleOccasionSchema.parse(Object.fromEntries(formData));
  const active = parsed.active !== "true";
  await getServiceDb().update(occasions).set({ active, updatedAt: new Date() }).where(eq(occasions.id, parsed.id));
  await writeAuditLog({
    action: "occasion.active.changed",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: parsed.id,
    metadata: { active },
  });
  revalidateOccasions();
}
export async function deleteOccasion(formData: FormData) {
  const session = await requireAdmin();
  const parsed = occasionMutationSchema.parse(Object.fromEntries(formData));
  await getServiceDb().delete(occasions).where(eq(occasions.id, parsed.id));
  await writeAuditLog({
    action: "occasion.deleted",
    actorId: session.user.id,
    targetType: "occasion",
    targetId: parsed.id,
  });
  revalidateOccasions();
}
export async function reorderOccasions(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderOccasionsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: occasions.id }).from(occasions);
  const existingIds = new Set(existing.map((occasion) => occasion.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des occasions a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${occasions} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${occasions.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "occasion.reordered",
    actorId: session.user.id,
    targetType: "occasion_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidateOccasions();
}
