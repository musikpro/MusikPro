import type { FieldProposal } from "./ai-schema";

export type FieldDraftSnapshot = {
  type: string;
  label: string;
  helpText: string;
  placeholder: string;
  icon: string;
  optionsText: string;
  required: string;
  aiHint: string;
};

export type ProposalDifference = { key: keyof FieldDraftSnapshot; label: string; current: string; proposed: string };

const TYPE_LABELS: Record<string, string> = {
  short_text: "Texte court",
  long_text: "Texte long",
  select: "Liste de choix",
  number: "Nombre",
  date: "Date",
};

/**
 * Champs que « Compléter avec l'IA » modifierait par rapport à ce que le propriétaire a déjà saisi.
 * Sert à lui montrer la différence et à lui laisser garder ses valeurs ou prendre celles de l'IA.
 * Le libellé n'en fait jamais partie (l'IA doit le conserver) ; une valeur identique n'est pas listée.
 */
export function proposalDifferences(
  draft: FieldDraftSnapshot,
  proposal: FieldProposal,
  proposedOptionsText: string,
): ProposalDifference[] {
  const rows: ProposalDifference[] = [
    { key: "type", label: "Type de champ", current: TYPE_LABELS[draft.type] ?? draft.type, proposed: TYPE_LABELS[proposal.type] ?? proposal.type },
    { key: "icon", label: "Icône", current: draft.icon, proposed: proposal.icon || "📝" },
    { key: "placeholder", label: "Texte d’exemple", current: draft.placeholder, proposed: proposal.placeholder },
    { key: "helpText", label: "Aide sous le libellé", current: draft.helpText, proposed: proposal.helpText },
    { key: "optionsText", label: "Choix", current: draft.optionsText, proposed: proposedOptionsText },
    { key: "required", label: "Obligatoire", current: draft.required === "true" ? "Obligatoire" : "Facultatif", proposed: proposal.required ? "Obligatoire" : "Facultatif" },
    { key: "aiHint", label: "Consigne pour l’IA", current: draft.aiHint, proposed: proposal.aiHint },
  ];
  return rows.filter((row) => row.current.trim() !== row.proposed.trim());
}

/**
 * Vrai si l'IA écraserait quelque chose de réel : un champ déjà enregistré, ou des valeurs saisies
 * à la main. Un formulaire neuf où seul le libellé est rempli se préremplit sans confirmation.
 */
export function hasFilledValues(differences: ProposalDifference[], existingField: boolean): boolean {
  if (existingField) return differences.length > 0;
  return differences.some((row) => {
    if (row.key === "type" || row.key === "required") return false;
    if (row.key === "icon") return row.current !== "📝";
    return row.current.trim() !== "";
  });
}
