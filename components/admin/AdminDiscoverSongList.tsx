"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import type { AdminDiscoverSong } from "@/lib/discover/server";

/** Moderation list of /admin/library: every song of the community, with a one-click remove / put back. */
export default function AdminDiscoverSongList({
  songs,
  hideAction,
  restoreAction,
}: {
  songs: AdminDiscoverSong[];
  hideAction: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  restoreAction: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
}) {
  if (songs.length === 0)
    return (
      <div className="admin-empty-state admin-catalog-empty">
        <Icon i="library" size={25} />
        <strong>Aucune chanson pour l’instant</strong>
        <p>Les chansons terminées des clients apparaîtront ici automatiquement.</p>
      </div>
    );
  return (
    <div
      className="admin-discover-song-list"
      // "play" does not bubble: capture it so starting one song pauses every other one.
      onPlayCapture={(event) => {
        const current = event.target;
        event.currentTarget.querySelectorAll("audio").forEach((audio) => {
          if (audio !== current && !audio.paused) audio.pause();
        });
      }}
    >
      {songs.map((song) => (
        <article key={song.songGroupId} className={`admin-discover-song ${song.hidden ? "is-hidden" : ""}`}>
          <div>
            <strong>{song.title}</strong>
            <small>
              {song.style ?? "Style inconnu"} · {song.plays} écoute{song.plays > 1 ? "s" : ""}
              {song.hidden ? ` · ${song.hiddenBy === "admin" ? "retirée par l’équipe" : "retirée par son créateur"}` : ""}
            </small>
          </div>
          <audio controls preload="none" src={song.audioUrl} aria-label={`Écouter ${song.title}`} />
          <AdminActionForm action={song.hidden ? restoreAction : hideAction}>
            <input type="hidden" name="songGroupId" value={song.songGroupId} />
            <button type="submit" className="admin-secondary-action">
              <Icon i={song.hidden ? "undo-2" : "eye-off"} size={15} />
              {song.hidden ? "Remettre" : "Retirer"}
            </button>
          </AdminActionForm>
        </article>
      ))}
    </div>
  );
}
