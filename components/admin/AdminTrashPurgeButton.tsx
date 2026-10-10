"use client";

import Icon from "@/components/banani/Icon";

/** Bouton « Supprimer définitivement » de la Corbeille : demande une confirmation avant d'envoyer le formulaire. */
export default function AdminTrashPurgeButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      onClick={(event) => {
        if (
          !window.confirm(
            `Supprimer définitivement « ${label} » ? Cette action est irréversible : il ne pourra plus être restauré.`,
          )
        )
          event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} />
      Supprimer définitivement
    </button>
  );
}
