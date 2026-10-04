import type { CreationDraftData, CreationDraftStep } from "@/lib/validation/creation-draft";

export type CreationDraftStepSummary = {
  id: "story" | "style" | "lyrics" | "checkout";
  done: boolean;
  /** Texte brut tiré du brouillon (occasion, style…) ; vide si rien à montrer. Jamais traduit. */
  detail: string;
};

/**
 * Étapes affichées par l'écran « Reprendre ou recommencer » (Banani) : histoire, style, paroles, finalisation.
 * Pure : dérivée du seul contenu du brouillon, sans lecture de base ni d'horloge.
 */
export function summarizeCreationDraft(data: CreationDraftData): CreationDraftStepSummary[] {
  const { choices, fields } = data;
  const story = fields.story.trim().length > 0;
  const style = choices.genre.trim().length > 0;
  const lyrics = fields.lyrics.trim().length > 0;
  const join = (...parts: string[]) =>
    parts
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" · ");
  return [
    { id: "story", done: story, detail: join(choices.occasion, fields.recipientName) },
    { id: "style", done: style, detail: join(choices.genre, choices.mood) },
    { id: "lyrics", done: lyrics, detail: "" },
    { id: "checkout", done: false, detail: "" },
  ];
}

/** Aperçu court des paroles pour la carte « session en cours » (texte uniquement). */
export function lyricsPreview(lyrics: string, maxLength = 160): string {
  const flat = lyrics.replace(/\s+/g, " ").trim();
  return flat.length <= maxLength ? flat : `${flat.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Étape où ramener l'utilisateur : celle enregistrée, sauf si elle n'a plus de sens (paroles vides
 * alors que l'étape suivante les exige → retour aux paramètres pour les régénérer).
 */
export function resumeStepFor(step: CreationDraftStep, data: CreationDraftData): CreationDraftStep {
  const needsLyrics = step === "lyrics" || step === "lyrics/edit" || step === "pack" || step === "confirm";
  if (needsLyrics && data.fields.lyrics.trim().length === 0) return "parameters";
  return step;
}
