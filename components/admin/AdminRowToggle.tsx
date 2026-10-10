"use client";

import Icon from "@/components/banani/Icon";

/** Bouton « Détails » commun des lignes repliables (Utilisateurs, Générations). */
export default function AdminRowToggle({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean;
  /** Nom accessible de la ligne, ex. « Ballo Issa ». */
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="admin-row-toggle"
      aria-expanded={expanded}
      aria-label={`${expanded ? "Masquer" : "Afficher"} les détails de ${label}`}
      onClick={onToggle}
    >
      {expanded ? "Masquer les détails" : "Détails"}
      <Icon i="chevron-down" size={16} />
    </button>
  );
}
