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
            `Mettre la chanson « ${title} »${versions > 1 ? ` et ses ${versions} versions` : ""} à la corbeille ? Elle disparaît du compte du client, de Découvrir, de la page d’accueil et de son lien public, mais tu peux la restaurer depuis la Corbeille jusqu’à sa suppression automatique.`,
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
