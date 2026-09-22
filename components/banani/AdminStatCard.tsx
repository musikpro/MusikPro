import { translate as t } from "@/lib/i18n/translate";
import Icon from "./Icon";

export const displayName = "Admin Stat Card";
export const shortDescription = "Stat card for admin dashboard";

export default function AdminStatCard({
  icon = "trending-up",
  label = "Revenus du jour",
  value = "45 000 FCFA",
  sub = "+12% vs hier",
  color = "primary",
}: {
  label?: string;
  value?: string;
  sub?: string;
  icon?: string;
  color?: "primary" | "success" | "muted" | "coral";
}) {
  const colorMap = {
    primary: "bg-secondary text-primary",
    success: "bg-green-50 text-success",
    muted: "bg-muted text-muted-foreground",
    coral: "bg-orange-50 text-coral",
  };
  return (
    <div className="bg-card rounded-lg border border-border p-5" style={{ boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.primary}`}>
          <Icon i={icon} size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      {sub && <p className="text-xs text-success font-medium mt-1">{sub}</p>}
    </div>
  );
}
