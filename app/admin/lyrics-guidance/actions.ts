"use server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { generateLyricsGuidance } from "@/lib/ai/lyrics-guidance-suggest";
import { actionErrorMessage } from "@/lib/admin/action-state";

const suggestSchema = z.object({
  kind: z.enum(["occasion", "style"]),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(600).optional().default(""),
});

/** Boutons « Suggérer / Régénérer » des consignes paroles (occasions et styles) : propose un texte, ne modifie rien en base. */
export async function suggestLyricsGuidance(
  input: z.input<typeof suggestSchema>,
): Promise<{ ok: true; text: string } | { ok: false; message: string }> {
  const session = await requireAdmin();
  try {
    const parsed = suggestSchema.parse(input);
    return { ok: true, text: await generateLyricsGuidance(parsed, session.user.id) };
  } catch (error) {
    if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED")
      return {
        ok: false,
        message: "Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez.",
      };
    if (error instanceof Error && error.message === "CONTENT_BLOCKED_RESULT")
      return {
        ok: false,
        message: "La suggestion a été bloquée par la modération. Reformule le nom ou la description.",
      };
    return { ok: false, message: actionErrorMessage(error, "Impossible de suggérer une consigne pour le moment.") };
  }
}
