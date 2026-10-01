"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeleteOccasionButton({
  name,
  pending = false,
  subject = "l’occasion",
}: {
  name: string;
  pending?: boolean;
  /** Mot affiché dans la confirmation (« l’occasion », « l’ambiance »…). */
  subject?: string;
}) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement ${subject} « ${name} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
