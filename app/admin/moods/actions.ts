"use server";
import { randomUUID } from "node:crypto";
import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServiceDb } from "@/db";
import { moods } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { generateMoodAiHint } from "@/lib/ai/catalog-ai-hint";
import {
  moodAiHintRequestSchema,
  moodFormSchema,
  moodIdSchema,
  reorderMoodsSchema,
  slugifyMood,
  toggleMoodSchema,
} from "@/lib/validation/moods";

function revalidateMoods() {
  revalidatePath("/admin/moods");
  revalidatePath("/dashboard/create");
  revalidatePath("/demo/create");
}

/** Le parcours de création exige une ambiance : on refuse de supprimer ou désactiver la dernière ambiance active. */
async function assertAnotherActiveMood(excludedId: string) {
  const [row] = await getServiceDb()
    .select({ total: count() })
    .from(moods)
    .where(and(eq(moods.active, true), ne(moods.id, excludedId)));
  if (!row || row.total < 1) {
    throw new Error("Garde au moins une ambiance active : le parcours de création client en a besoin.");
  }
}

async function assertSlugAvailable(slug: string, exceptId?: string) {
  const [existing] = await getServiceDb().select({ id: moods.id }).from(moods).where(eq(moods.slug, slug)).limit(1);
  if (existing && existing.id !== exceptId) throw new Error("Une ambiance porte déjà ce nom.");
}

export async function createMood(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  const id = randomUUID();
  try {
    const parsed = moodFormSchema.parse(Object.fromEntries(formData));
    const slug = slugifyMood(parsed.name);
    if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
    await assertSlugAvailable(slug);
    await getServiceDb()
      .insert(moods)
      .values({ ...parsed, id, slug, active: parsed.active === "true" });
    await writeAuditLog({
      action: "mood.created",
      actorId: session.user.id,
      targetType: "mood",
      targetId: id,
      metadata: { name: parsed.name, slug },
    });
    revalidateMoods();
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de créer cette ambiance.") };
  }
  redirect(withAdminNotice("/admin/moods", "Ambiance créée."));
}

export async function updateMood(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = moodFormSchema.extend({ id: moodIdSchema.shape.id }).parse(Object.fromEntries(formData));
    const slug = slugifyMood(parsed.name);
    if (!slug) throw new Error("Le nom doit contenir au moins un caractère utilisable.");
    await assertSlugAvailable(slug, parsed.id);
    const active = parsed.active === "true";
    if (!active) await assertAnotherActiveMood(parsed.id);
    await getServiceDb()
      .update(moods)
      .set({
        name: parsed.name,
        slug,
        description: parsed.description,
        emoji: parsed.emoji,
        aiHint: parsed.aiHint,
        active,
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(moods.id, parsed.id));
    await writeAuditLog({
      action: "mood.updated",
      actorId: session.user.id,
      targetType: "mood",
      targetId: parsed.id,
      metadata: { name: parsed.name, slug },
    });
    revalidateMoods();
    return { ok: true, message: "Ambiance enregistrée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette ambiance.") };
  }
}

export async function toggleMood(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = toggleMoodSchema.parse(Object.fromEntries(formData));
    // Le champ `active` du formulaire porte l'état ACTUEL : on inverse.
    const active = parsed.active !== "true";
    if (!active) await assertAnotherActiveMood(parsed.id);
    await getServiceDb().update(moods).set({ active, updatedAt: new Date() }).where(eq(moods.id, parsed.id));
    await writeAuditLog({
      action: "mood.active.changed",
      actorId: session.user.id,
      targetType: "mood",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateMoods();
    return { ok: true, message: active ? "Ambiance activée." : "Ambiance désactivée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier cette ambiance.") };
  }
}

export async function deleteMood(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  const session = await requireAdmin();
  try {
    const parsed = moodIdSchema.parse(Object.fromEntries(formData));
    const [current] = await getServiceDb()
      .select({ active: moods.active })
      .from(moods)
      .where(eq(moods.id, parsed.id))
      .limit(1);
    if (!current) throw new Error("Cette ambiance n’existe plus.");
    if (current.active) await assertAnotherActiveMood(parsed.id);
    await getServiceDb().delete(moods).where(eq(moods.id, parsed.id));
    await writeAuditLog({ action: "mood.deleted", actorId: session.user.id, targetType: "mood", targetId: parsed.id });
    revalidateMoods();
    return { ok: true, message: "Ambiance supprimée." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette ambiance.") };
  }
}

export async function reorderMoods(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderMoodsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: moods.id }).from(moods);
  const existingIds = new Set(existing.map((mood) => mood.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des ambiances a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${moods} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${moods.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "mood.reordered",
    actorId: session.user.id,
    targetType: "mood_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidateMoods();
}

/** Bouton « Suggérer » du formulaire : propose la consigne IA (anglais) d'après le nom ; ne modifie rien en base. */
export async function suggestMoodAiHint(input: {
  name: string;
  description?: string;
}): Promise<{ ok: true; hint: string } | { ok: false; message: string }> {
  const session = await requireAdmin();
  try {
    const parsed = moodAiHintRequestSchema.parse(input);
    return { ok: true, hint: await generateMoodAiHint(parsed, session.user.id) };
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED") {
      return {
        ok: false,
        message: "Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez.",
      };
    }
    if (error instanceof Error && error.message === "CONTENT_BLOCKED_RESULT") {
      return { ok: false, message: "La suggestion a été bloquée par la modération. Reformule le nom." };
    }
    return { ok: false, message: actionErrorMessage(error, "Impossible de suggérer une consigne pour le moment.") };
  }
}
