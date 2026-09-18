"use client";

import Link from "next/link";
import { NativeOnly } from "@/components/mobile/native-only";
import { PremiumIcon, type PremiumIconName } from "@/components/ui/premium-icon";

const defaultItems: Array<{ href: string; label: string; icon: PremiumIconName }> = [
  { href: "/", label: "Accueil", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/billing", label: "Abonnement", icon: "billing" },
  { href: "/dashboard/security", label: "Sécurité", icon: "security" },
];

export function NativeBottomNav({ items = defaultItems }: { items?: typeof defaultItems }) {
  return (
    <NativeOnly>
      <nav className="native-bottom-nav" aria-label="Navigation de l’application mobile">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="native-bottom-link">
            <PremiumIcon name={item.icon} size={20} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </NativeOnly>
  );
}
