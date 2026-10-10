import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import AdminLandingSongFeatureForm from "@/components/admin/AdminLandingSongFeatureForm";
import AdminLandingSongFeatureSortableGrid from "@/components/admin/AdminLandingSongFeatureSortableGrid";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { listRecentGeneratedSongsForAdmin } from "@/lib/trending/admin";
import { getFeaturedSongPlacements } from "@/lib/featured-songs/server";
import {
  listLandingSongFeatures,
  LANDING_SONG_FEATURE_SECTION_LABELS,
  LANDING_SONG_FEATURE_SECTIONS,
  LANDING_SONG_POOL_SIZE,
  MAX_LANDING_SONG_FEATURES_PER_SECTION,
  type LandingSongFeatureSection,
} from "@/lib/landing-features/admin";
import { createLandingSongFeature } from "./actions";

const SECTION_DESCRIPTIONS: Record<LandingSongFeatureSection, string> = {
  showcase: "Cartes affichées dans la section « Ils ont créé avec MusikPro » de la page d’accueil publique.",
  library: "Cartes affichées dans la section « Bibliothèque populaire » de la page d’accueil publique.",
};

export default async function AdminLandingFeaturesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requireAdmin();
  const { tab } = await searchParams;
  // The edit page links back with ?tab=<section>, so the owner returns to the tab they came from
  // instead of always landing on the first one.
  const defaultTab =
    LANDING_SONG_FEATURE_SECTIONS.find((section) => section === tab) ?? LANDING_SONG_FEATURE_SECTIONS[0];
  const [songs, showcaseRows, libraryRows, usedPlacements] = await Promise.all([
    listRecentGeneratedSongsForAdmin(LANDING_SONG_POOL_SIZE),
    listLandingSongFeatures("showcase"),
    listLandingSongFeatures("library"),
    // Landing + Tendances : une chanson déjà mise en avant quelque part n'est plus proposée ailleurs.
    getFeaturedSongPlacements(),
  ]);
  const rowsBySection = { showcase: showcaseRows, library: libraryRows };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Landing publique"
        title="Chansons mises en avant"
        description="Choisis quelles chansons apparaissent dans « Ils ont créé avec MusikPro » et « Bibliothèque populaire » sur la page d’accueil, et dans quel ordre. Une chanson non publiée l’est automatiquement dès qu’elle est assignée ici. Une chanson mise en avant ne peut plus être supprimée."
      />
      <AdminTabs
        ariaLabel="Sections de la landing page"
        defaultTab={defaultTab}
        tabs={LANDING_SONG_FEATURE_SECTIONS.map((section) => ({
          id: section,
          label: LANDING_SONG_FEATURE_SECTION_LABELS[section],
        }))}
      >
        {LANDING_SONG_FEATURE_SECTIONS.map((section) => {
          const rows = rowsBySection[section];
          const label = LANDING_SONG_FEATURE_SECTION_LABELS[section];
          return (
            <AdminTabPanel key={section} id={section}>
              <div className="admin-source-notice is-connected">
                <Icon i="database-zap" size={18} />
                <div>
                  <strong>
                    « {label} » — {rows.length}/{MAX_LANDING_SONG_FEATURES_PER_SECTION} cartes assignées
                  </strong>
                  <p>
                    {SECTION_DESCRIPTIONS[section]} La chanson, son style/occasion et son nombre d’écoutes viennent des
                    vraies générations du catalogue.
                  </p>
                </div>
              </div>
              <section className="admin-panel">
                <AdminLandingSongFeatureForm
                  section={section}
                  sectionLabel={label}
                  action={createLandingSongFeature}
                  songs={songs}
                  usedPlacements={usedPlacements}
                />
              </section>
              {rows.length ? (
                <AdminLandingSongFeatureSortableGrid section={section} rows={rows} />
              ) : (
                <div className="admin-empty-state admin-catalog-empty">
                  <Icon i="layout-grid" size={24} />
                  <strong>Aucune carte assignée dans « {label} »</strong>
                  <p>Ajoute une chanson ci-dessus pour qu’elle apparaisse dans cette section.</p>
                </div>
              )}
            </AdminTabPanel>
          );
        })}
      </AdminTabs>
    </AdminPage>
  );
}
