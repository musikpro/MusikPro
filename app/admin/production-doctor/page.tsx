import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";
import { readDoctorReport } from "@/lib/doctor/read-report";
import { ReadinessCheckCard } from "@/components/readiness-check-card";

export default async function ProductionDoctorPage() {
  await requireAdmin();
  const report = readDoctorReport();
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Mise en production"
        title="État production"
        description="Diagnostic local de préparation à la production. Le rapport CLI reste la source de vérité."
      />
      {!report ? (
        <section className="admin-panel admin-module-empty">
          <span>
            <Icon i="stethoscope" size={26} />
          </span>
          <h2>Aucun rapport généré</h2>
          <p>Lance les commandes ci-dessous pour produire le diagnostic hors ligne puis le contrôle connecté.</p>
          <div className="admin-command-list">
            <code>npm run doctor:production</code>
            <code>npm run doctor:production:online</code>
          </div>
        </section>
      ) : (
        <>
          <section className="admin-doctor-score">
            <div>
              <span>Score de conformité</span>
              <strong>
                {report.score}
                <small>/100</small>
              </strong>
            </div>
            <span className={`admin-status ${report.score >= 80 ? "is-success" : "is-pending"}`}>{report.verdict}</span>
          </section>
          <section className="admin-check-list">
            {report.results.map((result) => (
              <ReadinessCheckCard
                key={result.id}
                label={result.label}
                detail={result.detail}
                status={result.status}
                category={result.category}
                optional={Boolean(result.optional)}
                variant="production"
              />
            ))}
          </section>
        </>
      )}
    </AdminPage>
  );
}
