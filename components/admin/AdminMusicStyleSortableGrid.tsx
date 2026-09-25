"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  deleteMusicStyle,
  reorderMusicStyles,
  toggleMusicStyle,
  type MusicStyleActionState,
} from "@/app/admin/music-styles/actions";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import AdminDeleteMusicStyleButton from "./AdminDeleteMusicStyleButton";
import AdminSortableGrid from "./AdminSortableGrid";

/** Fires a global toast whenever a `useActionState` result changes — shared by the toggle and delete forms below. */
function useActionToast(state: MusicStyleActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

function ToggleMusicStyleForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<MusicStyleActionState, FormData>(toggleMusicStyle, null);
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

function DeleteMusicStyleForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState<MusicStyleActionState, FormData>(deleteMusicStyle, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteMusicStyleButton name={name} pending={pending} />
    </form>
  );
}

export type SortableMusicStyle = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  active: boolean;
  sortOrder: number;
};

export default function AdminMusicStyleSortableGrid({ styles }: { styles: SortableMusicStyle[] }) {
  return (
    <AdminSortableGrid
      items={styles}
      onReorder={reorderMusicStyles}
      className="admin-music-style-grid"
      itemLabel={(style) => style.name}
      renderItem={(style, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card ${style.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className={`admin-catalog-icon genre-choice-icon-${style.tone}`}>
              <Icon i={style.icon} size={21} />
            </span>
            <span className={`admin-status ${style.active ? "is-success" : "is-pending"}`}>
              {style.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{style.name}</h2>
          <p>{style.description}</p>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/music-styles/${style.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <ToggleMusicStyleForm id={style.id} active={style.active} />
            <DeleteMusicStyleForm id={style.id} name={style.name} />
          </footer>
        </article>
      )}
      renderPreview={(style) => (
        <>
          <span className={`admin-catalog-icon genre-choice-icon-${style.tone}`}>
            <Icon i={style.icon} size={21} />
          </span>
          <strong>{style.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
