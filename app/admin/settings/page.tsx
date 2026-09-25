import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentBypassStatus } from "@/lib/settings/payment-bypass";
import { getMusicfulProvider } from "@/lib/ai/musicful";
import { isUpstashConfigured } from "@/lib/cache/upstash";
import PaymentBypassPanel from "./PaymentBypassPanel";
import AudioFormatPanel from "./AudioFormatPanel";
import CountryDetectionPanel from "./CountryDetectionPanel";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [bypassStatus, musicfulProvider, localizationRows] = await Promise.all([
    getPaymentBypassStatus(),
    getMusicfulProvider(),
    getServiceDb().select().from(localizationSettings).limit(1),
  ]);
  const localization = localizationRows[0];

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
        <CountryDetectionPanel
          automaticDetectionEnabled={localization?.automaticDetectionEnabled ?? true}
          cacheTtlHours={Math.round((localization?.countryCacheTtlSeconds ?? 604800) / 3600)}
          fallbackCountryCode={localization?.fallbackCountryCode ?? null}
          upstashConfigured={isUpstashConfigured()}
        />
      </div>
    </AdminPage>
  );
}
