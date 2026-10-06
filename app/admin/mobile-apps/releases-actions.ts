"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import { AppReleaseError, deleteRelease, registerAppRelease, setReleasePublished } from "@/lib/app-releases/server";
import { writeAuditLog } from "@/lib/security/audit";
import { registerAppReleaseSchema, releaseIdSchema } from "@/lib/validation/app-releases";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

/** Ce que voient les visiteurs change : tableau de bord, accueil, page de téléchargement. */
function revalidateDownloads() {
  revalidatePath("/admin/mobile-apps");
  revalidatePath("/download");
  revalidatePath("/");
  revalidatePath("/dashboard", "layout");
}

const failure = (error: unknown, fallback: string): AdminActionState =>
  error instanceof AppReleaseError
    ? { ok: false, message: error.message }
    : { ok: false, message: actionErrorMessage(error, fallback) };

/** Enregistre un fichier déjà envoyé au stockage privé : vérification serveur puis création de la version (non publiée). */
export async function registerRelease(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const parsed = registerAppReleaseSchema.parse({
      pathname: formData.get("pathname"),
      version: formData.get("version"),
      build: formData.get("build"),
      notes: formData.get("notes") ?? undefined,
    });
    const release = await registerAppRelease(parsed, session.user.id);
    await writeAuditLog({
      action: "app_release.registered",
      actorId: session.user.id,
      targetType: "app_release",
      targetId: release.id,
      metadata: { platform: release.platform, version: release.version, build: release.build, sha256: release.sha256 },
    });
    revalidateDownloads();
    return {
      ok: true,
      message: `Version ${release.version} (build ${release.build}) vérifiée et enregistrée. Publie-la pour l'offrir au téléchargement.`,
    };
  } catch (error) {
    return failure(error, "Impossible d'enregistrer cette version.");
  }
}

/** Publie une version (les autres sont dépubliées) ou la retire du téléchargement. */
export async function setReleasePublication(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { id } = releaseIdSchema.parse({ id: formData.get("id") });
    const publish = formData.get("publish") === "1";
    const release = await setReleasePublished(id, publish);
    await writeAuditLog({
      action: publish ? "app_release.published" : "app_release.unpublished",
      actorId: session.user.id,
      targetType: "app_release",
      targetId: release.id,
      metadata: { version: release.version, build: release.build },
    });
    revalidateDownloads();
    return {
      ok: true,
      message: publish
        ? `Version ${release.version} publiée : elle est proposée sur la page de téléchargement du site.`
        : `Version ${release.version} retirée du téléchargement.`,
    };
  } catch (error) {
    return failure(error, "Impossible de modifier la publication.");
  }
}

/** Supprime une version non publiée et son fichier. */
export async function removeRelease(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const { id } = releaseIdSchema.parse({ id: formData.get("id") });
    const release = await deleteRelease(id);
    await writeAuditLog({
      action: "app_release.deleted",
      actorId: session.user.id,
      targetType: "app_release",
      targetId: release.id,
      metadata: { version: release.version, build: release.build },
    });
    revalidateDownloads();
    return { ok: true, message: `Version ${release.version} supprimée.` };
  } catch (error) {
    return failure(error, "Impossible de supprimer cette version.");
  }
}
