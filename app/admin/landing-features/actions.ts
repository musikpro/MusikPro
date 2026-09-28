"use server";
import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServiceDb } from "@/db";
import { landingSongFeatures, musicGenerationJobs, songPublications } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { isTrustedImageUrl } from "@/lib/storage/cloudinary";
import { writeAuditLog } from "@/lib/security/audit";
import { LANDING_SONG_FEATURE_SECTIONS, MAX_LANDING_SONG_FEATURES_PER_SECTION } from "@/lib/landing-features/admin";
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

async function songIsPublished(songGroupId: string): Promise<boolean> {
  const [row] = await getServiceDb()
    .select({ status: musicGenerationJobs.status })
    .from(songPublications)
    .innerJoin(musicGenerationJobs, eq(musicGenerationJobs.id, songPublications.jobId))
    .where(eq(songPublications.songGroupId, songGroupId))
    .limit(1);
  return row?.status === "completed";
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
    if (existing.some((row) => row.songGroupId === parsed.songGroupId))
      return { ok: false, message: "Cette chanson est déjà assignée à cette section." };
    if (!(await songIsPublished(parsed.songGroupId)))
      return { ok: false, message: "Cette chanson n’est plus publiée — choisis-en une autre." };

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
  try {
    const session = await requireAdmin();
    const parsed = updateSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();

    const duplicate = await database
      .select({ id: landingSongFeatures.id })
      .from(landingSongFeatures)
      .where(
        and(
          eq(landingSongFeatures.section, parsed.section),
          eq(landingSongFeatures.songGroupId, parsed.songGroupId),
          sql`${landingSongFeatures.id} <> ${parsed.id}`,
        ),
      )
      .limit(1);
    if (duplicate.length) return { ok: false, message: "Cette chanson est déjà assignée à cette section." };
    if (!(await songIsPublished(parsed.songGroupId)))
      return { ok: false, message: "Cette chanson n’est plus publiée — choisis-en une autre." };

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
    return { ok: true, message: "Carte mise à jour." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible d’enregistrer cette carte.") };
  }
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
