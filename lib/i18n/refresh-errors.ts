import { actionErrorMessage } from "@/lib/admin/action-state";

/** Message lisible pour l'admin (la production masque les messages des erreurs levées par une Server Action). */
export function describeRefreshError(error: unknown, translated: number): string {
  if (error instanceof Error && error.message === "AI_PROVIDER_NOT_CONFIGURED") {
    return "Aucun fournisseur IA n’est configuré. Enregistrez sa clé dans Fournisseurs IA, puis réessayez.";
  }
  if (error instanceof Error && error.message === "RATE_LIMITED") {
    return "Trop d’actualisations. Réessaie dans une heure.";
  }
  const base = actionErrorMessage(error, "La mise à jour des traductions a échoué.");
  return translated > 0 ? `${base} (${translated} textes déjà enregistrés, relance pour continuer).` : base;
}
