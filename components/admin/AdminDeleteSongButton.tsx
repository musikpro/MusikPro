"use client";

import Icon from "@/components/banani/Icon";

export default function AdminDeleteSongButton({ title, versions }: { title: string; versions: number }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      onClick={(event) => {
        if (
          !window.confirm(
            `Supprimer définitivement la chanson « ${title} »${versions > 1 ? ` et ses ${versions} versions` : ""} ? Elle disparaît du compte du client, de Découvrir, de la page d’accueil et de son lien public. Cette action est irréversible.`,
          )
        )
          event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} />
      Supprimer la chanson
    </button>
  );
}
