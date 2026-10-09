"use client";
import { useActionState, useState } from "react";
import Icon from "@/components/banani/Icon";
import { renameSong } from "@/app/admin/generations/actions";
import { stripVersionSuffix } from "@/lib/ai/song-title";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";

/**
 * Titre d'une chanson dans /admin/generations, avec un crayon pour le renommer. Le renommage s'applique à
 * toutes les versions de la chanson (voir renameSong) ; le résultat passe par le toast admin habituel.
 * Un `useActionState` local referme l'éditeur après un enregistrement réussi.
 */
export default function AdminSongTitleEditor({ jobId, title }: { jobId: string; title: string | null }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(async (previous, formData) => {
    const result = await renameSong(previous, formData);
    if (result?.ok) setEditing(false);
    return result;
  }, null);
  useAdminActionToast(state);

  if (!editing) {
    return (
      <span className="admin-song-title">
        <strong>{title ?? "Sans titre"}</strong>
        <button
          type="button"
          className="admin-song-title-edit"
          aria-label={`Renommer ${title ?? "cette chanson"}`}
          title="Renommer la chanson (toutes ses versions)"
          onClick={() => setEditing(true)}
        >
          <Icon i="pencil" size={13} />
        </button>
      </span>
    );
  }

  return (
    <form action={formAction} className="admin-song-title-form">
      <input type="hidden" name="jobId" value={jobId} />
      <input
        name="title"
        defaultValue={stripVersionSuffix(title ?? "")}
        maxLength={120}
        minLength={2}
        required
        autoFocus
        aria-label="Nouveau titre de la chanson"
        onKeyDown={(event) => {
          if (event.key === "Escape") setEditing(false);
        }}
      />
      <button type="submit" className="admin-song-title-save" disabled={pending}>
        <Icon i={pending ? "loader-circle" : "save"} size={13} className={pending ? "animate-spin" : undefined} />
        Enregistrer
      </button>
      <button type="button" className="admin-song-title-cancel" onClick={() => setEditing(false)}>
        Annuler
      </button>
    </form>
  );
}
