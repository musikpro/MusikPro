import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AmbientMusicPanel from "@/components/admin/AmbientMusicPanel";
import { requireAdmin } from "@/lib/auth/session";
import { getGeneratedSongOptionById, listRecentGeneratedSongsForAdmin } from "@/lib/trending/admin";
import { getAmbientTrackStatus } from "@/lib/settings/ambient-track";
import { AMBIENT_SONG_POOL_SIZE } from "@/lib/settings/ambient-track-constants";

export default async function AmbientMusicAdminPage() {
  await requireAdmin();
  const [status, recentSongs] = await Promise.all([
    getAmbientTrackStatus(),
    listRecentGeneratedSongsForAdmin(AMBIENT_SONG_POOL_SIZE),
  ]);
  // The currently configured song can have aged out of the "most recent" window above — resolve
  // it directly so the picker still shows its real title (and lets it be previewed) instead of a
  // blank "Choisis une chanson".
  let songs = recentSongs;
  if (status.songGroupId && !recentSongs.some((song) => song.songGroupId === status.songGroupId)) {
    const currentSong = await getGeneratedSongOptionById(status.songGroupId);
    if (currentSong) songs = [...recentSongs, currentSong];
  }
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration"
        title="Musique d'ambiance"
        description="Choisis une chanson du catalogue pour qu'elle joue en fond sonore sur l'accueil du tableau de bord."
      />
      <AmbientMusicPanel status={status} songs={songs} />
    </AdminPage>
  );
}
