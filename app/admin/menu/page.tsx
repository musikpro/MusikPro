import Link from "next/link";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminPage";
import Icon from "@/components/banani/Icon";
import { requireAdmin } from "@/lib/auth/session";

const links = [
  ["/admin", "Vue d’ensemble", "layout-dashboard"],
  ["/admin/users", "Utilisateurs", "users"],
  ["/admin/generations", "Générations", "music-2"],
  ["/admin/library", "Bibliothèque", "library"],
  ["/admin/plans", "Crédits & tarifs", "coins"],
  ["/admin/music-styles", "Styles musicaux", "sliders-horizontal"],
  ["/admin/occasions", "Occasions", "calendar-heart"],
  ["/admin/languages", "Langues", "languages"],
  ["/admin/payments", "Paiements", "credit-card"],
  ["/admin/analytics", "Analytics", "chart-no-axes-column-increasing"],
  ["/admin/roles", "Rôles & accès", "shield-check"],
  ["/admin/branding", "Branding", "palette"],
] as const;

export default async function AdminMenuPage() {
  await requireAdmin();
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Navigation"
        title="Menu administrateur"
        description="Accède rapidement aux principales zones de pilotage."
      />
      <section className="admin-menu-grid">
        {links.map(([href, label, icon]) => (
          <Link href={href} key={href}>
            <span>
              <Icon i={icon} size={20} />
            </span>
            <strong>{label}</strong>
            <Icon i="chevron-right" size={16} />
          </Link>
        ))}
      </section>
    </AdminPage>
  );
}
