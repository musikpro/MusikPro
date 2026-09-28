"use client";
import Icon from "@/components/banani/Icon";

export default function AdminDeleteMediaAssetButton({ pending = false }: { pending?: boolean }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("Supprimer cette image de la médiathèque ?")) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
