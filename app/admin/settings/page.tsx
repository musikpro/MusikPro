import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentBypassStatus } from "@/lib/settings/payment-bypass";
import { getMusicfulProvider } from "@/lib/ai/musicful";
import PaymentBypassPanel from "./PaymentBypassPanel";
import AudioFormatPanel from "./AudioFormatPanel";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [bypassStatus, musicfulProvider] = await Promise.all([getPaymentBypassStatus(), getMusicfulProvider()]);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Paramètres"
        description="Réglages transverses de la plateforme, indépendants d’une brique métier précise. Cette page s’enrichira au fil des prochains réglages."
      />
      <div className="admin-settings-grid">
        <PaymentBypassPanel status={bypassStatus} />
        <AudioFormatPanel preferredAudioFormat={musicfulProvider.preferredAudioFormat} />
      </div>
    </AdminPage>
  );
}
