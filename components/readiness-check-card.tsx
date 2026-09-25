import type { KitStatus } from "@/lib/setup/kit-dashboard";

export type ReadinessVisualStatus = KitStatus | "PASS" | "WARN" | "FAIL" | "UNVERIFIED" | string;

function normalizeStatus(status: ReadinessVisualStatus): KitStatus {
  if (status === "ok" || status === "PASS") return "ok";
  if (status === "warning" || status === "WARN" || status === "UNVERIFIED") return "warning";
  return "missing";
}

export function ReadinessCheckCard({
  label,
  detail,
  status,
  category,
  optional = false,
  variant = "kit",
}: {
  label: string;
  detail: string;
  status: ReadinessVisualStatus;
  category?: string;
  optional?: boolean;
  variant?: "kit" | "production";
}) {
  const normalized = normalizeStatus(status);
  const lightState = normalized === "ok" ? "ok" : normalized === "warning" ? "warning" : "error";

  if (variant === "production") {
    return (
      <article className={`production-state-check ${lightState}`}>
        <div className={`production-state-light ${lightState}`} aria-hidden="true" />
        <div>
          <div className="production-state-check-title">
            <strong>{label}</strong>
            {optional ? <span className="production-state-optional">Optionnel</span> : null}
          </div>
          <p>{detail}</p>
          {category ? <small>{category.toUpperCase()}</small> : null}
        </div>
      </article>
    );
  }

  return (
    <article className={`kit-check ${normalized}`}>
      <span className="kit-dot" aria-hidden="true" />
      <div>
        <div className="kit-check-title-row">
          <strong>{label}</strong>
          {optional ? <span className="kit-check-optional">Optionnel</span> : null}
        </div>
        <p>{detail}</p>
      </div>
    </article>
  );
}
