"use client";
import Icon from "@/components/banani/Icon";

export default function AdminDeleteLandingSongFeatureButton({ label, pending = false }: { label: string; pending?: boolean }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Retirer « ${label} » de cette section de la landing page ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Retirer
    </button>
  );
}
