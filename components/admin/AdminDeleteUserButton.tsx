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
            `Supprimer définitivement le compte « ${email} » ? Cette action est irréversible et retire l’accès, l’abonnement et les crédits liés à ce compte.`,
          )
        )
          event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} />
      Supprimer
    </button>
  );
}
