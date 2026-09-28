"use client";
import { useActionState, useRef, useState, type ChangeEvent } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import { uploadCoverImage } from "@/lib/demo/cover-actions";
import type { PublishedSongOption } from "@/lib/trending/admin";
import type { LandingSongFeatureSection } from "@/lib/landing-features/admin";

type Values = { id?: string; songGroupId?: string; coverUrlOverride?: string | null };

/**
 * Assigns one real published song (lib/trending/admin.ts's listPublishedSongsForAdmin — the same
 * catalog /admin/trending uses) to a landing-page card slot, with an optional cover image
 * override uploaded via the existing authenticated /api/uploads/images route (lib/demo/cover-
 * actions.ts's uploadCoverImage, reused as-is rather than a second upload path). Used both for
 * adding a new slot inline and for editing an existing one at /admin/landing-features/[id].
 */
export default function AdminLandingSongFeatureForm({
  section,
  action,
  songs,
  usedSongGroupIds,
  values = {},
}: {
  section: LandingSongFeatureSection;
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  songs: PublishedSongOption[];
  usedSongGroupIds: string[];
  values?: Values;
}) {
  const editing = Boolean(values.id);
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(action, null);
  useAdminActionToast(state);
  const [coverUrl, setCoverUrl] = useState(values.coverUrlOverride ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const usedElsewhere = new Set(usedSongGroupIds.filter((id) => id !== values.songGroupId));
  const options = songs
    .filter((song) => !usedElsewhere.has(song.songGroupId))
    .map((song) => ({
      value: song.songGroupId,
      label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""} · ${song.plays} écoute${song.plays > 1 ? "s" : ""}`,
    }));

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    try {
      setCoverUrl(await uploadCoverImage(file));
    } catch {
      setUploadError(true);
    } finally {
      setUploading(false);
    }
  };

  if (options.length === 0) {
    return (
      <p className="admin-trending-empty-hint">
        {songs.length === 0
          ? "Aucune chanson publiée pour l’instant — publie une chanson depuis « Mes chansons » côté client pour pouvoir l’assigner ici."
          : "Toutes les chansons publiées sont déjà assignées à cette section."}
      </p>
    );
  }

  return (
    <form action={formAction} className="admin-editor-grid admin-landing-feature-form">
      <input type="hidden" name="section" value={section} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="coverUrlOverride" value={coverUrl} />
      <label className="admin-editor-field">
        <span>Chanson</span>
        <AdminSelect name="songGroupId" ariaLabel="Chanson à assigner à cette carte" defaultValue={values.songGroupId} options={options} />
      </label>
      <div className="admin-editor-field">
        <span>Image de la carte (optionnel)</span>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="admin-landing-feature-cover-preview" />
        ) : null}
        <div className="admin-btn-row">
          <button type="button" className="admin-secondary-action" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Icon i="upload" size={15} />
            {uploading ? "Envoi…" : coverUrl ? "Changer l’image" : "Choisir une image"}
          </button>
          {coverUrl ? (
            <button type="button" className="admin-secondary-action" onClick={() => setCoverUrl("")}>
              <Icon i="x" size={15} /> Retirer
            </button>
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
          className="sr-only"
          onChange={handleFile}
        />
        {uploadError ? <small className="admin-field-error">Impossible d’envoyer cette image pour le moment.</small> : null}
        <small>Sans image, la pochette générée automatiquement pour cette chanson reste utilisée. Choisis une image liée à la musique, cohérente avec l’identité visuelle du site.</small>
      </div>
      <div className="admin-editor-actions is-wide">
        <button type="submit" disabled={pending || uploading}>
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer" : "Ajouter cette carte"}
        </button>
      </div>
    </form>
  );
}
