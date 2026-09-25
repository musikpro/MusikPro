import "server-only";
import { z } from "zod";

/**
 * Turns a validation/DB failure into a message an admin can act on, instead of letting it crash
 * the page as an uncaught exception — shared by every admin Server Action that reports its
 * result through `useActionState` (see components/admin/AdminToastProvider.tsx's `useAdminToast`).
 */
export function actionErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof z.ZodError) {
    const first = error.issues[0];
    return first ? `${fallback} (${String(first.path[0] ?? "champ")} : ${first.message})` : fallback;
  }
  if (error instanceof Error && error.message) return `${fallback} (${error.message})`;
  return fallback;
}
