import AdminDiscoverSettingsForm from "@/components/admin/AdminDiscoverSettingsForm";
import AdminDiscoverSongList from "@/components/admin/AdminDiscoverSongList";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabPanel, AdminTabs } from "@/components/admin/AdminTabs";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getDiscoverSettings, listDiscoverSongsForAdmin } from "@/lib/discover/server";
import DisplayLimitsPanel from "@/components/admin/DisplayLimitsPanel";
import { getDisplayLimits } from "@/lib/settings/display-limits";
import { setDiscoverTitleLimit } from "@/app/admin/settings/actions";
import { TITLE_MAX_CHARS_MAX, TITLE_MAX_CHARS_MIN } from "@/lib/settings/display-limits-constants";
import { hideSongFromDiscover, restoreSongToDiscover, saveDiscoverSettings } from "./actions";

export default async function AdminDiscoverPage() {
  await requireAdmin();
  const [settings, songs, displayLimits] = await Promise.all([
    getDiscoverSettings(),
    listDiscoverSongsForAdmin(),
    getDisplayLimits(),
  ]);
  const hiddenCount = songs.filter((song) => song.hidden).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Contenu"
        title="Découvrir"
        description={`${songs.length - hiddenCount} chanson${songs.length - hiddenCount > 1 ? "s" : ""} affichée${songs.length - hiddenCount > 1 ? "s" : ""} dans la page Découvrir des clients${hiddenCount ? `, ${hiddenCount} retirée${hiddenCount > 1 ? "s" : ""}` : ""}.`}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Partage sur demande</strong>
          <p>
            Une chanson n’apparaît dans Découvrir que si son créateur choisit de la partager (case à la création ou
            bouton dans Mes chansons). Il peut la retirer à tout moment ; vous pouvez retirer n’importe laquelle
            ci-dessous.
          </p>
        </div>
      </div>
      <AdminTabs
        ariaLabel="Réglages de la page Découvrir"
        tabs={[
          { id: "settings", label: "Réglages" },
          { id: "songs", label: `Chansons (${songs.length})` },
          { id: "display", label: "Affichage des titres" },
        ]}
      >
        <AdminTabPanel id="settings">
          <section className="admin-panel">
            <AdminDiscoverSettingsForm action={saveDiscoverSettings} settings={settings} />
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="songs">
          <section className="admin-panel">
            <AdminDiscoverSongList
              songs={songs}
              hideAction={hideSongFromDiscover}
              restoreAction={restoreSongToDiscover}
            />
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="display">
          <DisplayLimitsPanel
            title="Longueur des titres"
            description="Nombre maximal de caractères affichés pour le titre d’une chanson sur sa carte dans la page Découvrir du tableau de bord client. Au-delà, le titre est coupé et terminé par « … », ce qui évite d’encombrer la carte ; le titre complet reste visible au survol."
            action={setDiscoverTitleLimit}
            fields={[
              {
                name: "maxChars",
                label: "Titre sur la carte Découvrir",
                value: displayLimits.discoverTitleMaxChars,
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
