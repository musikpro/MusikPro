"use client";
import { useMemo, useRef, useState } from "react";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import AdminSelect from "@/components/admin/AdminSelect";
import { setAmbientTrack, disableAmbientTrack } from "@/app/admin/ambient-music/actions";
import { apiFetch } from "@/lib/api/client";
import type { AmbientTrackStatus } from "@/lib/settings/ambient-track";
import type { GeneratedSongOption } from "@/lib/trending/admin";

type SongDisplay = { songGroupId: string; title: string; styleLabel: string | null; audioUrl: string | null };

/**
 * `songs` is the recent platform-wide catalog (lib/trending/admin.ts's
 * listRecentGeneratedSongsForAdmin — same pool as Trending/landing-features, not just this admin's
 * own songs) capped at AMBIENT_SONG_POOL_SIZE. A song outside that window is reachable by pasting
 * its "Identifiant" from /admin/generations, same lookup endpoint and pattern as TrendingPanel's
 * "Ajouter par identifiant".
 */
export default function AmbientMusicPanel({
  status,
  songs,
}: {
  status: AmbientTrackStatus;
  songs: GeneratedSongOption[];
}) {
  const [extraSongs, setExtraSongs] = useState<Record<string, SongDisplay>>({});
  const [songGroupId, setSongGroupId] = useState(status.songGroupId ?? songs[0]?.songGroupId ?? "");
  const [idInput, setIdInput] = useState("");
  const [idLookupPending, setIdLookupPending] = useState(false);
  const [idLookupError, setIdLookupError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(status.volumePercent);
  const audioRef = useRef<HTMLAudioElement>(null);

  const allSongs = useMemo<SongDisplay[]>(() => {
    const map = new Map<string, SongDisplay>(songs.map((song) => [song.songGroupId, song]));
    for (const extra of Object.values(extraSongs)) if (!map.has(extra.songGroupId)) map.set(extra.songGroupId, extra);
    return Array.from(map.values());
  }, [songs, extraSongs]);
  const selectedSong = allSongs.find((song) => song.songGroupId === songGroupId) ?? null;

  const addSongById = async () => {
    const trimmed = idInput.trim();
    if (!trimmed) return;
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

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else void audio.play().catch(() => setPlaying(false));
  };

  if (songs.length === 0) {
    return (
      <section className="admin-panel">
        <p>Tu n&apos;as encore aucune chanson terminée à utiliser comme fond sonore.</p>
      </section>
    );
  }

  const formId = "ambient-settings-form";
  return (
    <section className={`admin-panel ${status.enabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="music-4" size={20} />
        </span>
        <div>
          <h2>Musique d&apos;ambiance du tableau de bord</h2>
          <p>
            Jouée automatiquement, à faible volume, sur l&apos;écran d&apos;accueil du tableau de bord (démo publique et
            comptes réels). Elle s&apos;arrête dès que la personne quitte l&apos;accueil.
          </p>
        </div>
        <span className={`admin-status ${status.enabled ? "is-success" : "is-pending"}`}>
          {status.enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      <AdminActionForm
        id={formId}
        key={`${status.songGroupId ?? "none"}-${status.volumePercent}`}
        action={setAmbientTrack}
        className="admin-stack-form admin-ambient-form"
      >
        <div className="admin-ambient-field">
          <label htmlFor="ambient-song-select">Chanson</label>
          <div className="admin-ambient-song-row">
            <AdminSelect
              name="songGroupId"
              ariaLabel="Chanson"
              value={songGroupId}
              onValueChange={(next) => {
                setSongGroupId(next);
                setPlaying(false);
              }}
              options={[
                { value: "", label: "Choisis une chanson" },
                ...allSongs.map((song) => ({
                  value: song.songGroupId,
                  label: `${song.title}${song.styleLabel ? ` — ${song.styleLabel}` : ""}`,
                })),
              ]}
            />
            <button
              type="button"
              className="admin-secondary-action"
              disabled={!selectedSong?.audioUrl}
              onClick={togglePlay}
            >
              <Icon i={playing ? "pause" : "play"} size={15} />
              {playing ? "Pause" : "Lecture"}
            </button>
          </div>
          {selectedSong?.audioUrl ? (
            <audio
              ref={audioRef}
              src={selectedSong.audioUrl}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              className="sr-only"
            />
          ) : null}
        </div>
        <div className="admin-trending-add-by-id">
          <label htmlFor="ambient-add-by-id">Ajouter par identifiant</label>
          <div className="admin-trending-add-by-id-row">
            <input
              id="ambient-add-by-id"
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
            Seules les {songs.length} générations les plus récentes apparaissent dans la liste ci-dessus — le catalogue
            peut en contenir bien plus ; pour une chanson plus ancienne, copie son identifiant depuis « Générations » et
            colle-le ici.
          </small>
          {idLookupError ? (
            <p className="admin-trending-empty-hint admin-trending-empty-hint--error">{idLookupError}</p>
          ) : null}
        </div>
        <div className="admin-ambient-field">
          <label htmlFor="ambient-volume-input">Volume (1 à 50 %)</label>
          <div className="admin-ambient-volume">
            {/* Bulle qui suit le curseur : le pourcentage exact reste visible pendant le glissement. */}
            <output
              htmlFor="ambient-volume-input"
              className="admin-ambient-volume-bubble"
              style={{ "--volume-ratio": (volume - 1) / 49 } as React.CSSProperties}
            >
              {volume} %
            </output>
            <input
              id="ambient-volume-input"
              type="range"
              name="volumePercent"
              min={1}
              max={50}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </div>
        </div>
      </AdminActionForm>
      <div className="admin-ambient-actions">
        <button type="submit" form={formId} className="admin-primary-action">
          <Icon i="save" size={15} />
          Enregistrer
        </button>
        {status.enabled ? (
          <AdminActionForm action={disableAmbientTrack}>
            <button type="submit" className="admin-secondary-action">
              <Icon i="power-off" size={15} />
              Désactiver
            </button>
          </AdminActionForm>
        ) : null}
      </div>
    </section>
  );
}
