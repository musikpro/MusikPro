"use server";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServiceDb } from "@/db";
import { musicGenerationJobs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { renamedVersionTitles, stripVersionSuffix } from "@/lib/ai/song-title";
import { writeAuditLog } from "@/lib/security/audit";
import { renameSongSchema } from "@/lib/validation/song-title";
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
