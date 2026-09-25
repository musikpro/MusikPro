"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  deleteRecipientRelation,
  reorderRecipientRelations,
  toggleRecipientRelation,
  type RecipientRelationActionState,
} from "@/app/admin/recipient-relations/actions";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import AdminDeleteRecipientRelationButton from "./AdminDeleteRecipientRelationButton";
import AdminSortableGrid from "./AdminSortableGrid";

/** Fires a global toast whenever a `useActionState` result changes — shared by the toggle and delete forms below. */
function useActionToast(state: RecipientRelationActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

function ToggleRecipientRelationForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<RecipientRelationActionState, FormData>(
    toggleRecipientRelation,
    null,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} />
        {active ? "Désactiver" : "Activer"}
      </button>
    </form>
  );
}

function DeleteRecipientRelationForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<RecipientRelationActionState, FormData>(
    deleteRecipientRelation,
    null,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteRecipientRelationButton name={name} pending={pending} />
    </form>
  );
}

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
            <ToggleRecipientRelationForm id={relation.id} active={relation.active} />
            <DeleteRecipientRelationForm id={relation.id} name={relation.name} />
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
