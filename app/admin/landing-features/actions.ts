"use server";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { landingSongFeatures } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { withAdminNotice } from "@/lib/admin/notice-redirect";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";
import { writeAuditLog } from "@/lib/security/audit";
import {
  LANDING_SONG_FEATURE_SECTIONS,
  LANDING_SONG_FEATURE_SECTION_LABELS,
  MAX_LANDING_SONG_FEATURES_PER_SECTION,
  type LandingSongFeatureSection,
} from "@/lib/landing-features/admin";
import { getGeneratedSongOptionById } from "@/lib/trending/admin";
import { publishSongGroup } from "@/lib/ai/songs";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

const sectionSchema = z.enum(LANDING_SONG_FEATURE_SECTIONS);
const coverUrlOverrideSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isTrustedImageUrl(value), "Image invalide.");

const createSchema = z.object({
  section: sectionSchema,
  songGroupId: z.string().trim().min(1).max(120),
  coverUrlOverride: coverUrlOverrideSchema,
});
const updateSchema = createSchema.extend({ id: z.string().trim().min(1).max(120) });
const mutationSchema = z.object({ id: z.string().trim().min(1).max(120) });
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
    .pipe(z.array(z.string().trim().min(1).max(120)).min(1).max(MAX_LANDING_SONG_FEATURES_PER_SECTION))
    .refine((ids) => new Set(ids).size === ids.length, "Chaque carte doit apparaître une seule fois."),
});

function revalidateLandingFeatures() {
  revalidatePath("/admin/landing-features");
  revalidatePath("/");
}

/**
 * The songGroupId picked here can come from any completed generation, not only an
 * already-published one (see lib/trending/admin.ts's listRecentGeneratedSongsForAdmin) — both
 * the admin grid and the public landing page INNER JOIN against song_publications, so publish it
 * now (idempotent — a no-op if it's already published) rather than rejecting the pick.
 */
async function publishPickedSong(songGroupId: string): Promise<void> {
  const option = await getGeneratedSongOptionById(songGroupId);
  if (!option) throw new Error("Chanson introuvable ou non terminée.");
  await publishSongGroup(option.userId, option.songGroupId, option.jobId);
}

function songAlreadyUsedMessage(section: string) {
  const label = LANDING_SONG_FEATURE_SECTION_LABELS[section as LandingSongFeatureSection] ?? section;
  return `Cette chanson est déjà ajoutée dans « ${label} » (une chanson n’est utilisable qu’une fois, avec sa version 1 et sa version 2).`;
}

/** A song (both of its versions share one songGroupId) can feature only once: returns the section already using it, if any. */
async function findSectionUsingSong(songGroupId: string, excludeId?: string): Promise<string | null> {
  const rows = await getServiceDb()
    .select({ section: landingSongFeatures.section })
    .from(landingSongFeatures)
    .where(
      excludeId
        ? and(eq(landingSongFeatures.songGroupId, songGroupId), sql`${landingSongFeatures.id} <> ${excludeId}`)
        : eq(landingSongFeatures.songGroupId, songGroupId),
    )
    .limit(1);
  return rows[0]?.section ?? null;
}

export async function createLandingSongFeature(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = createSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();

    const existing = await database
      .select({ id: landingSongFeatures.id, songGroupId: landingSongFeatures.songGroupId, sortOrder: landingSongFeatures.sortOrder })
      .from(landingSongFeatures)
      .where(eq(landingSongFeatures.section, parsed.section));
    if (existing.length >= MAX_LANDING_SONG_FEATURES_PER_SECTION)
      return { ok: false, message: `Cette section affiche déjà ${MAX_LANDING_SONG_FEATURES_PER_SECTION} cartes au maximum.` };
    const usedIn = await findSectionUsingSong(parsed.songGroupId);
    if (usedIn) return { ok: false, message: songAlreadyUsedMessage(usedIn) };
    await publishPickedSong(parsed.songGroupId);

    const nextSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 10;
    const id = randomUUID();
    await database.insert(landingSongFeatures).values({
      id,
      section: parsed.section,
      songGroupId: parsed.songGroupId,
      coverUrlOverride: parsed.coverUrlOverride,
      sortOrder: nextSortOrder,
      updatedBy: session.user.id,
    });
    await writeAuditLog({
      action: "landing_song_feature.created",
      actorId: session.user.id,
      targetType: "landing_song_feature",
      targetId: id,
      metadata: { section: parsed.section, songGroupId: parsed.songGroupId },
    });
    revalidateLandingFeatures();
    return { ok: true, message: "Carte ajoutée à la landing page." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’ajouter cette carte.") };
  }
}

export async function updateLandingSongFeature(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  let redirectTo: string;
  try {
    const session = await requireAdmin();
    const parsed = updateSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();

    const [current] = await database
      .select({ songGroupId: landingSongFeatures.songGroupId })
      .from(landingSongFeatures)
      .where(eq(landingSongFeatures.id, parsed.id))
      .limit(1);
    // Editing only the cover of a card whose song already overlaps (older data) stays allowed.
    if (current?.songGroupId !== parsed.songGroupId) {
      const usedIn = await findSectionUsingSong(parsed.songGroupId, parsed.id);
      if (usedIn) return { ok: false, message: songAlreadyUsedMessage(usedIn) };
    }
    await publishPickedSong(parsed.songGroupId);

    await database
      .update(landingSongFeatures)
      .set({
        songGroupId: parsed.songGroupId,
        coverUrlOverride: parsed.coverUrlOverride,
        updatedBy: session.user.id,
        updatedAt: new Date(),
      })
      .where(eq(landingSongFeatures.id, parsed.id));
    await writeAuditLog({
      action: "landing_song_feature.updated",
      actorId: session.user.id,
      targetType: "landing_song_feature",
      targetId: parsed.id,
      metadata: { section: parsed.section, songGroupId: parsed.songGroupId },
    });
    revalidateLandingFeatures();
    redirectTo = withAdminNotice(`/admin/landing-features?tab=${parsed.section}`, "Carte mise à jour.");
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette carte.") };
  }
  // Back to the list once saved (redirect() throws, so it stays outside the try/catch).
  redirect(redirectTo);
}

export async function deleteLandingSongFeature(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = mutationSchema.parse(Object.fromEntries(formData));
    await getServiceDb().delete(landingSongFeatures).where(eq(landingSongFeatures.id, parsed.id));
    await writeAuditLog({
      action: "landing_song_feature.deleted",
      actorId: session.user.id,
      targetType: "landing_song_feature",
      targetId: parsed.id,
    });
    revalidateLandingFeatures();
    return { ok: true, message: "Carte retirée de la landing page." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de retirer cette carte.") };
  }
}

async function reorderSection(section: "showcase" | "library", formData: FormData) {
  const session = await requireAdmin();
  const { order } = reorderSchema.parse(Object.fromEntries(formData));
  const database = getServiceDb();
  const existing = await database
    .select({ id: landingSongFeatures.id })
    .from(landingSongFeatures)
    .where(eq(landingSongFeatures.section, section));
  const existingIds = new Set(existing.map((row) => row.id));
  if (order.length !== existingIds.size || order.some((id) => !existingIds.has(id)))
    throw new Error("La liste des cartes a changé. Recharge la page avant de recommencer.");
  const orderedRows = JSON.stringify(order.map((id, index) => ({ id, sort_order: (index + 1) * 10 })));
  await database.execute(
    sql`update ${landingSongFeatures} set sort_order = ordered.sort_order, updated_at = now() from jsonb_to_recordset(${orderedRows}::jsonb) as ordered(id text, sort_order integer) where ${landingSongFeatures.id} = ordered.id`,
  );
  await writeAuditLog({
    action: "landing_song_feature.reordered",
    actorId: session.user.id,
    targetType: "landing_song_feature_section",
    targetId: section,
    metadata: { order },
  });
  revalidateLandingFeatures();
}

export const reorderLandingShowcaseFeatures = async (formData: FormData) => reorderSection("showcase", formData);
export const reorderLandingLibraryFeatures = async (formData: FormData) => reorderSection("library", formData);
