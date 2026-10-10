"use client";

import Icon from "@/components/banani/Icon";

export default function AdminDeleteUserButton({ email }: { email: string }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      onClick={(event) => {
        if (
          !window.confirm(
            `Mettre le compte « ${email} » à la corbeille ? Il est suspendu immédiatement (plus de connexion) et disparaît de la liste. Tu pourras le restaurer depuis la Corbeille jusqu’à sa suppression définitive automatique.`,
          )
        )
          event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} />
      Mettre à la corbeille
    </button>
  );
}
