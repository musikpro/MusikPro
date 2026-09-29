import AdminDiscoverSettingsForm from "@/components/admin/AdminDiscoverSettingsForm";
import AdminDiscoverSongList from "@/components/admin/AdminDiscoverSongList";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabPanel, AdminTabs } from "@/components/admin/AdminTabs";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { getDiscoverSettings, listDiscoverSongsForAdmin } from "@/lib/discover/server";
import { hideSongFromDiscover, restoreSongToDiscover, saveDiscoverSettings } from "./actions";

export default async function AdminDiscoverPage() {
  await requireAdmin();
  const [settings, songs] = await Promise.all([getDiscoverSettings(), listDiscoverSongsForAdmin()]);
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
          <strong>Ajout automatique</strong>
          <p>
            Toutes les chansons terminées des clients apparaissent dans Découvrir sans action de votre part. Chaque
            créateur peut retirer les siennes ; vous pouvez retirer n’importe laquelle ci-dessous.
          </p>
        </div>
      </div>
      <AdminTabs
        ariaLabel="Réglages de la page Découvrir"
        tabs={[
          { id: "settings", label: "Réglages" },
          { id: "songs", label: `Chansons (${songs.length})` },
        ]}
      >
        <AdminTabPanel id="settings">
          <section className="admin-panel">
            <AdminDiscoverSettingsForm action={saveDiscoverSettings} settings={settings} />
          </section>
        </AdminTabPanel>
        <AdminTabPanel id="songs">
          <section className="admin-panel">
            <AdminDiscoverSongList songs={songs} hideAction={hideSongFromDiscover} restoreAction={restoreSongToDiscover} />
          </section>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
