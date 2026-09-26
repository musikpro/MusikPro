import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import { countDistinct, count, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { funnelEvents, musicGenerationJobs, payments, user } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { FUNNEL_EVENT } from "@/lib/analytics/funnel";
import { computeFunnelConversionRates } from "@/lib/admin/funnel";
import Icon from "@/components/banani/Icon";

export default async function AdminFunnelPage() {
  await requireAdmin();
  const db = getServiceDb();
  const [[siteVisits], [users], [paid], [creationsStarted], [creationsAbandoned], [generationsCompleted]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(funnelEvents)
        .where(eq(funnelEvents.event, FUNNEL_EVENT.SITE_VISIT)),
      db.select({ value: count() }).from(user),
      db.select({ value: count() }).from(payments).where(eq(payments.status, "paid")),
      db
        .select({ value: countDistinct(funnelEvents.userId) })
        .from(funnelEvents)
        .where(eq(funnelEvents.event, FUNNEL_EVENT.CREATION_STARTED)),
      db
        .select({ value: countDistinct(funnelEvents.userId) })
        .from(funnelEvents)
        .where(eq(funnelEvents.event, FUNNEL_EVENT.CREATION_ABANDONED)),
      db
        .select({ value: countDistinct(musicGenerationJobs.songGroupId) })
        .from(musicGenerationJobs)
        .where(eq(musicGenerationJobs.status, "completed")),
    ]);
  const number = (n: unknown) => Number(n ?? 0);
  const steps = computeFunnelConversionRates([
    { label: "Visites du site", value: number(siteVisits?.value) },
    { label: "Comptes créés", value: number(users?.value) },
    { label: "Créations commencées", value: number(creationsStarted?.value) },
    { label: "Paiements confirmés", value: number(paid?.value) },
    { label: "Générations terminées", value: number(generationsCompleted?.value) },
  ]);
  const firstStepValue = steps[0]?.value || 0;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Conversion"
        title="Entonnoir"
        description="Analyse le parcours depuis la visite du site jusqu’au paiement confirmé."
      />
      <div className="admin-source-notice is-connected">
        <Icon i="database-zap" size={18} />
        <div>
          <strong>Toutes les sources connectées</strong>
          <p>
            Les visites du site (funnel_events) sont désormais comptabilisées, sans cookie ni identifiant persistant —
            un compteur de rendus de page, pas un nombre de visiteurs uniques dédupliqués. Comptes, paiements
            confirmés, créations commencées/abandonnées (funnel_events) et générations terminées
            (music_generation_jobs) proviennent tous de Neon.
          </p>
        </div>
      </div>
      <section className="admin-metric-row">
        <AdminMetric
          icon="eye"
          value={number(siteVisits?.value).toLocaleString("fr-FR")}
          label="Visites du site"
          note="Donnée Neon — non dédupliquée"
        />
        <AdminMetric
          icon="users"
          value={number(users?.value).toLocaleString("fr-FR")}
          label="Comptes créés"
          note="Donnée Neon"
        />
        <AdminMetric
          icon="mouse-pointer-click"
          value={number(creationsStarted?.value).toLocaleString("fr-FR")}
          label="Créations commencées"
          note="Donnée Neon"
        />
        <AdminMetric
          icon="user-x"
          value={number(creationsAbandoned?.value).toLocaleString("fr-FR")}
          label="Créations abandonnées"
          note="Donnée Neon"
          tone="warning"
        />
        <AdminMetric
          icon="badge-check"
          value={number(paid?.value).toLocaleString("fr-FR")}
          label="Paiements confirmés"
          note="Donnée Neon"
          tone="success"
        />
        <AdminMetric
          icon="music-2"
          value={number(generationsCompleted?.value).toLocaleString("fr-FR")}
          label="Générations terminées"
          note="Donnée Neon"
          tone="success"
        />
      </section>
      <article className="admin-panel admin-funnel-steps">
        <div className="admin-panel-heading">
          <div>
            <span className="admin-panel-icon">
              <Icon i="funnel" size={18} />
            </span>
            <div>
              <h2>Étapes du parcours</h2>
              <p>Taux de conversion réel d’une étape à la suivante</p>
            </div>
          </div>
        </div>
        <div className="admin-status-list">
          {steps.map((step, index) => {
            const width = firstStepValue > 0 ? Math.round((step.value / firstStepValue) * 100) : 0;
            const rateLabel =
              index === 0
                ? null
                : step.conversionRate === null
                  ? "Non calculable (étape précédente vide)"
                  : `${Math.round(step.conversionRate * 100)} % depuis l’étape précédente`;
            return (
              <div key={step.label} className="admin-status-row">
                <div>
                  <span>{step.label}</span>
                  <strong>{step.value.toLocaleString("fr-FR")}</strong>
                </div>
                <div
                  className="admin-progress-track"
                  aria-label={`${step.label} : ${width} % de l’étape « ${steps[0]?.label ?? "départ"} »`}
                >
                  <span className="is-success" style={{ width: `${width}%` }} />
                </div>
                {rateLabel ? <small style={{ display: "block", marginTop: 6 }}>{rateLabel}</small> : null}
              </div>
            );
          })}
        </div>
      </article>
    </AdminPage>
  );
}
