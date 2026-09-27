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
            Jouée automatiquement, à faible volume, sur l&apos;écran d&apos;accueil du tableau de bord (démo publique
            et comptes réels). Elle s&apos;arrête dès que la personne quitte l&apos;accueil.
          </p>
        </div>
        <span className={`admin-status ${status.enabled ? "is-success" : "is-pending"}`}>
          {status.enabled ? "Actif" : "Inactif"}
        </span>
      </div>
      <AdminActionForm
        id={formId}
        key={`${currentSongGroupId ?? "none"}-${status.volumePercent}`}
        action={setAmbientTrack}
        className="admin-stack-form admin-ambient-form"
      >
        <div className="admin-ambient-field">
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
        </div>
        <div className="admin-ambient-field">
          <label htmlFor="ambient-volume-input">Volume (5 à 50 %)</label>
          <input
            id="ambient-volume-input"
            type="range"
            name="volumePercent"
            min={5}
            max={50}
            defaultValue={status.volumePercent}
          />
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
