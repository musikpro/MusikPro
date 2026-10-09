"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { actionErrorMessage } from "@/lib/admin/action-state";
import {
  activateVersion,
  approveVersion,
  checkForUpdates,
  finishProbe,
  rollbackVersion,
  validateVersion,
  type VersionActionResult,
} from "@/lib/ai/audio-providers/replicate-versions";
import {
  replicateVersionActivateSchema,
  replicateVersionRollbackSchema,
  replicateVersionTargetSchema,
  replicateVersionValidateSchema,
} from "@/lib/validation/replicate-versions";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";

/**
 * Owner-only Server Actions of the ACE-Step version manager (skill Replicate-MusikPro-MP3 v1.1.0 §16). Every one
 * re-checks the admin session and re-validates its input with Zod; none of them can be reached by a client.
 */
async function run(
  fallback: string,
  task: (actorId: string) => Promise<VersionActionResult>,
): Promise<AdminActionState> {
  try {
    const session = await requireAdmin();
    const result = await task(session.user.id);
    revalidatePath("/admin/ai-providers/audio");
    return result;
  } catch (error) {
    return { ok: false, message: actionErrorMessage(error, fallback) };
  }
}

export async function checkReplicateVersions(
  _previous: AdminActionState,
  _formData: FormData,
): Promise<AdminActionState> {
  return run("Impossible de vérifier les versions.", (actorId) => checkForUpdates(actorId));
}

export async function validateReplicateVersion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return run("Impossible de tester la version.", (actorId) => {
    const parsed = replicateVersionValidateSchema.parse({
      version: formData.get("version"),
      runPaidProbe: formData.get("runPaidProbe") === "on",
    });
    return validateVersion(parsed.version, actorId, { runPaidProbe: parsed.runPaidProbe });
  });
}

export async function finishReplicateProbe(_previous: AdminActionState, formData: FormData): Promise<AdminActionState> {
  return run("Impossible de lire le résultat du test.", (actorId) =>
    finishProbe(replicateVersionTargetSchema.parse(Object.fromEntries(formData)).version, actorId),
  );
}

export async function approveReplicateVersion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return run("Impossible d’approuver la version.", (actorId) =>
    approveVersion(replicateVersionTargetSchema.parse(Object.fromEntries(formData)).version, actorId),
  );
}

export async function activateReplicateVersion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return run("Impossible d’activer la version.", (actorId) => {
    const parsed = replicateVersionActivateSchema.parse(Object.fromEntries(formData));
    return activateVersion(parsed.version, parsed.expectedActive, actorId);
  });
}

export async function rollbackReplicateVersion(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  return run("Impossible d’effectuer le retour arrière.", (actorId) =>
    rollbackVersion(replicateVersionRollbackSchema.parse(Object.fromEntries(formData)).expectedActive, actorId),
  );
}
