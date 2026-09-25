"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  deleteLibraryCollection,
  reorderLibraryCollections,
  toggleLibraryCollection,
  type LibraryCollectionActionState,
} from "@/app/admin/library/actions";
import Icon from "@/components/banani/Icon";
import { parseCollectionStyles } from "@/lib/library-collections/catalog";
import { useAdminToast } from "./AdminToastProvider";
import AdminDeleteCollectionButton from "./AdminDeleteCollectionButton";
import AdminSortableGrid from "./AdminSortableGrid";

/** Fires a global toast whenever a `useActionState` result changes — shared by the toggle and delete forms below. */
function useActionToast(state: LibraryCollectionActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

function ToggleLibraryCollectionForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<LibraryCollectionActionState, FormData>(
    toggleLibraryCollection,
    null,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button className="admin-secondary-action" type="submit" disabled={pending}>
        <Icon i={active ? "pause" : "play"} size={15} />
        {active ? "Dépublier" : "Publier"}
      </button>
    </form>
  );
}

function DeleteLibraryCollectionForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<LibraryCollectionActionState, FormData>(
    deleteLibraryCollection,
    null,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteCollectionButton name={name} pending={pending} />
    </form>
  );
}

export type SortableLibraryCollection = {
  id: string;
  name: string;
  description: string;
  access: string;
  active: boolean;
  styles: unknown;
  sortOrder: number;
};
export default function AdminLibraryCollectionGrid({ collections }: { collections: SortableLibraryCollection[] }) {
  return (
    <AdminSortableGrid
      items={collections}
      onReorder={reorderLibraryCollections}
      className="admin-music-style-grid admin-library-grid"
      itemLabel={(item) => item.name}
      renderItem={(item, context) => {
        const styles = parseCollectionStyles(item.styles);
        return (
          <article
            className={`admin-catalog-card admin-music-style-card admin-library-card ${item.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
          >
            <div className="admin-catalog-card-head">
              <span className="admin-catalog-icon">
                <Icon i="library" size={21} />
              </span>
              <span className={`admin-status ${item.active && item.access === "public" ? "is-success" : "is-pending"}`}>
                {!item.active ? "Brouillon" : item.access === "public" ? "Publiée" : "Privée"}
              </span>
            </div>
            <h2>{item.name}</h2>
            <p>{item.description}</p>
            <div className="admin-library-style-list">
              {styles.length ? styles.map((style) => <span key={style}>{style}</span>) : <span>Tous les styles</span>}
            </div>
            <small>Ordre {context.index + 1}</small>
            <footer className="admin-style-actions">
              <Link className="admin-secondary-action admin-style-edit" href={`/admin/library/${item.id}`}>
                <Icon i="pencil" size={15} /> Modifier
              </Link>
              <ToggleLibraryCollectionForm id={item.id} active={item.active} />
              <DeleteLibraryCollectionForm id={item.id} name={item.name} />
            </footer>
          </article>
        );
      }}
      renderPreview={(item) => (
        <>
          <span className="admin-catalog-icon">
            <Icon i="library" size={20} />
          </span>
          <strong>{item.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
