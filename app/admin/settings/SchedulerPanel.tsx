import Icon from "@/components/banani/Icon";
import { STALE_AFTER_MINUTES, type SchedulerStatus } from "@/lib/cron/easycron";
import SchedulerRefreshButton from "./SchedulerRefreshButton";

function formatSeconds(seconds: number | null) {
  if (seconds === null) return "—";
  return seconds < 60
    ? `${seconds} s`
    : `${Math.floor(seconds / 60)} min ${String(Math.round(seconds % 60)).padStart(2, "0")} s`;
}

export default function SchedulerPanel({ status }: { status: SchedulerStatus }) {
  const last = status.ok ? status.stats.last : null;
  const ageMinutes = status.ok && last ? Math.max(0, Math.round((status.fetchedAt - last.at) / 60_000)) : null;
  const stale = ageMinutes !== null && ageMinutes > STALE_AFTER_MINUTES;
  // Voyant selon le dernier passage (et non le taux d'échec de l'échantillon, qui garderait d'anciens échecs déjà
  // corrigés) : vert = dernier passage réussi et récent, rouge = dernier passage en échec,
  // orange = clé absente, EasyCron injoignable, aucun passage ou passage trop ancien.
  const tone = !status.ok
    ? "is-pending"
    : last && !last.ok
      ? "is-danger"
      : last && !stale
        ? "is-success"
        : "is-pending";
  const headline = tone === "is-success" ? "Actif" : tone === "is-danger" ? "Bloquant" : "À vérifier";

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
            rembourser les générations restées « en cours » quand le client a fermé la page. Exécuté par EasyCron ; le
            cron Vercel (plan Hobby) ne passe qu’une fois par jour, à 5 h.
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
                {last ? (
                  <>
                    <span className={`admin-status ${last.ok ? "is-success" : "is-danger"}`}>
                      {last.ok ? "Succès" : "Échec"}
                    </span>{" "}
                    {new Date(last.at).toLocaleString("fr-FR")}
                    {ageMinutes !== null ? ` (il y a ${ageMinutes} min)` : ""} · HTTP {last.httpCode} · durée{" "}
                    {formatSeconds(last.seconds)}
                  </>
                ) : (
                  "Aucun passage enregistré par EasyCron."
                )}
              </dd>
            </div>
            {stale ? (
              <div>
                <dt>Attention</dt>
                <dd>
                  Aucun passage depuis plus de {STALE_AFTER_MINUTES} min alors que la tâche est prévue toutes les 5 min
                  : vérifie qu’elle est activée sur EasyCron.
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Derniers passages lus</dt>
              <dd>
                {status.stats.runsSampled.toLocaleString("fr-FR")} sur environ {status.stats.coveredHours} h, dont{" "}
                {status.stats.failuresSampled.toLocaleString("fr-FR")} en échec
              </dd>
            </div>
            <div>
              <dt>Durée moyenne d’un passage</dt>
              <dd>{formatSeconds(status.stats.averageSeconds)}</dd>
            </div>
          </dl>
          <p className="admin-bypass-warning" style={{ background: "transparent", border: "none", padding: 0 }}>
            Un passage en échec avec le code 401 signifie que l’en-tête Authorization d’EasyCron ne correspond pas au
            CRON_SECRET de Vercel. EasyCron t’envoie aussi un e-mail dès le premier échec.
          </p>
        </>
      ) : (
        <p className="admin-bypass-warning">
          <Icon i="triangle-alert" size={14} />
          Impossible de lire l’état depuis EasyCron : {status.reason}
          {status.configured ? " Réessaie dans un instant avec « Actualiser »." : ""}
        </p>
      )}

      <div className="admin-btn-row" style={{ marginTop: 12 }}>
        <SchedulerRefreshButton />
        <a className="admin-secondary-action" href={status.dashboardUrl} target="_blank" rel="noopener noreferrer">
          <Icon i="external-link" size={15} />
          Ouvrir EasyCron
        </a>
      </div>
    </section>
  );
}
