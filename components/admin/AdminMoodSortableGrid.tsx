"use client";
import Link from "next/link";
import { deleteMood, reorderMoods, toggleMood } from "@/app/admin/moods/actions";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "./AdminActionForm";
import AdminDeleteOccasionButton from "./AdminDeleteOccasionButton";
import AdminSortableGrid from "./AdminSortableGrid";

export type SortableMood = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  aiHint: string;
  active: boolean;
  sortOrder: number;
};

export default function AdminMoodSortableGrid({ moods }: { moods: SortableMood[] }) {
  return (
    <AdminSortableGrid
      items={moods}
      onReorder={reorderMoods}
      className="admin-music-style-grid admin-occasion-grid"
      itemLabel={(mood) => mood.name}
      renderItem={(mood, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-occasion-card ${mood.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon admin-occasion-emoji" aria-hidden="true">
              {mood.emoji}
            </span>
            <span className={`admin-status ${mood.active ? "is-success" : "is-pending"}`}>
              {mood.active ? "Active" : "Désactivée"}
            </span>
          </div>
          <h2>{mood.name}</h2>
          <p>{mood.description || "Aucune description"}</p>
          <small>
            Ordre {context.index + 1} · {mood.aiHint ? "Consigne IA définie" : "Nom seul envoyé à l’IA"}
          </small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/moods/${mood.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <AdminActionForm action={toggleMood}>
              <input type="hidden" name="id" value={mood.id} />
              <input type="hidden" name="active" value={String(mood.active)} />
              <button className="admin-secondary-action" type="submit">
                <Icon i={mood.active ? "pause" : "play"} size={15} />
                {mood.active ? "Désactiver" : "Activer"}
              </button>
            </AdminActionForm>
            <AdminActionForm action={deleteMood}>
              <input type="hidden" name="id" value={mood.id} />
              <AdminDeleteOccasionButton name={mood.name} subject="l’ambiance" />
            </AdminActionForm>
          </footer>
        </article>
      )}
      renderPreview={(mood) => (
        <>
          <span className="admin-catalog-icon admin-occasion-emoji">{mood.emoji}</span>
          <strong>{mood.name}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
