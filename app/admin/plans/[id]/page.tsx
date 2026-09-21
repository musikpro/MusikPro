import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminCreditPlanForm from "@/components/admin/AdminCreditPlanForm";
import { AdminBackLink, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { plans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { creditPlanFeaturesSchema, type CreditPlanOption } from "@/lib/credit-plans/catalog";
import { updatePlan } from "../actions";

export default async function AdminEditCreditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await getServiceDb().select().from(plans).where(eq(plans.id, id)).limit(1);
  if (!row) notFound();
  const features = creditPlanFeaturesSchema.safeParse(row.features);
  if (!features.success) notFound();
  const plan: CreditPlanOption = {
    id: row.id,
    code: row.code,
    name: row.name,
    credits: features.data.credits,
    generationCost: features.data.generationCost,
    priceValue: row.amount,
    currency: "XOF",
    description: row.description || "",
    popular: features.data.popular,
    bonus: features.data.bonus,
    sortOrder: features.data.sortOrder,
    active: row.active,
  };
  return (
    <AdminPage>
      <AdminBackLink href="/admin/plans" />
      <AdminPageHeader eyebrow="Crédits & tarifs" title={`Modifier ${plan.name}`} description="Les modifications seront visibles dans les espaces client réel et démo." />
      <section className="admin-panel admin-editor-card">
        <AdminCreditPlanForm action={updatePlan} plan={plan} />
      </section>
    </AdminPage>
  );
}
