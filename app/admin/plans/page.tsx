import Link from "next/link";
import AdminCreditPlanSortableGrid from "@/components/admin/AdminCreditPlanSortableGrid";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { plans } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { creditPlanFeaturesSchema, type CreditPlanOption } from "@/lib/credit-plans/catalog";

export default async function AdminPlansPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(plans);
  const catalog = rows
    .flatMap<CreditPlanOption>((plan) => {
      const features = creditPlanFeaturesSchema.safeParse(plan.features);
      if (!features.success) return [];
      return [
        {
          id: plan.id,
          code: plan.code,
          name: plan.name,
          credits: features.data.credits,
          generationCost: features.data.generationCost,
          priceValue: plan.amount,
          currency: "XOF",
          description: plan.description || "Crédits de génération MusikPro",
          popular: features.data.popular,
          bonus: features.data.bonus,
          sortOrder: features.data.sortOrder,
          active: plan.active,
        },
      ];
    })
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "fr"));
  const activeCount = catalog.filter((plan) => plan.active).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Monétisation"
        title="Crédits & tarifs"
        description={`${activeCount} offre${activeCount > 1 ? "s" : ""} active${activeCount > 1 ? "s" : ""} sur ${catalog.length}. L’ordre affiché ici est repris dans les espaces client réel et démo.`}
        action={{ href: "/admin/plans/new", label: "Nouvelle offre" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>
            Les prix de référence sont enregistrés en FCFA et convertis automatiquement lorsque le client change de
            devise.
          </p>
        </div>
      </div>
      {catalog.length ? (
        <AdminCreditPlanSortableGrid plans={catalog} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="coins" size={24} />
          <strong>Aucune offre de crédits enregistrée</strong>
          <p>Ajoute une offre pour la rendre disponible dans les espaces client réel et démo.</p>
          <Link className="admin-primary-action" href="/admin/plans/new">
            <Icon i="plus" size={16} /> Ajouter une offre
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
