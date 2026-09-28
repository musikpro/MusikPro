"use client";
import { useActionState, useMemo, useRef, useState, type ChangeEvent } from "react";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import { uploadCoverImage } from "@/lib/demo/cover-actions";
import { apiFetch } from "@/lib/api/client";
import type { GeneratedSongOption } from "@/lib/trending/admin";
import type { LandingSongFeatureSection } from "@/lib/landing-features/admin";

type SongDisplay = { songGroupId: string; title: string; styleLabel: string | null; plays: number };
type Values = { id?: string; songGroupId?: string; coverUrlOverride?: string | null };

/**
 * Assigns one real generated song (lib/trending/admin.ts's listRecentGeneratedSongsForAdmin — the
 * same recent-generations pool /admin/trending's manual picker uses) to a landing-page card slot.
 * A song outside that recent window can still be reached by pasting its "Identifiant" from
 * /admin/generations — same lookup endpoint and pattern as TrendingPanel's "Ajouter par
 * identifiant". Picking an unpublished song auto-publishes it on save (see actions.ts), so the
 * pool isn't limited to already-published songs the way it used to be. Also supports an optional
 * cover image override uploaded via the existing authenticated /api/uploads/images route (lib/
 * demo/cover-actions.ts's uploadCoverImage, reused as-is rather than a second upload path). Used
 * both for adding a new slot inline and for editing an existing one at
 * /admin/landing-features/[id].
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
  songs: GeneratedSongOption[];
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

  // A song added via "Ajouter par identifiant" that isn't already in `songs` (outside the recent
  // window fetched server-side) — merged into the picker's options below.
  const [extraSongs, setExtraSongs] = useState<Record<string, SongDisplay>>({});
  const [idInput, setIdInput] = useState("");
  const [idLookupPending, setIdLookupPending] = useState(false);
  const [idLookupError, setIdLookupError] = useState("");

  const usedElsewhere = useMemo(
    () => new Set(usedSongGroupIds.filter((id) => id !== values.songGroupId)),
    [usedSongGroupIds, values.songGroupId],
  );
  const options = useMemo(() => {
    const map = new Map<string, SongDisplay>(songs.map((song) => [song.songGroupId, song]));
    for (const extra of Object.values(extraSongs)) if (!map.has(extra.songGroupId)) map.set(extra.songGroupId, extra);
    return Array.from(map.values())
      .filter((song) => !usedElsewhere.has(song.songGroupId))
      .map((song) => ({
        value: song.songGroupId,
        label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""} · ${song.plays} écoute${song.plays > 1 ? "s" : ""}`,
      }));
  }, [songs, extraSongs, usedElsewhere]);
  const [songGroupId, setSongGroupId] = useState(() => values.songGroupId ?? options[0]?.value ?? "");

  const addSongById = async () => {
    const trimmed = idInput.trim();
    if (!trimmed) return;
    if (usedElsewhere.has(trimmed)) {
      setIdLookupError("Cette chanson est déjà assignée à cette section.");
      return;
    }
    setIdLookupPending(true);
    setIdLookupError("");
    try {
      const option = await apiFetch<SongDisplay>("/api/admin/trending/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songGroupId: trimmed }),
        timeoutMs: 15_000,
      });
      setExtraSongs((prev) => ({ ...prev, [option.songGroupId]: option }));
      setSongGroupId(option.songGroupId);
      setIdInput("");
    } catch (error) {
      setIdLookupError(error instanceof Error ? error.message : "Identifiant introuvable.");
    } finally {
      setIdLookupPending(false);
    }
  };

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

  return (
    <form action={formAction} className="admin-editor-grid admin-landing-feature-form">
      <input type="hidden" name="section" value={section} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="coverUrlOverride" value={coverUrl} />
      <label className="admin-editor-field">
        <span>Chanson</span>
        <AdminSelect
          name="songGroupId"
          ariaLabel="Chanson à assigner à cette carte"
          options={options}
          value={songGroupId}
          onValueChange={setSongGroupId}
        />
        {options.length === 0 ? (
          <small className="admin-field-error">
            {songs.length === 0
              ? "Aucune chanson générée pour l’instant — crée une chanson depuis le tableau de bord client pour pouvoir l’assigner ici."
              : "Toutes les chansons récentes sont déjà assignées à cette section — ajoute-en une par identifiant ci-dessous."}
          </small>
        ) : null}
      </label>
      <div className="admin-trending-add-by-id">
        <label htmlFor={`${section}-add-by-id`}>Ajouter par identifiant</label>
        <div className="admin-trending-add-by-id-row">
          <input
            id={`${section}-add-by-id`}
            type="text"
            value={idInput}
            onChange={(event) => {
              setIdInput(event.target.value);
              setIdLookupError("");
            }}
            placeholder="Colle l’identifiant depuis la page « Générations »"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void addSongById();
              }
            }}
          />
          <button
            type="button"
            className="admin-trending-add"
            disabled={idLookupPending || !idInput.trim()}
            onClick={() => void addSongById()}
          >
            <Icon
              i={idLookupPending ? "loader-circle" : "plus"}
              size={14}
              className={idLookupPending ? "animate-spin" : undefined}
            />
            Ajouter
          </button>
        </div>
        <small>
          Seules les {songs.length} chansons les plus récentes apparaissent dans la liste ci-dessus — pour une
          chanson plus ancienne, copie son identifiant depuis « Générations » et colle-le ici.
        </small>
        {idLookupError ? <p className="admin-trending-empty-hint admin-trending-empty-hint--error">{idLookupError}</p> : null}
      </div>
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
        <button type="submit" disabled={pending || uploading || !songGroupId}>
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer" : "Ajouter cette carte"}
        </button>
      </div>
    </form>
  );
}
