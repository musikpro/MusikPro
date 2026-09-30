"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { splitLocalePrefix } from "@/lib/languages/locale-path";
import { WebOnly } from "@/components/mobile/web-only";
import { PremiumIcon, type PremiumIconName } from "@/components/ui/premium-icon";

const items: Array<{ href: string; label: string; icon: PremiumIconName }> = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/billing", label: "Abonnement", icon: "billing" },
  { href: "/dashboard/security", label: "Sécurité", icon: "security" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const locale = splitLocalePrefix(pathname).locale;
  const musikPath = normalizeDashboardPath(pathname);
  const musik =
    musikPath === "/dashboard" ||
    (musikPath.startsWith("/dashboard/") &&
      !["/dashboard/billing", "/dashboard/security"].some((route) => musikPath.startsWith(route)));
  const destinations = musik
    ? [
        { href: "/dashboard", label: "Accueil", icon: "home" as const },
        {
          href: "/dashboard#mes-chansons",
          label: "Chansons",
          icon: "music" as const,
        },
        {
          href: "/dashboard/billing",
          label: "Compte",
          icon: "billing" as const,
        },
        {
          href: "/dashboard/security",
          label: "Sécurité",
          icon: "security" as const,
        },
      ]
    : items;
  if (musik) return null;
  return (
    <WebOnly>
      <nav className={`mobile-bottom-nav ${musik ? "musik-bottom-nav" : ""}`} aria-label="Navigation mobile principale">
        {destinations.map((item) => (
          <Link
            key={item.href}
            href={dashboardHref(item.href, false, locale)}
            className="mobile-bottom-link"
            aria-current={musikPath === item.href ? "page" : undefined}
          >
            <span aria-hidden="true" className="mobile-bottom-icon">
              <PremiumIcon name={item.icon} size={20} />
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </WebOnly>
  );
}
