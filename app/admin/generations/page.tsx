import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminGenerationsTable from "@/components/admin/AdminGenerationsTable";
import { requireAdmin } from "@/lib/auth/session";
import { getGenerationsStats, listGenerationsPage } from "@/lib/admin/generations";
import { getGenerationsPerPage } from "@/lib/settings/admin-display";

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export default async function AdminGenerationsPage() {
  await requireAdmin();
  const pageSize = await getGenerationsPerPage();
  const [stats, initial] = await Promise.all([
    getGenerationsStats(),
    listGenerationsPage({ page: 1, pageSize, status: "all", query: "" }),
  ]);
  const { completed, failed, processing, avgDurationSeconds } = stats;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Production musicale"
        title="Générations"
        description="Suis les chansons produites, leur statut, leur durée et leur qualité."
      />
      <section className="admin-metric-row">
        <AdminMetric
          icon="music-2"
          value={stats.total.toLocaleString("fr-FR")}
          label="Versions générées"
          note="Depuis le début"
        />
        <AdminMetric icon="badge-check" value={completed.toLocaleString("fr-FR")} label="Terminées" tone="success" />
        <AdminMetric icon="loader-circle" value={processing.toLocaleString("fr-FR")} label="En cours" tone="warning" />
        <AdminMetric
          icon="circle-x"
          value={failed.toLocaleString("fr-FR")}
          label="Échouées"
          tone={failed ? "warning" : "success"}
        />
        <AdminMetric
          icon="timer"
          value={formatDuration(avgDurationSeconds)}
          label="Durée moyenne"
          note="Versions terminées"
        />
      </section>
      <AdminGenerationsTable initial={initial} />
    </AdminPage>
  );
}
