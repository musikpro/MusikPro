import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { getServiceDb } from "@/db";
import { localizationSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { getPaymentBypassStatus } from "@/lib/settings/payment-bypass";
import { isUpstashConfigured } from "@/lib/cache/upstash";
import { getSchedulerStatus } from "@/lib/cron/easycron";
import { AdminTabs, AdminTabPanel } from "@/components/admin/AdminTabs";
import PaymentBypassPanel from "./PaymentBypassPanel";
import CountryDetectionPanel from "./CountryDetectionPanel";
import SchedulerPanel from "./SchedulerPanel";
import PlaybackPanel from "./PlaybackPanel";
import DisplayPageSizesPanel from "./DisplayPageSizesPanel";
import { getAdminDisplaySettings } from "@/lib/settings/admin-display";
import { isExclusivePlaybackEnabled } from "@/lib/settings/playback";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [bypassStatus, localizationRows, schedulerStatus, exclusivePlaybackEnabled, displaySettings] =
    await Promise.all([
      getPaymentBypassStatus(),
      getServiceDb().select().from(localizationSettings).limit(1),
      getSchedulerStatus(),
      isExclusivePlaybackEnabled(),
      getAdminDisplaySettings(),
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
        ariaLabel="Sections des paramètres"
        tabs={[
          { id: "general", label: "Général" },
          { id: "scheduler", label: "Planificateur" },
        ]}
      >
        <AdminTabPanel id="general">
          <div className="admin-settings-grid">
            <PaymentBypassPanel status={bypassStatus} />
            <PlaybackPanel exclusivePlaybackEnabled={exclusivePlaybackEnabled} />
            <DisplayPageSizesPanel
              generationsPerPage={displaySettings.generationsPerPage}
              usersPerPage={displaySettings.usersPerPage}
            />
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
            <SchedulerPanel status={schedulerStatus} />
          </div>
        </AdminTabPanel>
      </AdminTabs>
    </AdminPage>
  );
}
