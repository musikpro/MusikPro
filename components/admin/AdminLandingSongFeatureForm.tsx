"use client";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import AdminMediaPickerModal from "@/components/admin/AdminMediaPickerModal";
import AdminSelect from "@/components/admin/AdminSelect";
import Icon from "@/components/banani/Icon";
import { useAdminActionToast, type AdminActionState } from "@/components/admin/useAdminActionToast";
import { apiFetch } from "@/lib/api/client";
import type { GeneratedSongOption } from "@/lib/trending/admin";
import type { LandingSongFeatureSection } from "@/lib/landing-features/admin";
import {
  hiddenSongLabel,
  placementsWithout,
  songAlreadyUsedMessage,
  type SongPlacements,
} from "@/lib/featured-songs/placements";

type SongDisplay = {
  songGroupId: string;
  title: string;
  styleLabel: string | null;
  plays: number;
  audioUrl: string | null;
};
type Values = { id?: string; songGroupId?: string; coverUrlOverride?: string | null };

/**
 * Assigns one real generated song (lib/trending/admin.ts's listRecentGeneratedSongsForAdmin — the
 * same recent-generations pool /admin/trending's manual picker uses) to a landing-page card slot.
 * A song outside that recent window can still be reached by pasting its "Identifiant" from
 * /admin/generations — same lookup endpoint and pattern as TrendingPanel's "Ajouter par
 * identifiant". Picking an unpublished song auto-publishes it on save (see actions.ts), so the
 * pool isn't limited to already-published songs the way it used to be. The picked song can be
 * previewed before saving, and the optional cover image override is chosen from the shared media
 * library (the Médias menu) in a modal — AdminMediaPickerModal — instead of a fresh upload. Used
 * both for adding a new slot inline and for editing an existing one at
 * /admin/landing-features/[id].
 */
export default function AdminLandingSongFeatureForm({
  section,
  sectionLabel,
  action,
  songs,
  usedPlacements,
  values = {},
}: {
  section: LandingSongFeatureSection;
  sectionLabel: string;
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  songs: GeneratedSongOption[];
  /** songGroupId → place déjà occupée (landing ou Tendances) : ces chansons ne sont plus proposées. */
  usedPlacements: SongPlacements;
  values?: Values;
}) {
  const editing = Boolean(values.id);
  const [coverUrl, setCoverUrl] = useState(values.coverUrlOverride ?? "");
  const [songGroupId, setSongGroupId] = useState(values.songGroupId ?? "");
  const [playing, setPlaying] = useState(false);
  // After a successful "add", the form goes back to its empty state (no song, no cover) so the
  // next card is chosen from scratch; when editing, the saved values stay in place.
  const [state, formAction, pending] = useActionState<AdminActionState, FormData>(async (previous, formData) => {
    const result = await action(previous, formData);
    if (result?.ok && !editing) {
      setSongGroupId("");
      setCoverUrl("");
      setPlaying(false);
    }
    return result;
  }, null);
  useAdminActionToast(state);
  const [pickerOpen, setPickerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // A song added via "Ajouter par identifiant" that isn't already in `songs` (outside the recent
  // window fetched server-side) — merged into the picker's options below.
  const [extraSongs, setExtraSongs] = useState<Record<string, SongDisplay>>({});
  const [idInput, setIdInput] = useState("");
  const [idLookupPending, setIdLookupPending] = useState(false);
  const [idLookupError, setIdLookupError] = useState("");

  // The card being edited keeps its own song selectable; every other used song is hidden from the picker.
  const usedElsewhere = useMemo(
    () => placementsWithout(usedPlacements, [values.songGroupId]),
    [usedPlacements, values.songGroupId],
  );
  const allSongs = useMemo(() => {
    const map = new Map<string, SongDisplay>(songs.map((song) => [song.songGroupId, song]));
    for (const extra of Object.values(extraSongs)) if (!map.has(extra.songGroupId)) map.set(extra.songGroupId, extra);
    return Array.from(map.values());
  }, [songs, extraSongs]);
  const options = useMemo(() => {
    return allSongs
      .filter((song) => !usedElsewhere[song.songGroupId])
      .map((song) => ({
        value: song.songGroupId,
        label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""} · ${song.plays} écoute${song.plays > 1 ? "s" : ""}`,
      }));
  }, [allSongs, usedElsewhere]);
  const selectedSong = allSongs.find((song) => song.songGroupId === songGroupId) ?? null;
  // Songs of the recent pool left out of the picker because another place already uses them — listed so
  // the owner knows why they are missing instead of wondering.
  const hiddenSongs = useMemo(
    () => allSongs.filter((song) => usedElsewhere[song.songGroupId]),
    [allSongs, usedElsewhere],
  );

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play().catch(() => setPlaying(false));
  };

  const addSongById = async () => {
    const trimmed = idInput.trim();
    if (!trimmed) return;
    if (usedElsewhere[trimmed]) {
      setIdLookupError(songAlreadyUsedMessage(usedElsewhere[trimmed]));
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
      setPlaying(false);
      setIdInput("");
    } catch (error) {
      setIdLookupError(error instanceof Error ? error.message : "Identifiant introuvable.");
    } finally {
      setIdLookupPending(false);
    }
  };

  return (
    <form action={formAction} className="admin-editor-grid admin-landing-feature-form">
      <input type="hidden" name="section" value={section} />
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="coverUrlOverride" value={coverUrl} />
      <div className="admin-editor-field">
        <span>Chanson</span>
        <div className="admin-ambient-song-row">
          <AdminSelect
            name="songGroupId"
            ariaLabel="Chanson à assigner à cette carte"
            options={options}
            value={songGroupId}
            placeholder="Choisir une chanson"
            onValueChange={(next) => {
              setSongGroupId(next);
              setPlaying(false);
            }}
          />
          <button
            type="button"
            className="admin-secondary-action"
            disabled={!selectedSong?.audioUrl}
            onClick={togglePlay}
          >
            <Icon i={playing ? "pause" : "play"} size={15} />
            {playing ? "Pause" : "Écouter la chanson"}
          </button>
        </div>
        {selectedSong?.audioUrl ? (
          <audio
            key={selectedSong.audioUrl}
            ref={audioRef}
            src={selectedSong.audioUrl}
            preload="none"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="sr-only"
          />
        ) : null}
        {options.length === 0 ? (
          <small className="admin-field-error">
            {songs.length === 0
              ? "Aucune chanson générée pour l’instant — crée une chanson depuis le tableau de bord client pour pouvoir l’assigner ici."
              : "Toutes les chansons récentes sont déjà utilisées (landing ou Tendances) — ajoute-en une par identifiant ci-dessous."}
          </small>
        ) : null}
        {hiddenSongs.length ? (
          <small>
            Déjà utilisées, donc non proposées :{" "}
            {hiddenSongs.map((song) => hiddenSongLabel(song, usedElsewhere[song.songGroupId])).join(" ; ")}.
          </small>
        ) : null}
      </div>
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
          Seules les {songs.length} chansons les plus récentes apparaissent dans la liste ci-dessus — pour une chanson
          plus ancienne, copie son identifiant depuis « Générations » et colle-le ici.
        </small>
        {idLookupError ? (
          <p className="admin-trending-empty-hint admin-trending-empty-hint--error">{idLookupError}</p>
        ) : null}
      </div>
      {/* « Bibliothèque populaire » has no card image: the hidden coverUrlOverride input above keeps any existing value untouched. */}
      {section !== "library" ? (
        <div className="admin-editor-field">
          <span>Image de la carte (optionnel)</span>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className="admin-landing-feature-cover-preview" />
          ) : null}
          <div className="admin-btn-row">
            <button type="button" className="admin-secondary-action" onClick={() => setPickerOpen(true)}>
              <Icon i="image" size={15} />
              {coverUrl ? "Changer l’image" : "Choisir une image"}
            </button>
            {coverUrl ? (
              <button type="button" className="admin-secondary-action" onClick={() => setCoverUrl("")}>
                <Icon i="x" size={15} /> Retirer
              </button>
            ) : null}
          </div>
          <AdminMediaPickerModal
            open={pickerOpen}
            selectedUrl={coverUrl}
            onSelect={(url) => {
              setCoverUrl(url);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
          <small>
            Sans image, la pochette générée automatiquement pour cette chanson reste utilisée. Choisis une image liée à
            la musique, cohérente avec l’identité visuelle du site.
          </small>
        </div>
      ) : null}
      <div className="admin-editor-actions is-wide">
        {editing ? (
          <Link className="admin-secondary-action" href={`/admin/landing-features?tab=${section}`}>
            Annuler
          </Link>
        ) : null}
        <button type="submit" disabled={pending || !songGroupId}>
          <Icon i={editing ? "save" : "plus"} size={17} />
          {editing ? "Enregistrer" : `Ajouter à « ${sectionLabel} »`}
        </button>
      </div>
    </form>
  );
}
