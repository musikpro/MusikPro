"use client";
import Link from "next/link";
import {
  deleteLibraryCollection,
  reorderLibraryCollections,
  toggleLibraryCollection,
} from "@/app/admin/library/actions";
import Icon from "@/components/banani/Icon";
import { parseCollectionStyles } from "@/lib/library-collections/catalog";
import AdminDeleteCollectionButton from "./AdminDeleteCollectionButton";
import AdminSortableGrid from "./AdminSortableGrid";

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
              <form action={toggleLibraryCollection}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="active" value={String(item.active)} />
                <button className="admin-secondary-action" type="submit">
                  <Icon i={item.active ? "pause" : "play"} size={15} />
                  {item.active ? "Dépublier" : "Publier"}
                </button>
              </form>
              <form action={deleteLibraryCollection}>
                <input type="hidden" name="id" value={item.id} />
                <AdminDeleteCollectionButton name={item.name} />
              </form>
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
