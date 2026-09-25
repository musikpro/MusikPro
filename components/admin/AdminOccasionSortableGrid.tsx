"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  deleteOccasion,
  reorderOccasions,
  toggleOccasion,
  type OccasionActionState,
} from "@/app/admin/occasions/actions";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import AdminDeleteOccasionButton from "./AdminDeleteOccasionButton";
import AdminSortableGrid from "./AdminSortableGrid";

/** Fires a global toast whenever a `useActionState` result changes — shared by the toggle and delete forms below. */
function useActionToast(state: OccasionActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

function ToggleOccasionForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<OccasionActionState, FormData>(toggleOccasion, null);
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

function DeleteOccasionForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<OccasionActionState, FormData>(deleteOccasion, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteOccasionButton name={name} pending={pending} />
    </form>
  );
}

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
            <ToggleOccasionForm id={occasion.id} active={occasion.active} />
            <DeleteOccasionForm id={occasion.id} name={occasion.name} />
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
