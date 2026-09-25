"use client";
import Link from "next/link";
import {
  deleteRecipientRelation,
  reorderRecipientRelations,
  toggleRecipientRelation,
} from "@/app/admin/recipient-relations/actions";
import Icon from "@/components/banani/Icon";
import AdminDeleteRecipientRelationButton from "./AdminDeleteRecipientRelationButton";
import AdminSortableGrid from "./AdminSortableGrid";
export type SortableRecipientRelation = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
};
export default function AdminRecipientRelationSortableGrid({ relations }: { relations: SortableRecipientRelation[] }) {
  return (
    <AdminSortableGrid
      items={relations}
      onReorder={reorderRecipientRelations}
      className="admin-music-style-grid admin-recipient-relation-grid"
      itemLabel={(relation) => relation.name}
      renderItem={(relation, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-recipient-relation-card ${relation.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon" aria-hidden="true">
              <Icon i="heart-handshake" size={20} />
            </span>
            <span className={`admin-status ${relation.active ? "is-success" : "is-pending"}`}>
              {relation.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{relation.name}</h2>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link
              className="admin-secondary-action admin-style-edit"
              href={`/admin/recipient-relations/${relation.id}`}
            >
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <form action={toggleRecipientRelation}>
              <input type="hidden" name="id" value={relation.id} />
              <input type="hidden" name="active" value={String(relation.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={relation.active ? "pause" : "play"} size={15} />
                {relation.active ? "Désactiver" : "Activer"}
              </button>
            </form>
            <form action={deleteRecipientRelation}>
              <input type="hidden" name="id" value={relation.id} />
              <AdminDeleteRecipientRelationButton name={relation.name} />
            </form>
          </footer>
        </article>
      )}
      renderPreview={(relation) => (
        <>
          <span className="admin-catalog-icon">
            <Icon i="heart-handshake" size={20} />
          </span>
          <strong>{relation.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
