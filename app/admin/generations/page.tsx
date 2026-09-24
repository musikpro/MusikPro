import { desc, eq } from "drizzle-orm";
import { getServiceDb } from "@/db";
import { musicGenerationJobs, user } from "@/db/schema";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import AdminGenerationsTable from "@/components/admin/AdminGenerationsTable";
import { requireAdmin } from "@/lib/auth/session";
import { extractGenreLabel } from "@/lib/ai/songs";

const ROW_LIMIT = 300;
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

function formatDuration(seconds: number) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export default async function AdminGenerationsPage() {
  await requireAdmin();
  const db = getServiceDb();
  const rows = await db
    .select({
      id: musicGenerationJobs.id,
      songGroupId: musicGenerationJobs.songGroupId,
      userEmail: user.email,
      title: musicGenerationJobs.title,
      occasion: musicGenerationJobs.occasion,
      style: musicGenerationJobs.style,
      versionLabel: musicGenerationJobs.versionLabel,
      status: musicGenerationJobs.status,
      provider: musicGenerationJobs.provider,
      model: musicGenerationJobs.model,
      durationSeconds: musicGenerationJobs.durationSeconds,
      audioUrl: musicGenerationJobs.audioUrl,
      failureReason: musicGenerationJobs.failureReason,
      createdAt: musicGenerationJobs.createdAt,
    })
    .from(musicGenerationJobs)
    .leftJoin(user, eq(musicGenerationJobs.userId, user.id))
    .orderBy(desc(musicGenerationJobs.createdAt))
    .limit(ROW_LIMIT);

  const completed = rows.filter((row) => row.status === "completed");
  const failed = rows.filter((row) => row.status === "failed").length;
  const processing = rows.filter((row) => !TERMINAL_STATUSES.has(row.status)).length;
  const avgDurationSeconds = completed.length
    ? Math.round(completed.reduce((total, row) => total + (row.durationSeconds ?? 0), 0) / completed.length)
    : 0;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Production musicale"
        title="Générations"
        description="Suis les chansons produites, leur statut, leur durée et leur qualité."
      />
      <section className="admin-metric-row">
        <AdminMetric icon="music-2" value={rows.length.toLocaleString("fr-FR")} label="Versions générées" note={`Jusqu’à ${ROW_LIMIT} dernières`} />
        <AdminMetric icon="badge-check" value={completed.length.toLocaleString("fr-FR")} label="Terminées" tone="success" />
        <AdminMetric icon="loader-circle" value={processing.toLocaleString("fr-FR")} label="En cours" tone="warning" />
        <AdminMetric icon="circle-x" value={failed.toLocaleString("fr-FR")} label="Échouées" tone={failed ? "warning" : "success"} />
        <AdminMetric icon="timer" value={formatDuration(avgDurationSeconds)} label="Durée moyenne" note="Versions terminées" />
      </section>
      <AdminGenerationsTable
        rows={rows.map((row) => ({
          id: row.id,
          songGroupId: row.songGroupId,
          userEmail: row.userEmail,
          title: row.title,
          occasion: row.occasion,
          style: row.style,
          styleLabel: extractGenreLabel(row.style),
          versionLabel: row.versionLabel,
          status: row.status,
          provider: row.provider,
          model: row.model,
          durationSeconds: row.durationSeconds,
          audioUrl: row.audioUrl,
          failureReason: row.failureReason,
          createdAt: row.createdAt.toISOString(),
        }))}
      />
    </AdminPage>
  );
}
