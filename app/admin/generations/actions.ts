"use server";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { renamedVersionTitles, stripVersionSuffix } from "@/lib/ai/song-title";
import { writeAuditLog } from "@/lib/security/audit";
import { z } from "zod";
import { listGenerationsPage } from "@/lib/admin/generations";
import { GENERATION_STATUS_FILTERS, type GenerationsPage } from "@/lib/admin/generations-types";
import { getGenerationsPerPage } from "@/lib/settings/admin-display";
import { renameSongSchema, songDiscoverSchema, songJobIdSchema } from "@/lib/validation/song-title";
import { trashSongByJobId } from "@/lib/trash/songs";
import { setSongDiscoverVisibility } from "@/lib/discover/server";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

/**
 * Renomme une chanson : le titre vit sur chaque version (music_generation_jobs.title) et tout l'affichage
 * (dashboard client, Découvrir, landing, téléchargements) le relit de là — on met donc à jour toutes les
 * versions du groupe d'un coup, chacune avec son suffixe « — Version N ».
 */
export async function renameSong(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = renameSongSchema.parse(Object.fromEntries(formData));
    const database = getServiceDb();

    const [job] = await database
      .select({
        id: musicGenerationJobs.id,
        songGroupId: musicGenerationJobs.songGroupId,
        versionLabel: musicGenerationJobs.versionLabel,
        title: musicGenerationJobs.title,
      })
      .from(musicGenerationJobs)
      .where(eq(musicGenerationJobs.id, parsed.jobId))
      .limit(1);
    if (!job) return { ok: false, message: "Chanson introuvable." };

    // Les générations anciennes sans groupe n'ont qu'une version : seule celle-ci est renommée.
    const versions = job.songGroupId
      ? await database
          .select({ id: musicGenerationJobs.id, versionLabel: musicGenerationJobs.versionLabel })
          .from(musicGenerationJobs)
          .where(eq(musicGenerationJobs.songGroupId, job.songGroupId))
          .orderBy(asc(musicGenerationJobs.createdAt))
      : [{ id: job.id, versionLabel: job.versionLabel }];

    const updates = renamedVersionTitles(parsed.title, versions);
    const [first, ...rest] = updates.map((update) =>
      database
        .update(musicGenerationJobs)
        .set({ title: update.title, updatedAt: new Date() })
        .where(eq(musicGenerationJobs.id, update.id)),
    );
    if (!first) return { ok: false, message: "Aucune version à renommer." };
    await database.batch([first, ...rest]);

    await writeAuditLog({
      action: "song.renamed",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: job.songGroupId ?? job.id,
      metadata: {
        from: stripVersionSuffix(job.title ?? ""),
        to: stripVersionSuffix(updates[0]?.title ?? ""),
        versions: updates.length,
      },
    });
    revalidatePath("/admin/generations");
    revalidatePath("/admin/library");
    revalidatePath("/admin/landing-features");
    revalidatePath("/admin/trending");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/");
    return {
      ok: true,
      message: updates.length > 1 ? `Titre mis à jour sur les ${updates.length} versions.` : "Titre mis à jour.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de renommer cette chanson.") };
  }
}

const pageRequestSchema = z.object({
  page: z.number().int().min(1).max(100_000),
  status: z.enum(GENERATION_STATUS_FILTERS),
  query: z.string().trim().max(120),
});

/**
 * Une page de générations à la demande (changement de page, filtre ou recherche sans recharger la page).
 * La taille de page vient du réglage serveur (Paramètres > Général), jamais du navigateur.
 */
export async function fetchGenerationsPage(
  input: z.input<typeof pageRequestSchema>,
): Promise<{ ok: true; data: GenerationsPage } | { ok: false; message: string }> {
  try {
    await requireAdmin();
    const parsed = pageRequestSchema.parse(input);
    const pageSize = await getGenerationsPerPage();
    return { ok: true, data: await listGenerationsPage({ ...parsed, pageSize }) };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de charger les générations.") };
  }
}

function refreshSongPages() {
  revalidatePath("/admin/generations");
  revalidatePath("/admin/library");
  revalidatePath("/admin/landing-features");
  revalidatePath("/admin/trending");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/demo/discover");
  revalidatePath("/");
}

/** Met une chanson (toutes ses versions) à la corbeille : elle disparaît partout et reste restaurable depuis /admin/corbeille. */
export async function deleteSong(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { jobId } = songJobIdSchema.parse(Object.fromEntries(formData));
    const trashed = await trashSongByJobId(jobId, session.user.id);
    if (!trashed) return { ok: false, message: "Chanson introuvable : elle a peut-être déjà été supprimée." };
    await writeAuditLog({
      action: "song.trashed",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: trashed.songKey,
      metadata: { title: stripVersionSuffix(trashed.title ?? ""), versions: trashed.versions },
    });
    refreshSongPages();
    revalidatePath("/admin/corbeille");
    return {
      ok: true,
      message: "Chanson mise à la corbeille : tu peux la restaurer depuis la Corbeille.",
    };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de supprimer cette chanson.") };
  }
}

/** Ajoute une chanson à la page Découvrir des clients, ou l'en retire. */
export async function setSongDiscover(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = songDiscoverSchema.parse(Object.fromEntries(formData));
    const visible = parsed.visible === "true";
    const done = await setSongDiscoverVisibility(parsed.songGroupId, visible);
    if (!done)
      return {
        ok: false,
        message: "Chanson introuvable ou sans propriétaire : impossible de la placer dans Découvrir.",
      };
    await writeAuditLog({
      action: visible ? "discover.song.restored" : "discover.song.removed",
      actorId: session.user.id,
      targetType: "song_group",
      targetId: parsed.songGroupId,
      metadata: { by: "admin", from: "generations" },
    });
    refreshSongPages();
    return { ok: true, message: visible ? "Chanson ajoutée à Découvrir." : "Chanson retirée de Découvrir." };
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, "Impossible de modifier Découvrir pour cette chanson.") };
  }
}
