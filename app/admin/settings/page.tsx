import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentBypassStatus } from "@/lib/settings/payment-bypass";
import { isUpstashConfigured } from "@/lib/cache/upstash";
import PaymentBypassPanel from "./PaymentBypassPanel";
import CountryDetectionPanel from "./CountryDetectionPanel";
import SchedulerPanel from "./SchedulerPanel";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import { getSchedulerSnapshot } from "@/lib/ops/github-scheduler";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [bypassStatus, localizationRows, schedulerSnapshot] = await Promise.all([
    getPaymentBypassStatus(),
    getServiceDb().select().from(localizationSettings).limit(1),
    getSchedulerSnapshot(),
  ]);
  const localization = localizationRows[0];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Système"
        title="Paramètres"
        description="Réglages transverses de la plateforme, indépendants d’une brique métier précise. Cette page s’enrichira au fil des prochains réglages."
      />
      <AdminTabs
        ariaLabel="Réglages transverses"
        tabs={[
          { id: "payments", label: "Paiements" },
          { id: "country", label: "Détection de pays" },
          { id: "scheduler", label: "Planificateur" },
        ]}
      >
        <AdminTabPanel id="payments">
          <div className="admin-settings-grid">
            <PaymentBypassPanel status={bypassStatus} />
          </div>
        </AdminTabPanel>
        <AdminTabPanel id="country">
          <div className="admin-settings-grid">
            <CountryDetectionPanel
              automaticDetectionEnabled={localization?.automaticDetectionEnabled ?? true}
              cacheTtlHours={Math.round((localization?.countryCacheTtlSeconds ?? 604800) / 3600)}
              fallbackCountryCode={localization?.fallbackCountryCode ?? null}
              upstashConfigured={isUpstashConfigured()}
            />
          </div>
        </AdminTabPanel>
        <AdminTabPanel id="scheduler">
          <div className="admin-settings-grid">
            <SchedulerPanel snapshot={schedulerSnapshot} />
          </div>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
