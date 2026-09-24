import { asc } from "drizzle-orm";
import Link from "next/link";
import AdminCouponsTable from "@/components/admin/AdminCouponsTable";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { getServiceDb } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminCouponsPage() {
  await requireAdmin();
  const rows = await getServiceDb().select().from(coupons).orderBy(asc(coupons.sortOrder), asc(coupons.code));
  const activeCount = rows.filter((coupon) => coupon.active).length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Paiements"
        title="Codes promo"
        description={`${activeCount} code${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} sur ${rows.length}. Applicables par le client avant paiement sur l’écran de choix des crédits.`}
        action={{ href: "/admin/coupons/new", label: "Nouveau code" }}
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Catalogue connecté à Neon</strong>
          <p>Le code, la réduction et les limites d’usage sont appliqués en temps réel au paiement.</p>
        </div>
      </div>
      {rows.length ? (
        <AdminCouponsTable rows={rows.map((row) => ({ ...row, expiresAt: row.expiresAt?.toISOString() ?? null }))} />
      ) : (
        <div className="admin-empty-state admin-catalog-empty">
          <Icon i="ticket-percent" size={24} />
          <strong>Aucun code promo enregistré</strong>
          <p>Crée un code pour permettre à tes clients d’obtenir une réduction avant paiement.</p>
          <Link className="admin-primary-action" href="/admin/coupons/new">
            <Icon i="plus" size={16} /> Ajouter un code
          </Link>
        </div>
      )}
    </AdminPage>
  );
}
