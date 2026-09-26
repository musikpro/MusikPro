"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { MUSIC_STYLE_ICONS, MUSIC_STYLE_TONES } from "@/lib/music-styles/catalog";
import { writeAuditLog } from "@/lib/security/audit";

const musicStyleFormSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().min(5).max(240),
  aiDescription: z.string().trim().max(600).optional().default(""),
  icon: z.enum(MUSIC_STYLE_ICONS),
  tone: z.enum(MUSIC_STYLE_TONES),
  active: z.enum(["true", "false"]),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

const musicStyleUpdateSchema = musicStyleFormSchema.extend({ id: z.string().trim().min(1).max(120) });

const styleMutationSchema = z.object({
  id: z.string().trim().min(1).max(120),
});

const toggleMusicStyleSchema = styleMutationSchema.extend({
  active: z.enum(["true", "false"]),
});

export type MusicStyleActionState = { ok: boolean; message: string } | null;

/** Turns a validation/DB failure into a message an admin can act on, instead of letting it crash the page as an uncaught exception. */
function actionErrorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return first ? `${fallback} (${String(first.path[0] ?? "champ")} : ${first.message})` : fallback;
  }
  if (error instanceof Error && error.message) return `${fallback} (${error.message})`;
  return fallback;
}

const reorderMusicStylesSchema = z.object({
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
    .refine((ids) => new Set(ids).size === ids.length, "Chaque style doit apparaître une seule fois."),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function revalidateMusicStyles() {
  revalidatePath("/admin/music-styles");
  revalidatePath("/dashboard/create/genre");
  revalidatePath("/dashboard/create/style");
}

export async function createMusicStyle(
  _previous: MusicStyleActionState,
  formData: FormData,
): Promise<MusicStyleActionState> {
  const session = await requireAdmin();
  try {
    const parsed = musicStyleFormSchema.parse(Object.fromEntries(formData));
    const slug = slugify(parsed.name);
    if (!slug) return { ok: false, message: "Le nom doit contenir au moins un caractère utilisable." };

    const id = randomUUID();
    await getServiceDb()
      .insert(musicStyles)
      .values({
        id,
        slug,
        ...parsed,
        active: parsed.active === "true",
      });

    await writeAuditLog({
      action: "music_style.created",
      actorId: session.user.id,
      targetType: "music_style",
      targetId: id,
      metadata: { name: parsed.name, slug, active: parsed.active === "true" },
    });
    revalidateMusicStyles();
    return { ok: true, message: `Style « ${parsed.name} » créé. Tu peux continuer à en ajouter d'autres.` };
  } catch (error) {
    return {
      ok: false,
      message: actionErrorMessage(error, "Impossible d’enregistrer le style."),
    };
  }
}

export async function updateMusicStyle(
  _previous: MusicStyleActionState,
  formData: FormData,
): Promise<MusicStyleActionState> {
  const session = await requireAdmin();
  try {
    const parsed = musicStyleUpdateSchema.parse(Object.fromEntries(formData));
    const slug = slugify(parsed.name);
    if (!slug) return { ok: false, message: "Le nom doit contenir au moins un caractère utilisable." };

    await getServiceDb()
      .update(musicStyles)
      .set({
        name: parsed.name,
        slug,
        description: parsed.description,
        aiDescription: parsed.aiDescription,
        icon: parsed.icon,
        tone: parsed.tone,
        active: parsed.active === "true",
        sortOrder: parsed.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(musicStyles.id, parsed.id));

    await writeAuditLog({
      action: "music_style.updated",
      actorId: session.user.id,
      targetType: "music_style",
      targetId: parsed.id,
      metadata: { name: parsed.name, slug, active: parsed.active === "true" },
    });
    revalidateMusicStyles();
    revalidatePath(`/admin/music-styles/${parsed.id}`);
    return { ok: true, message: `Style « ${parsed.name} » mis à jour.` };
  } catch (error) {
    return {
      ok: false,
      message: actionErrorMessage(error, "Impossible d’enregistrer les modifications."),
    };
  }
}

export async function toggleMusicStyle(
  _previous: MusicStyleActionState,
  formData: FormData,
): Promise<MusicStyleActionState> {
  const session = await requireAdmin();
  try {
    const parsed = toggleMusicStyleSchema.parse(Object.fromEntries(formData));
    const active = parsed.active !== "true";
    await getServiceDb()
      .update(musicStyles)
      .set({ active, updatedAt: new Date() })
      .where(eq(musicStyles.id, parsed.id));
    await writeAuditLog({
      action: "music_style.active.changed",
      actorId: session.user.id,
      targetType: "music_style",
      targetId: parsed.id,
      metadata: { active },
    });
    revalidateMusicStyles();
    return { ok: true, message: active ? "Style activé." : "Style désactivé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier ce style.") };
  }
}

export async function deleteMusicStyle(
  _previous: MusicStyleActionState,
  formData: FormData,
): Promise<MusicStyleActionState> {
  const session = await requireAdmin();
  try {
    const parsed = styleMutationSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(musicStyles).where(eq(musicStyles.id, parsed.id));
    await writeAuditLog({
      action: "music_style.deleted",
      actorId: session.user.id,
      targetType: "music_style",
      targetId: parsed.id,
    });
    revalidateMusicStyles();
    return { ok: true, message: "Style supprimé." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer ce style.") };
  }
}

export async function reorderMusicStyles(formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderMusicStylesSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database.select({ id: musicStyles.id }).from(musicStyles);
  const existingIds = new Set(existing.map((style) => style.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id))) {
    throw new Error("La liste des styles a changé. Recharge la page avant de recommencer.");
  }

  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(sql`
    update ${musicStyles}
    set
      sort_order = ordered.sort_order,
      updated_at = now()
    from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer)
    where ${musicStyles.id} = ordered.id
  `);
  await writeAuditLog({
    action: "music_style.reordered",
    actorId: session.user.id,
    targetType: "music_style_catalog",
    targetId: "global",
    metadata: { order },
  });
  revalidateMusicStyles();
}
