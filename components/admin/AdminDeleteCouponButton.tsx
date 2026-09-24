"use client";
import Icon from "@/components/banani/Icon";
export default function AdminDeleteCouponButton({ code }: { code: string }) {
  return (
    <button
      type="submit"
      className="admin-style-delete"
      onClick={(event) => {
        if (!window.confirm(`Supprimer définitivement le code « ${code} » ?`)) event.preventDefault();
      }}
    >
      <Icon i="trash" size={15} /> Supprimer
    </button>
  );
}
