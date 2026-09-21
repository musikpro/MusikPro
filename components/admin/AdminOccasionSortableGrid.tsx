"use client";
import Link from "next/link";
import { deleteOccasion, reorderOccasions, toggleOccasion } from "@/app/admin/occasions/actions";
import Icon from "@/components/banani/Icon";
import AdminDeleteOccasionButton from "./AdminDeleteOccasionButton";
import AdminSortableGrid from "./AdminSortableGrid";
export type SortableOccasion = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  active: boolean;
  sortOrder: number;
};
export default function AdminOccasionSortableGrid({ occasions }: { occasions: SortableOccasion[] }) {
  return (
    <AdminSortableGrid
      items={occasions}
      onReorder={reorderOccasions}
      className="admin-music-style-grid admin-occasion-grid"
      itemLabel={(occasion) => occasion.name}
      renderItem={(occasion, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-occasion-card ${occasion.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon admin-occasion-emoji" aria-hidden="true">
              {occasion.emoji}
            </span>
            <span className={`admin-status ${occasion.active ? "is-success" : "is-pending"}`}>
              {occasion.active ? "Active" : "Désactivée"}
            </span>
          </div>
          <h2>{occasion.name}</h2>
          <p>{occasion.description || "Aucune description"}</p>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/occasions/${occasion.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <form action={toggleOccasion}>
              <input type="hidden" name="id" value={occasion.id} />
              <input type="hidden" name="active" value={String(occasion.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={occasion.active ? "pause" : "play"} size={15} />
                {occasion.active ? "Désactiver" : "Activer"}
              </button>
            </form>
            <form action={deleteOccasion}>
              <input type="hidden" name="id" value={occasion.id} />
              <AdminDeleteOccasionButton name={occasion.name} />
            </form>
          </footer>
        </article>
      )}
      renderPreview={(occasion) => (
        <>
          <span className="admin-catalog-icon admin-occasion-emoji">{occasion.emoji}</span>
          <strong>{occasion.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
