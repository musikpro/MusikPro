"use client";
import Link from "next/link";
import { useActionState, useEffect } from "react";
import {
  deleteHeroAnimatedText,
  reorderHeroAnimatedTexts,
  toggleHeroAnimatedText,
  type HeroAnimatedTextActionState,
} from "@/app/admin/animated-texts/actions";
import Icon from "@/components/banani/Icon";
import { useAdminToast } from "./AdminToastProvider";
import AdminDeleteHeroAnimatedTextButton from "./AdminDeleteHeroAnimatedTextButton";
import AdminSortableGrid from "./AdminSortableGrid";

/** Fires a global toast whenever a `useActionState` result changes — shared by the toggle and delete forms below. */
function useActionToast(state: HeroAnimatedTextActionState) {
  const showToast = useAdminToast();
  useEffect(() => {
    if (!state) return;
    showToast({ message: state.message, tone: state.ok ? "success" : "error" });
  }, [state, showToast]);
}

function ToggleHeroAnimatedTextForm({ id, active }: { id: string; active: boolean }) {
  const [state, formAction, pending] = useActionState<HeroAnimatedTextActionState, FormData>(
    toggleHeroAnimatedText,
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

function DeleteHeroAnimatedTextForm({ id, label }: { id: string; label: string }) {
  const [state, formAction, pending] = useActionState<HeroAnimatedTextActionState, FormData>(
    deleteHeroAnimatedText,
    null,
  );
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AdminDeleteHeroAnimatedTextButton label={label} pending={pending} />
    </form>
  );
}

export type SortableHeroAnimatedText = {
  id: string;
  label: string;
  emoji: string;
  active: boolean;
  sortOrder: number;
};
export default function AdminHeroAnimatedTextSortableGrid({ texts }: { texts: SortableHeroAnimatedText[] }) {
  return (
    <AdminSortableGrid
      items={texts}
      onReorder={reorderHeroAnimatedTexts}
      className="admin-music-style-grid admin-occasion-grid"
      itemLabel={(text) => text.label}
      renderItem={(text, context) => (
        <article
          className={`admin-catalog-card admin-music-style-card admin-occasion-card ${text.active ? "is-active" : ""} ${context.dragging ? "is-dragging" : ""} ${context.dropTarget ? "is-drop-target" : ""}`}
        >
          <div className="admin-catalog-card-head">
            <span className="admin-catalog-icon admin-occasion-emoji" aria-hidden="true">
              {text.emoji}
            </span>
            <span className={`admin-status ${text.active ? "is-success" : "is-pending"}`}>
              {text.active ? "Actif" : "Désactivé"}
            </span>
          </div>
          <h2>{text.label}</h2>
          <small>Ordre {context.index + 1}</small>
          <footer className="admin-style-actions">
            <Link className="admin-secondary-action admin-style-edit" href={`/admin/animated-texts/${text.id}`}>
              <Icon i="pencil" size={15} /> Modifier
            </Link>
            <ToggleHeroAnimatedTextForm id={text.id} active={text.active} />
            <DeleteHeroAnimatedTextForm id={text.id} label={text.label} />
          </footer>
        </article>
      )}
      renderPreview={(text) => (
        <>
          <span className="admin-catalog-icon admin-occasion-emoji">{text.emoji}</span>
          <strong>{text.label}</strong>
          <Icon i="grip-vertical" size={18} />
        </>
      )}
    />
  );
}
