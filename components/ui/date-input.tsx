"use client";
import type { InputHTMLAttributes } from "react";

/**
 * Champ date dont le sélecteur natif s'ouvre au clic sur n'importe quelle partie du champ, pas seulement sur
 * l'icône du calendrier. `showPicker()` exige un geste utilisateur (le clic) ; s'il est indisponible ou refusé,
 * le comportement natif du navigateur reste inchangé.
 */
export function DateInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { onClick, ...rest } = props;
  return (
    <input
      {...rest}
      type="date"
      onClick={(event) => {
        onClick?.(event);
        try {
          event.currentTarget.showPicker?.();
        } catch {
          // Déjà ouvert ou non autorisé : on laisse le navigateur gérer.
        }
      }}
    />
  );
}
