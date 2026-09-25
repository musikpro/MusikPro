import Link from "next/link";
export function DashboardNav({ admin = false }: { admin?: boolean }) {
  return (
    <div className="sidebar">
      <Link className="btn secondary" href="/dashboard">
        Vue générale
      </Link>
      <Link className="btn secondary" href="/dashboard/billing">
        Abonnement
      </Link>
      <Link className="btn secondary" href="/dashboard/security">
        Sécurité
      </Link>
      {admin && (
        <Link className="btn" href="/admin">
          Administration
        </Link>
      )}
    </div>
  );
}
