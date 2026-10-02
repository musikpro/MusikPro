"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { splitLocalePrefix } from "@/lib/languages/locale-path";
import { translate as t } from "@/lib/i18n/translate";
import { NativeOnly } from "@/components/mobile/native-only";
import { PremiumIcon, type PremiumIconName } from "@/components/ui/premium-icon";

type NativeNavItem = { href: string; label: string; icon: PremiumIconName };

// Libellés par défaut résolus au rendu (jamais t() au chargement du module).
const getDefaultItems = (): NativeNavItem[] => [
  { href: "/", label: t("Accueil"), icon: "home" },
  { href: "/dashboard", label: t("Dashboard"), icon: "dashboard" },
  { href: "/dashboard/billing", label: t("Abonnement"), icon: "billing" },
  { href: "/dashboard/security", label: t("Sécurité"), icon: "security" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NativeBottomNav({ items = getDefaultItems() }: { items?: NativeNavItem[] }) {
  const { locale, path: pathname } = splitLocalePrefix(usePathname());
  // Même règle que la navigation web : les pages MusikPro portent leur propre navigation.
  const musikPath = normalizeDashboardPath(pathname);
  const musik =
    musikPath === "/dashboard" ||
    (musikPath.startsWith("/dashboard/") &&
      !["/dashboard/billing", "/dashboard/security"].some((route) => musikPath.startsWith(route)));
  if (musik) return null;
  return (
    <NativeOnly>
      <nav className="native-bottom-nav" aria-label={t("Navigation de l’application mobile")}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={dashboardHref(item.href, false, locale)}
              className={`native-bottom-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <PremiumIcon name={item.icon} size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </NativeOnly>
  );
}
