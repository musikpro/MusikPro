"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { splitLocalePrefix } from "@/lib/languages/locale-path";
import { NativeOnly } from "@/components/mobile/native-only";
import { PremiumIcon, type PremiumIconName } from "@/components/ui/premium-icon";

const defaultItems: Array<{ href: string; label: string; icon: PremiumIconName }> = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/billing", label: "Abonnement", icon: "billing" },
  { href: "/dashboard/security", label: "Sécurité", icon: "security" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function NativeBottomNav({ items = defaultItems }: { items?: typeof defaultItems }) {
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
      <nav className="native-bottom-nav" aria-label="Navigation de l’application mobile">
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
