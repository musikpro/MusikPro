import Link from "next/link";
import Icon from "@/components/banani/Icon";

export type AdminDashboardData = {
  users: number;
  plans: number;
  activeSubscriptions: number;
  paidPayments: number;
  failedPayments: number;
  pendingPayments: number;
  monthRevenue: number;
  todayRevenue: number;
  paymentSuccessRate: number;
  recentPayments: Array<{
    id: string;
    user: string;
    plan: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
  }>;
  recentUsers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    verified: boolean;
  }>;
};

const money = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("fr-FR");

function StatCard({
  icon,
  label,
  value,
  note,
  tone = "primary",
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  tone?: "primary" | "success" | "coral" | "neutral";
}) {
  return (
    <article className="admin-stat-card">
      <span className={`admin-stat-icon is-${tone}`}>
        <Icon i={icon} size={19} />
      </span>
      <strong>{value}</strong>
      <h2>{label}</h2>
      <p>{note}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "paid" ? "success" : status === "failed" ? "danger" : "pending";
  const label = status === "paid" ? "Réussi" : status === "failed" ? "Échoué" : "En attente";
  return <span className={`admin-status is-${tone}`}>{label}</span>;
}

export default function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const paymentTotal = data.paidPayments + data.failedPayments + data.pendingPayments;
  const statusRows = [
    { label: "Paiements réussis", value: data.paidPayments, tone: "success" },
    { label: "En attente", value: data.pendingPayments, tone: "pending" },
    { label: "Échoués", value: data.failedPayments, tone: "danger" },
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Pilotage de la plateforme</span>
          <h1>Vue d’ensemble</h1>
          <p>Les indicateurs sont calculés à partir des données MusikPro disponibles au moment de l’ouverture.</p>
        </div>
        <div className="admin-header-actions">
          <span className="admin-live-badge">
            <span />
            Connecté
          </span>
          <span className="admin-period">
            <Icon i="calendar-days" size={16} />
            Ce mois
          </span>
        </div>
      </header>

      <section className="admin-kpi-grid" aria-label="Indicateurs principaux">
        <StatCard
          icon="banknote"
          label="Revenus du jour"
          value={`${money.format(data.todayRevenue)} FCFA`}
          note="Paiements confirmés aujourd’hui"
        />
        <StatCard
          icon="chart-no-axes-column-increasing"
          label="Revenus du mois"
          value={`${money.format(data.monthRevenue)} FCFA`}
          note="Paiements confirmés ce mois"
        />
        <StatCard
          icon="users"
          label="Utilisateurs"
          value={number.format(data.users)}
          note="Comptes enregistrés"
          tone="neutral"
        />
        <StatCard
          icon="music-2"
          label="Packs actifs"
          value={number.format(data.plans)}
          note="Offres disponibles"
          tone="coral"
        />
        <StatCard
          icon="refresh-cw"
          label="Abonnements actifs"
          value={number.format(data.activeSubscriptions)}
          note="Abonnements actuellement actifs"
          tone="success"
        />
        <StatCard
          icon="badge-check"
          label="Succès paiement"
          value={`${data.paymentSuccessRate.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
          note={`${number.format(paymentTotal)} transaction${paymentTotal > 1 ? "s" : ""} suivie${paymentTotal > 1 ? "s" : ""}`}
          tone="success"
        />
      </section>

      <section className="admin-insight-grid">
        <article className="admin-panel admin-payment-health">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="activity" size={18} />
              </span>
              <div>
                <h2>Santé des paiements</h2>
                <p>Répartition des statuts enregistrés</p>
              </div>
            </div>
            <Link href="/admin/payments">Voir les paiements</Link>
          </div>
          <div className="admin-status-list">
            {statusRows.map((row) => {
              const percentage = paymentTotal ? Math.round((row.value / paymentTotal) * 100) : 0;
              return (
                <div key={row.label} className="admin-status-row">
                  <div>
                    <span>{row.label}</span>
                    <strong>{number.format(row.value)}</strong>
                  </div>
                  <div className="admin-progress-track" aria-label={`${row.label} : ${percentage} %`}>
                    <span className={`is-${row.tone}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="admin-panel admin-product-coverage">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="music-2" size={18} />
              </span>
              <div>
                <h2>Données musicales</h2>
                <p>État de connexion des modules produit</p>
              </div>
            </div>
          </div>
          <ul className="admin-coverage-list">
            <li>
              <span className={data.plans > 0 ? "is-ready" : "is-waiting"}>
                <Icon i={data.plans > 0 ? "circle-check" : "clock-3"} size={16} />
              </span>
              <div>
                <strong>Packs et soldes</strong>
                <small>{data.plans > 0 ? "Données disponibles" : "Aucun pack réel enregistré"}</small>
              </div>
            </li>
            <li>
              <span className="is-waiting">
                <Icon i="clock-3" size={16} />
              </span>
              <div>
                <strong>Générations musicales</strong>
                <small>Source réelle à connecter</small>
              </div>
            </li>
            <li>
              <span className="is-waiting">
                <Icon i="clock-3" size={16} />
              </span>
              <div>
                <strong>Styles et occasions</strong>
                <small>Catalogue à connecter</small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <section className="admin-list-grid">
        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="credit-card" size={18} />
              </span>
              <div>
                <h2>Paiements récents</h2>
                <p>Dernières transactions enregistrées</p>
              </div>
            </div>
            <Link href="/admin/payments">Voir tout</Link>
          </div>
          {data.recentPayments.length ? (
            <div className="admin-record-list">
              {data.recentPayments.map((payment) => (
                <div className="admin-record" key={payment.id}>
                  <span className="admin-record-icon">
                    <Icon i="receipt-text" size={17} />
                  </span>
                  <div>
                    <strong>{payment.user}</strong>
                    <small>
                      {payment.plan} · {payment.createdAt.toLocaleDateString("fr-FR")}
                    </small>
                  </div>
                  <div className="admin-record-value">
                    <strong>
                      {money.format(payment.amount)} {payment.currency}
                    </strong>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <Icon i="receipt-text" size={22} />
              <strong>Aucun paiement récent</strong>
              <p>Les prochaines transactions apparaîtront ici.</p>
            </div>
          )}
        </article>

        <article className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="admin-panel-icon">
                <Icon i="user-round-plus" size={18} />
              </span>
              <div>
                <h2>Nouveaux utilisateurs</h2>
                <p>Derniers comptes créés</p>
              </div>
            </div>
            <Link href="/admin/users">Voir tout</Link>
          </div>
          {data.recentUsers.length ? (
            <div className="admin-record-list">
              {data.recentUsers.map((entry) => (
                <div className="admin-record" key={entry.id}>
                  <span className="admin-user-initial" aria-hidden="true">
                    {entry.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{entry.name}</strong>
                    <small>{entry.email}</small>
                  </div>
                  <div className="admin-record-value">
                    <strong>{entry.createdAt.toLocaleDateString("fr-FR")}</strong>
                    <span className={`admin-status ${entry.verified ? "is-success" : "is-pending"}`}>
                      {entry.verified ? "Vérifié" : "À vérifier"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <Icon i="users" size={22} />
              <strong>Aucun utilisateur récent</strong>
              <p>Les prochains comptes apparaîtront ici.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
