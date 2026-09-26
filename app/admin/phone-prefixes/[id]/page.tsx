import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminPhonePrefixForm from "@/components/admin/AdminPhonePrefixForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { phonePrefixes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { updatePhonePrefix } from "../actions";

export default async function AdminEditPhonePrefixPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [prefix] = await getServiceDb().select().from(phonePrefixes).where(eq(phonePrefixes.id, id)).limit(1);
  if (!prefix) notFound();
  return (
    <AdminPage>
      <AdminBackLink href="/admin/phone-prefixes" />
      <AdminPageHeader
        eyebrow="Téléphonie"
        title={`Modifier ${prefix.countryName}`}
        description="Les changements apparaîtront dans le parcours de paiement client."
      />
      <AdminPhonePrefixForm action={updatePhonePrefix} prefix={prefix} />
    </AdminPage>
  );
}
