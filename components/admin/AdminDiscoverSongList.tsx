"use client";

import AdminActionForm from "@/components/admin/AdminActionForm";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import Icon from "@/components/banani/Icon";
import type { AdminActionState } from "@/components/admin/useAdminActionToast";
import { downloadAudioFile } from "@/lib/demo/audio-actions";
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
  const showToast = useAdminToast();
  if (songs.length === 0)
    return (
      <div className="admin-empty-state admin-catalog-empty">
        <Icon i="library" size={25} />
        <strong>Aucune chanson pour l’instant</strong>
        <p>Les chansons que les clients choisissent de partager apparaîtront ici.</p>
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
          <button
            type="button"
            className="admin-secondary-action"
            onClick={async () => {
              const ok = await downloadAudioFile(song.audioUrl, song.title);
              showToast(
                ok
                  ? { message: "Téléchargement lancé.", tone: "success" }
                  : { message: "Le téléchargement a échoué. Réessaie dans un instant.", tone: "error" },
              );
            }}
          >
            <Icon i="download" size={15} />
            Télécharger
          </button>
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
