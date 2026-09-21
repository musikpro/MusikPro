import { asc } from "drizzle-orm";
import AdminLibraryCollectionForm from "@/components/admin/AdminLibraryCollectionForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { createLibraryCollection } from "../actions";

export default async function AdminNewCollectionPage() {
  await requireAdmin();
  const styles = await getServiceDb()
    .select({ name: musicStyles.name })
    .from(musicStyles)
    .orderBy(asc(musicStyles.sortOrder));
  return (
    <AdminPage>
      <AdminBackLink href="/admin/library" />
      <AdminPageHeader
        eyebrow="Bibliothèque"
        title="Nouvelle collection"
        description="Compose une sélection éditoriale qui apparaîtra dans Découvrir."
      />
      <AdminLibraryCollectionForm action={createLibraryCollection} styleNames={styles.map((style) => style.name)} />
    </AdminPage>
  );
}
