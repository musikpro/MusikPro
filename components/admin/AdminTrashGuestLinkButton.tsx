"use client";

import Icon from "@/components/banani/Icon";

/** Bouton « Supprimer » d'un lien invité : il l'envoie à la corbeille (restaurable) après confirmation. */
export default function AdminTrashGuestLinkButton({
  label,
  variant = "button",
}: {
  label: string;
  variant?: "button" | "menu";
}) {
  return (
    <button
      type="submit"
      role={variant === "menu" ? "menuitem" : undefined}
      className={variant === "menu" ? "admin-row-menu-item is-danger" : "admin-style-delete"}
      onClick={(event) => {
        if (
          !window.confirm(
            `Mettre le lien « ${label} » à la corbeille ? Il cessera de fonctionner tout de suite ; tu pourras le restaurer depuis la Corbeille.`,
          )
        )
          event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
