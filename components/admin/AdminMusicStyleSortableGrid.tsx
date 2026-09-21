"use client";

import Link from "next/link";
import { deleteMusicStyle, reorderMusicStyles, toggleMusicStyle } from "@/app/admin/music-styles/actions";
import Icon from "@/components/banani/Icon";
import AdminDeleteMusicStyleButton from "./AdminDeleteMusicStyleButton";
import AdminSortableGrid from "./AdminSortableGrid";

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
        <article className={`admin-catalog-card admin-music-style-card ${style.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}>
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
            <form action={toggleMusicStyle}>
              <input type="hidden" name="id" value={style.id} />
              <input type="hidden" name="active" value={String(style.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={style.active ? "pause" : "play"} size={15} />
                {style.active ? "Désactiver" : "Activer"}
              </button>
            </form>
            <form action={deleteMusicStyle}>
              <input type="hidden" name="id" value={style.id} />
              <AdminDeleteMusicStyleButton name={style.name} />
            </form>
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
