import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminLibraryCollectionForm from "@/components/admin/AdminLibraryCollectionForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { libraryCollections, musicStyles } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updateLibraryCollection } from "../actions";

export default async function AdminEditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const database = getServiceDb();
  const [[collection], styles] = await Promise.all([
    database.select().from(libraryCollections).where(eq(libraryCollections.id, id)).limit(1),
    database.select({ name: musicStyles.name }).from(musicStyles).orderBy(asc(musicStyles.sortOrder)),
  ]);
  if (!collection) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/library" />
      <AdminPageHeader
        eyebrow="Bibliothèque"
        title={`Modifier ${collection.name}`}
        description="Les changements publiés apparaîtront dans les espaces client réel et démo."
      />
      <AdminLibraryCollectionForm
        action={updateLibraryCollection}
        styleNames={styles.map((style) => style.name)}
        values={collection}
      />
    </AdminPage>
  );
}
