import Icon from "@/components/banani/Icon";
import {
  SCHEDULER_DELAY_ALERT_MINUTES,
  SCHEDULER_EXPECTED_INTERVAL_MINUTES,
  type SchedulerSnapshot,
} from "@/lib/ops/github-scheduler";

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "medium" });

function formatSeconds(seconds: number | null) {
  if (seconds === null) return "—";
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s` : `${seconds} s`;
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="admin-editor-field">
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

export default function SchedulerPanel({ snapshot }: { snapshot: SchedulerSnapshot }) {
  return (
    <section className="admin-panel admin-bypass-panel is-active">
      <div className="admin-provider-heading">
        <span className="admin-catalog-icon">
          <Icon i="timer" size={20} />
        </span>
        <div>
          <h2>Planificateur de rattrapage des chansons</h2>
          <p>
            Deux planificateurs appellent <code>/api/cron/reconcile-music-jobs</code> pour finaliser, faire échouer ou
            rembourser les générations restées « en cours » quand le client a fermé la page. Le cron Vercel passe une
            fois par jour (5 h UTC, limite du plan Hobby) ; GitHub Actions « Reconcile music jobs » prend le relais
            toutes les {SCHEDULER_EXPECTED_INTERVAL_MINUTES} minutes.
          </p>
        </div>
        {snapshot.ok ? (
          <span
            className={`admin-status ${snapshot.stats.lastRun?.conclusion === "success" ? "is-success" : "is-pending"}`}
          >
            {snapshot.stats.lastRun
              ? snapshot.stats.lastRun.conclusion === "success"
                ? "Dernier passage réussi"
                : snapshot.stats.lastRun.status === "completed"
                  ? "Dernier passage en échec"
                  : "En cours"
              : "Aucun passage"}
          </span>
        ) : (
          <span className="admin-status is-pending">Données indisponibles</span>
        )}
      </div>

      {snapshot.ok ? (
        <>
          <div className="admin-settings-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <Stat label="Dépôt" value={snapshot.repository} note={snapshot.isPrivate ? "Privé" : "Public"} />
            <Stat
              label="Dernier passage"
              value={snapshot.stats.lastRun ? dateFormat.format(new Date(snapshot.stats.lastRun.at)) : "—"}
              note={snapshot.stats.lastRun ? `Déclencheur : ${snapshot.stats.lastRun.event}` : undefined}
            />
            <Stat
              label={`Réussite (${snapshot.stats.sampleSize} derniers passages)`}
              value={snapshot.stats.successRatePercent === null ? "—" : `${snapshot.stats.successRatePercent} %`}
            />
            <Stat
              label="Intervalle réel moyen"
              value={
                snapshot.stats.averageIntervalMinutes === null ? "—" : `${snapshot.stats.averageIntervalMinutes} min`
              }
              note={`Prévu : toutes les ${SCHEDULER_EXPECTED_INTERVAL_MINUTES} min`}
            />
            <Stat label="Durée moyenne d’un passage" value={formatSeconds(snapshot.stats.averageRunSeconds)} />
            <Stat label="Passages sur 30 jours" value={snapshot.stats.runsLast30Days.toLocaleString("fr-FR")} />
            <Stat
              label="Minutes GitHub Actions (30 jours)"
              value={`≈ ${snapshot.stats.estimatedMinutes30Days.toLocaleString("fr-FR")} min`}
              note={
                snapshot.isPrivate
                  ? "Dépôt privé : 2 000 min/mois incluses sur le plan gratuit, au-delà elles sont facturées."
                  : "Dépôt public : minutes gratuites et illimitées."
              }
            />
          </div>
          {snapshot.stats.delayed ? (
            <p className="admin-bypass-warning">
              GitHub retarde le planificateur : intervalle moyen supérieur à {SCHEDULER_DELAY_ALERT_MINUTES} minutes au
              lieu de {SCHEDULER_EXPECTED_INTERVAL_MINUTES}. Les chansons bloquées sont rattrapées avec ce délai.
            </p>
          ) : null}
          {snapshot.isPrivate && snapshot.stats.estimatedMinutes30Days > 2000 ? (
            <p className="admin-bypass-warning">
              Le dépôt est privé et la consommation estimée dépasse les 2 000 minutes gratuites : réduisez la fréquence
              du planificateur ou rendez le dépôt public.
            </p>
          ) : null}
          <p>
            <a href={snapshot.actionsUrl} target="_blank" rel="noopener noreferrer">
              Voir les exécutions sur GitHub
            </a>
          </p>
        </>
      ) : (
        <p className="admin-bypass-warning">
          Impossible de lire les statistiques GitHub pour {snapshot.repository} ({snapshot.reason}). Réessayez dans
          quelques minutes : la page continue de fonctionner normalement.
        </p>
      )}
    </section>
  );
}
