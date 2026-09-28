import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminLandingSongFeatureForm from "@/components/admin/AdminLandingSongFeatureForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { landingSongFeatures } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { listPublishedSongsForAdmin } from "@/lib/trending/admin";
import { listLandingSongFeatures, type LandingSongFeatureSection } from "@/lib/landing-features/admin";
import { updateLandingSongFeature } from "../actions";

const SECTION_LABELS: Record<LandingSongFeatureSection, string> = {
  showcase: "Ils ont créé avec MusikPro",
  library: "Bibliothèque populaire",
};

export default async function AdminEditLandingSongFeaturePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await getServiceDb().select().from(landingSongFeatures).where(eq(landingSongFeatures.id, id)).limit(1);
  if (!row) notFound();
  const section = row.section as LandingSongFeatureSection;
  const [songs, sectionRows] = await Promise.all([listPublishedSongsForAdmin(), listLandingSongFeatures(section)]);

  return (
    <AdminPage>
      <AdminBackLink href="/admin/landing-features" />
      <AdminPageHeader
        eyebrow={SECTION_LABELS[section]}
        title="Modifier cette carte"
        description="Les changements apparaîtront sur la page d’accueil publique."
      />
      <section className="admin-panel">
        <AdminLandingSongFeatureForm
          section={section}
          action={updateLandingSongFeature}
          songs={songs}
          usedSongGroupIds={sectionRows.map((r) => r.songGroupId)}
          values={{ id: row.id, songGroupId: row.songGroupId, coverUrlOverride: row.coverUrlOverride }}
        />
      </section>
    </AdminPage>
  );
}
