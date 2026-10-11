import { asc } from "drizzle-orm";
import Link from "next/link";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import DisplayLimitsPanel from "@/components/admin/DisplayLimitsPanel";
import AdminMusicStyleSortableGrid from "@/components/admin/AdminMusicStyleSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getDisplayLimits } from "@/lib/settings/display-limits";
import { MUSIC_STYLES_MAX_COUNT_MAX, MUSIC_STYLES_MAX_COUNT_MIN } from "@/lib/settings/display-limits-constants";
import { setLandingMusicStylesLimit } from "@/app/admin/settings/actions";

export default async function AdminMusicStylesPage() {
  await requireAdmin();
  const rows = await getServiceDb()
    .select()
    .from(musicStyles)
    .orderBy(asc(musicStyles.sortOrder), asc(musicStyles.name));
  const displayLimits = await getDisplayLimits();
  const activeCount = rows.filter((style) => style.active).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Configuration musicale"
        title="Styles musicaux"
        description={`${activeCount} style${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Les changements sont appliqués au parcours client réel.`}
        action={{ href: "/admin/music-styles/new", label: "Nouveau style" }}
      />

      <AdminTabs
        ariaLabel="Réglages des styles musicaux"
        tabs={[
          { id: "catalog", label: "Catalogue" },
          { id: "landing", label: "Affichage sur la landing" },
        ]}
      >
        <AdminTabPanel id="catalog">
          <div className="admin-source-notice is-connected">
            <Icon i="database-zap" size={18} />
            <div>
              <strong>Catalogue connecté à Neon</strong>
              <p>Seuls les styles actifs sont proposés aux clients lors de la création d’une chanson.</p>
            </div>
          </div>

          {rows.length ? (
            <AdminMusicStyleSortableGrid styles={rows} />
          ) : (
            <div className="admin-empty-state admin-catalog-empty">
              <Icon i="search-x" size={24} />
              <strong>Aucun style enregistré</strong>
              <p>Ajoute un style musical pour le rendre disponible dans le parcours client.</p>
              <Link className="admin-primary-action" href="/admin/music-styles/new">
                <Icon i="plus" size={16} />
                Ajouter un style
              </Link>
            </div>
          )}
        </AdminTabPanel>
        <AdminTabPanel id="landing">
          <DisplayLimitsPanel
            title="Styles affichés sur la landing"
            description="Nombre de styles musicaux montrés dans la section « Tous les styles africains » de la page d’accueil, dans l’ordre du catalogue. S’il y en a davantage, la liste se termine par « … » pour indiquer qu’il en existe d’autres."
            action={setLandingMusicStylesLimit}
            fields={[
              {
                name: "maxCount",
                label: "Styles affichés",
                value: displayLimits.landingMusicStylesMaxCount,
                min: MUSIC_STYLES_MAX_COUNT_MIN,
                max: MUSIC_STYLES_MAX_COUNT_MAX,
                unit: "styles",
              },
            ]}
          />
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
