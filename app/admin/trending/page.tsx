import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import TrendingPanel from "@/components/admin/TrendingPanel";
import { requireAdmin } from "@/lib/auth/session";
import { getTrendingSettings } from "@/lib/trending/settings";
import {
  getGeneratedSongOptionById,
  listRecentGeneratedSongsForAdmin,
  type GeneratedSongOption,
} from "@/lib/trending/admin";

/** Nombre de générations récentes proposées dans la liste de choix. */
const RECENT_SONGS_LIMIT = 10;

export default async function AdminTrendingPage() {
  await requireAdmin();
  const [settings, recentSongs] = await Promise.all([
    getTrendingSettings(),
    listRecentGeneratedSongsForAdmin(RECENT_SONGS_LIMIT),
  ]);
  // A pick can age out of the "most recent" window — resolve those individually so their label
  // still renders instead of a blank picker.
  const recentIds = new Set(recentSongs.map((song) => song.songGroupId));
  const staleSelectionIds = settings.manualSelection.filter((id) => !recentIds.has(id));
  const staleSongs = (await Promise.all(staleSelectionIds.map((id) => getGeneratedSongOptionById(id)))).filter(
    (song): song is GeneratedSongOption => Boolean(song),
  );
  const songs = [...recentSongs, ...staleSongs];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Engagement"
        title="Tendances"
        description="Choisis à la main les deux chansons du widget « Tendances » du tableau de bord client, et attribue à chacune sa pochette depuis la page Médias."
      />
      <TrendingPanel settings={settings} songs={songs} />
    </AdminPage>
  );
}
