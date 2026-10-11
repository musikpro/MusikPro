import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import DisplayLimitsPanel from "@/components/admin/DisplayLimitsPanel";
import TrendingPanel from "@/components/admin/TrendingPanel";
import { setTrendingTitleLimit } from "@/app/admin/settings/actions";
import { getDisplayLimits } from "@/lib/settings/display-limits";
import { TITLE_MAX_CHARS_MAX, TITLE_MAX_CHARS_MIN } from "@/lib/settings/display-limits-constants";
import { requireAdmin } from "@/lib/auth/session";
import { getTrendingSettings } from "@/lib/trending/settings";
import { getLandingSongPlacements } from "@/lib/featured-songs/server";
import {
  getGeneratedSongOptionById,
  listRecentGeneratedSongsForAdmin,
  type GeneratedSongOption,
} from "@/lib/trending/admin";

/** Nombre de générations récentes proposées dans la liste de choix. */
const RECENT_SONGS_LIMIT = 10;

export default async function AdminTrendingPage() {
  await requireAdmin();
  const [settings, recentSongs, landingPlacements, displayLimits] = await Promise.all([
    getTrendingSettings(),
    listRecentGeneratedSongsForAdmin(RECENT_SONGS_LIMIT),
    // Chansons déjà mises en avant sur la landing : elles ne sont plus proposées dans Tendances.
    getLandingSongPlacements(),
    getDisplayLimits(),
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
      <AdminTabs
        ariaLabel="Réglages de Tendances"
        tabs={[
          { id: "songs", label: "Chansons" },
          { id: "display", label: "Affichage des titres" },
        ]}
      >
        <AdminTabPanel id="songs">
          <TrendingPanel settings={settings} songs={songs} landingPlacements={landingPlacements} />
        </AdminTabPanel>
        <AdminTabPanel id="display">
          <DisplayLimitsPanel
            title="Longueur des titres"
            description="Nombre maximal de caractères affichés pour le titre d’une chanson dans « Tendances » du tableau de bord client. Au-delà, le titre est coupé et terminé par « … », ce qui laisse la pochette visible."
            action={setTrendingTitleLimit}
            fields={[
              {
                name: "maxChars",
                label: "Titre dans « Tendances »",
                value: displayLimits.trendingTitleMaxChars,
                min: TITLE_MAX_CHARS_MIN,
                max: TITLE_MAX_CHARS_MAX,
                unit: "caractères",
              },
            ]}
          />
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
