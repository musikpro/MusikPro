"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeleteHeroAnimatedTextButton({ label, pending = false }: { label: string; pending?: boolean }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement le texte « ${label} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
