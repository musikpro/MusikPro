import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import AdminLandingSongFeatureForm from "@/components/admin/AdminLandingSongFeatureForm";
import AdminLandingSongFeatureSortableGrid from "@/components/admin/AdminLandingSongFeatureSortableGrid";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { listRecentGeneratedSongsForAdmin } from "@/lib/trending/admin";
import {
  listLandingSongFeatures,
  LANDING_SONG_POOL_SIZE,
  MAX_LANDING_SONG_FEATURES_PER_SECTION,
} from "@/lib/landing-features/admin";
import { createLandingSongFeature } from "./actions";

export default async function AdminLandingFeaturesPage() {
  await requireAdmin();
  const [songs, showcaseRows, libraryRows] = await Promise.all([
    listRecentGeneratedSongsForAdmin(LANDING_SONG_POOL_SIZE),
    listLandingSongFeatures("showcase"),
    listLandingSongFeatures("library"),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Landing publique"
        title="Chansons mises en avant"
        description="Choisis quelles chansons apparaissent dans « Ils ont créé avec MusikPro » et « Bibliothèque populaire » sur la page d’accueil, et dans quel ordre. Une chanson non publiée l’est automatiquement dès qu’elle est assignée ici."
      />
      <AdminTabs
        ariaLabel="Sections de la landing page"
        tabs={[
          { id: "showcase", label: "Ils ont créé avec MusikPro" },
          { id: "library", label: "Bibliothèque populaire" },
        ]}
      >
        <AdminTabPanel id="showcase">
          <div className="admin-source-notice is-connected">
            <Icon i="database-zap" size={18} />
            <div>
              <strong>
                {showcaseRows.length}/{MAX_LANDING_SONG_FEATURES_PER_SECTION} cartes assignées
              </strong>
              <p>La chanson, son style/occasion et son nombre d’écoutes viennent des vraies générations du catalogue.</p>
            </div>
          </div>
          <section className="admin-panel">
            <AdminLandingSongFeatureForm
              section="showcase"
              action={createLandingSongFeature}
              songs={songs}
              usedSongGroupIds={showcaseRows.map((row) => row.songGroupId)}
            />
          </section>
          {showcaseRows.length ? (
            <AdminLandingSongFeatureSortableGrid section="showcase" rows={showcaseRows} />
          ) : (
            <div className="admin-empty-state admin-catalog-empty">
              <Icon i="sparkles" size={24} />
              <strong>Aucune carte assignée</strong>
              <p>Ajoute une chanson ci-dessus pour qu’elle apparaisse dans cette section.</p>
            </div>
          )}
        </AdminTabPanel>
        <AdminTabPanel id="library">
          <div className="admin-source-notice is-connected">
            <Icon i="database-zap" size={18} />
            <div>
              <strong>
                {libraryRows.length}/{MAX_LANDING_SONG_FEATURES_PER_SECTION} cartes assignées
              </strong>
              <p>La chanson, son style/occasion et son nombre d’écoutes viennent des vraies générations du catalogue.</p>
            </div>
          </div>
          <section className="admin-panel">
            <AdminLandingSongFeatureForm
              section="library"
              action={createLandingSongFeature}
              songs={songs}
              usedSongGroupIds={libraryRows.map((row) => row.songGroupId)}
            />
          </section>
          {libraryRows.length ? (
            <AdminLandingSongFeatureSortableGrid section="library" rows={libraryRows} />
          ) : (
            <div className="admin-empty-state admin-catalog-empty">
              <Icon i="sparkles" size={24} />
              <strong>Aucune carte assignée</strong>
              <p>Ajoute une chanson ci-dessus pour qu’elle apparaisse dans cette section.</p>
            </div>
          )}
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
