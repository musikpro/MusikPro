"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeleteCollectionButton({ name }: { name: string }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement la collection « ${name} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
