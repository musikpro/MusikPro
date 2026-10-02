import Icon from "@/components/banani/Icon";
import type { SchedulerStatus } from "@/lib/cron/github-actions";
import SchedulerRefreshButton from "./SchedulerRefreshButton";

function formatSeconds(seconds: number | null) {
  if (seconds === null) return "—";
  return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;
}

function conclusionTone(conclusion: string | null, status: string) {
  if (status !== "completed") return { label: "En cours", tone: "is-pending" };
  if (conclusion === "success") return { label: "Succès", tone: "is-success" };
  return { label: conclusion === "failure" ? "Échec" : (conclusion ?? "Inconnu"), tone: "is-danger" };
}

export default function SchedulerPanel({ status }: { status: SchedulerStatus }) {
  const active = status.ok && status.workflowState === "active";
  const last = status.ok ? status.stats.last : null;
  // Voyant selon le dernier passage (et non le taux sur 24 h, qui garderait d'anciens échecs déjà corrigés) :
  // vert = actif et dernier passage réussi, rouge = désactivé ou dernier passage en échec, orange = le reste.
  const tone = !status.ok
    ? "is-pending"
    : !active || (last?.status === "completed" && last.conclusion !== "success")
      ? "is-danger"
      : last?.conclusion === "success"
        ? "is-success"
        : "is-pending";
  const headline = tone === "is-success" ? "Actif" : tone === "is-danger" ? "Bloquant" : "À vérifier";
  const lastTone = last ? conclusionTone(last.conclusion, last.status) : null;
  const ageMinutes =
    status.ok && last ? Math.max(0, Math.round((status.fetchedAt - Date.parse(last.at)) / 60_000)) : null;

  return (
    <section className={`admin-panel admin-bypass-panel ${tone === "is-success" ? "is-active" : ""}`}>
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="timer" size={20} />
        </span>
        <div>
          <h2>Planificateur de rattrapage des chansons</h2>
          <p>
            Appelle toutes les 5 minutes la route /api/cron/reconcile-music-jobs pour finaliser, faire échouer ou
            rembourser les générations restées « en cours » quand le client a fermé la page. Exécuté par un workflow
            GitHub Actions ; le cron Vercel (plan Hobby) ne passe qu’une fois par jour, à 5 h.
          </p>
        </div>
        <span className={`admin-status ${tone}`}>{headline}</span>
      </div>

      {status.ok ? (
        <>
          <dl style={{ display: "grid", gap: 10, margin: "12px 0" }}>
            <div>
              <dt>Dernier passage</dt>
              <dd>
                {last && lastTone ? (
                  <>
                    <span className={`admin-status ${lastTone.tone}`}>{lastTone.label}</span>{" "}
                    {new Date(last.at).toLocaleString("fr-FR")}
                    {ageMinutes !== null ? ` (il y a ${ageMinutes} min)` : ""} · durée {formatSeconds(last.seconds)}
                  </>
                ) : (
                  "Aucun passage sur les dernières 24 h."
                )}
              </dd>
            </div>
            <div>
              <dt>Passages sur 24 h</dt>
              <dd>
                {status.stats.runs24h.toLocaleString("fr-FR")} dont {status.stats.failures24h.toLocaleString("fr-FR")}{" "}
                en échec
              </dd>
            </div>
            <div>
              <dt>Durée moyenne d’un passage</dt>
              <dd>{formatSeconds(status.stats.averageSeconds)}</dd>
            </div>
            <div>
              <dt>Minutes d’exécution sur 24 h (estimées)</dt>
              <dd>
                {status.stats.estimatedMinutes24h.toLocaleString("fr-FR")} min — gratuites : le dépôt{" "}
                {status.repository} est public, GitHub n’y facture pas les minutes Actions.
              </dd>
            </div>
          </dl>
          <p className="admin-bypass-warning" style={{ background: "transparent", border: "none", padding: 0 }}>
            Un passage en échec signifie le plus souvent que le secret CRON_SECRET de GitHub ne correspond pas à celui
            de Vercel (réponse 401). Regarde le détail du dernier passage dans l’onglet Actions.
          </p>
        </>
      ) : (
        <p className="admin-bypass-warning">
          <Icon i="triangle-alert" size={14} />
          Impossible de lire l’état depuis GitHub : {status.reason}. Réessaie dans un instant avec « Actualiser ».
        </p>
      )}

      <div className="admin-btn-row" style={{ marginTop: 12 }}>
        <SchedulerRefreshButton />
        {status.ok ? (
          <a className="admin-secondary-action" href={status.actionsUrl} target="_blank" rel="noopener noreferrer">
            <Icon i="external-link" size={15} />
            Ouvrir sur GitHub
          </a>
        ) : null}
      </div>
    </section>
  );
}
