import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentBypassStatus } from "@/lib/settings/payment-bypass";
import PaymentBypassPanel from "./PaymentBypassPanel";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const bypassStatus = await getPaymentBypassStatus();

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Paramètres"
        description="Réglages transverses de la plateforme, indépendants d’une brique métier précise. Cette page s’enrichira au fil des prochains réglages."
      />
      <div className="admin-settings-grid">
        <PaymentBypassPanel status={bypassStatus} />
      </div>
    </AdminPage>
  );
}
