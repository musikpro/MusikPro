import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/banani/Icon";

export function AdminPage({ children }: { children: ReactNode }) {
  return <main className="admin-dashboard admin-module-page">{children}</main>;
}

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { href: string; label: string; icon?: string };
}) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? (
        <Link className="admin-primary-action" href={action.href}>
          <Icon i={action.icon ?? "plus"} size={17} />
          {action.label}
        </Link>
      ) : null}
    </header>
  );
}

export function AdminSourceNotice({ children }: { children: ReactNode }) {
  return (
    <div className="admin-source-notice">
      <Icon i="database-zap" size={18} />
      <div>
        <strong>Source métier à connecter</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

export function AdminMetric({
  icon,
  value,
  label,
  note,
  tone = "primary",
}: {
  icon: string;
  value: string;
  label: string;
  note?: string;
  tone?: "primary" | "success" | "warning" | "neutral";
}) {
  return (
    <article className="admin-compact-metric">
      <span className={`admin-stat-icon is-${tone}`}>
        <Icon i={icon} size={18} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {note ? <small>{note}</small> : null}
      </div>
    </article>
  );
}

export function AdminEmptyModule({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <section className="admin-panel admin-module-empty">
      <span>
        <Icon i={icon} size={26} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <span className="admin-status is-pending">À connecter</span>
    </section>
  );
}

export function AdminBackLink({ href, label = "Retour" }: { href: string; label?: string }) {
  return (
    <Link className="admin-back-link" href={href}>
      <Icon i="arrow-left" size={17} />
      {label}
    </Link>
  );
}
