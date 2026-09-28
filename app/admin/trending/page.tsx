import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import TrendingPanel from "@/components/admin/TrendingPanel";
import { requireAdmin } from "@/lib/auth/session";
import { getTrendingSettings } from "@/lib/trending/settings";
import {
  getGeneratedSongOptionById,
  listPublishedSongsForAdmin,
  listRecentGeneratedSongsForAdmin,
  type GeneratedSongOption,
} from "@/lib/trending/admin";
import { TRENDING_POOL_SIZE } from "@/lib/trending/types";

export default async function AdminTrendingPage() {
  await requireAdmin();
  const [settings, recentSongs, publishedSongs] = await Promise.all([
    getTrendingSettings(),
    listRecentGeneratedSongsForAdmin(TRENDING_POOL_SIZE),
    listPublishedSongsForAdmin(),
  ]);
  // A manual pick can age out of the "most recent" window listRecentGeneratedSongsForAdmin
  // returns — resolve those individually so their label still renders instead of a blank picker.
  const recentIds = new Set(recentSongs.map((song) => song.songGroupId));
  const staleSelectionIds =
    settings.mode === "manual" ? settings.manualSelection.filter((id) => !recentIds.has(id)) : [];
  const staleSongs = (await Promise.all(staleSelectionIds.map((id) => getGeneratedSongOptionById(id)))).filter(
    (song): song is GeneratedSongOption => Boolean(song),
  );
  const songs = [...recentSongs, ...staleSongs];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Engagement"
        title="Tendances"
        description="Choisis les chansons mises en avant dans le widget « Tendances » du tableau de bord client, en automatique ou à la main."
      />
      <TrendingPanel settings={settings} songs={songs} publishedSongs={publishedSongs} />
    </AdminPage>
  );
}
