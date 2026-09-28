"use server";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { heroAnimatedTexts, heroAnimationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { HERO_ANIMATION_TYPES, HERO_TEXT_SIZES } from "@/lib/hero-animation/types";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

export type HeroAnimatedTextActionState = { ok: boolean; message: string } | null;

const heroAnimatedTextFormSchema = z.object({
  label: z.string().trim().min(1).max(80),
  emoji: z.string().trim().min(1).max(8),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});
const heroAnimatedTextMutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
const toggleHeroAnimatedTextSchema = heroAnimatedTextMutationSchema.extend({ active: z.enum(["true", "false"]) });
const reorderHeroAnimatedTextsSchema = z.object({
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
    .refine((ids) => new Set(ids).size === ids.length, "Chaque texte doit apparaître une seule fois."),
});

function revalidateHeroAnimatedTexts() {
  revalidatePath("/admin/animated-texts");
  revalidatePath("/");
}

export async function createHeroAnimatedText(
  _previous: HeroAnimatedTextActionState,
  formData: FormData,
): Promise<HeroAnimatedTextActionState> {
  const session = await requireAdmin();
  const parsed = heroAnimatedTextFormSchema.parse(Object.fromEntries(formData));
  const id = randomUUID();
  await getServiceDb()
    .insert(heroAnimatedTexts)
    .values({ ...parsed, id, active: parsed.active === "true" });
  await writeAuditLog({
    action: "hero_animated_text.created",
    actorId: session.user.id,
    targetType: "hero_animated_text",
    targetId: id,
    metadata: { label: parsed.label },
  });
  revalidateHeroAnimatedTexts();
  redirect("/admin/animated-texts");
}

export async function updateHeroAnimatedText(
  _previous: HeroAnimatedTextActionState,
  formData: FormData,
): Promise<HeroAnimatedTextActionState> {
  const session = await requireAdmin();
  try {
    const parsed = heroAnimatedTextFormSchema
      .extend({ id: z.string().trim().min(1).max(120) })
      .parse(Object.fromEntries(formData));
    await getServiceDb()
      .update(heroAnimatedTexts)
      .set({
        label: parsed.label,
        emoji: parsed.emoji,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(heroAnimatedTexts.id, parsed.id));
    await writeAuditLog({
      action: "hero_animated_text.updated",
      actorId: session.user.id,
      targetType: "hero_animated_text",
      targetId: parsed.id,
      metadata: { label: parsed.label },
    });
    revalidateHeroAnimatedTexts();
    return { ok: true, message: "Texte animé enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer ce texte.") };
  }
}

export async function toggleHeroAnimatedText(
  _previous: HeroAnimatedTextActionState,
  formData: FormData,
): Promise<HeroAnimatedTextActionState> {
  const session = await requireAdmin();
  try {
    const parsed = toggleHeroAnimatedTextSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true";
    await getServiceDb()
      .update(heroAnimatedTexts)
      .set({ active, updatedAt: new Date() })
      .where(eq(heroAnimatedTexts.id, parsed.id));
    await writeAuditLog({
      action: "hero_animated_text.active.changed",
      actorId: session.user.id,
      targetType: "hero_animated_text",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateHeroAnimatedTexts();
    return { ok: true, message: active ? "Texte activé." : "Texte désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce texte.") };
  }
}

export async function deleteHeroAnimatedText(
  _previous: HeroAnimatedTextActionState,
  formData: FormData,
): Promise<HeroAnimatedTextActionState> {
  const session = await requireAdmin();
  try {
    const parsed = heroAnimatedTextMutationSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(heroAnimatedTexts).where(eq(heroAnimatedTexts.id, parsed.id));
    await writeAuditLog({
      action: "hero_animated_text.deleted",
      actorId: session.user.id,
      targetType: "hero_animated_text",
      targetId: parsed.id,
    });
    revalidateHeroAnimatedTexts();
    return { ok: true, message: "Texte supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce texte.") };
  }
}

const setHeroHeadlineSchema = z.object({
  headline: z.string().trim().min(2).max(120),
});

/** Upserts a single field of the "global" hero_animation_settings row without touching the others. */
async function upsertHeroSettings(patch: Record<string, unknown>, updatedBy: string) {
  await getServiceDb()
    .insert(heroAnimationSettings)
    .values({ id: "global", ...patch, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: heroAnimationSettings.id,
      set: { ...patch, updatedBy, updatedAt: new Date() },
    });
}

export async function setHeroHeadline(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { headline } = setHeroHeadlineSchema.parse(Object.fromEntries(formData));
    await upsertHeroSettings({ headline }, session.user.id);
    await writeAuditLog({
      action: "hero_settings.headline.updated",
      actorId: session.user.id,
      targetType: "hero_animation_settings",
      targetId: "global",
      metadata: { headline },
    });
    revalidateHeroAnimatedTexts();
    return { ok: true, message: "Titre du Hero enregistré." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer le titre du Hero.") };
  }
}

const setHeroAnimationSettingsSchema = z.object({
  animationType: z.enum(HERO_ANIMATION_TYPES),
  textSize: z.enum(HERO_TEXT_SIZES),
});

export async function setHeroAnimationSettings(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { animationType, textSize } = setHeroAnimationSettingsSchema.parse(Object.fromEntries(formData));
    await upsertHeroSettings({ animationType, textSize }, session.user.id);
    await writeAuditLog({
      action: "hero_settings.animation.updated",
      actorId: session.user.id,
      targetType: "hero_animation_settings",
      targetId: "global",
      metadata: { animationType, textSize },
    });
    revalidateHeroAnimatedTexts();
    return { ok: true, message: "Réglages d’animation enregistrés." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer les réglages d’animation.") };
  }
}

export async function reorderHeroAnimatedTexts(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderHeroAnimatedTextsSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: heroAnimatedTexts.id }).from(heroAnimatedTexts);
  const existingIds = new Set(existing.map((row) => row.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des textes a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${heroAnimatedTexts} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${heroAnimatedTexts.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "hero_animated_text.reordered",
    actorId: session.user.id,
    targetType: "hero_animated_text_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidateHeroAnimatedTexts();
}
