"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeleteCollectionButton({ name, pending = false }: { name: string; pending?: boolean }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement la collection « ${name} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
