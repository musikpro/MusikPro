"use client";
import Icon from "@/components/banani/Icon";
import AdminActionForm from "@/components/admin/AdminActionForm";
import { setAmbientTrack, disableAmbientTrack } from "@/app/admin/ambient-music/actions";
import type { AmbientTrackStatus } from "@/lib/settings/ambient-track";

type SongOption = { songGroupId: string; title: string; styleLabel: string | null };

export default function AmbientMusicPanel({
  status,
  songOptions,
  currentSongGroupId,
}: {
  status: AmbientTrackStatus;
  songOptions: SongOption[];
  currentSongGroupId: string | null;
}) {
  if (songOptions.length === 0) {
    return (
      <section className="admin-panel">
        <p>Tu n'as encore aucune chanson terminée à utiliser comme fond sonore.</p>
      </section>
    );
  }
  return (
    <section className={`admin-panel ${status.enabled ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="music-4" size={20} />
        </span>
        <div>
          <h2>Musique d'ambiance du tableau de bord</h2>
          <p>
            Jouée automatiquement, à faible volume, sur l'écran d'accueil du tableau de bord (démo publique et comptes
            réels). Elle s'arrête dès que la personne quitte l'accueil.
          </p>
        </div>
        <span className={`admin-status ${status.enabled ? "is-success" : "is-pending"}`}>
          {status.enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      <AdminActionForm
        key={`${currentSongGroupId ?? "none"}-${status.volumePercent}`}
        action={setAmbientTrack}
        className="admin-stack-form"
      >
        <label htmlFor="ambient-song-select">Chanson</label>
        <select id="ambient-song-select" name="songGroupId" defaultValue={currentSongGroupId ?? ""} required>
          <option value="" disabled>
            Choisis une chanson
          </option>
          {songOptions.map((song) => (
            <option key={song.songGroupId} value={song.songGroupId}>
              {song.title}
              {song.styleLabel ? ` — ${song.styleLabel}` : ""}
            </option>
          ))}
        </select>
        <label htmlFor="ambient-volume-input">Volume (5 à 50 %)</label>
        <input
          id="ambient-volume-input"
          type="range"
          name="volumePercent"
          min={5}
          max={50}
          defaultValue={status.volumePercent}
        />
        <div className="admin-btn-row">
          <button type="submit" className="admin-primary-action">
            <Icon i="save" size={15} />
            Enregistrer
          </button>
        </div>
      </AdminActionForm>
      {status.enabled ? (
        <AdminActionForm action={disableAmbientTrack} className="admin-btn-row">
          <button type="submit" className="admin-secondary-action">
            <Icon i="power-off" size={15} />
            Désactiver
          </button>
        </AdminActionForm>
      ) : null}
    </section>
  );
}
