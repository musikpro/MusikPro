"use client";
import { useState } from "react";
import { useDemo } from "./DemoProvider";
import { demoDestination } from "@/lib/demo/navigation";
import { translate as t } from "@/lib/i18n/translate";

import Icon from "./Icon";

export const displayName = "Mobile Bottom Nav";
export const shortDescription = "Fixed bottom navigation bar for mobile screens";

// `key` is the canonical identifier shared with the desktop nav and lib/demo/navigation.ts's
// demoDestination() lookup table; `label` is only what this bottom bar displays, so this tab can
// read "Mes sons" here without touching routing or the label used anywhere else in the app.
const items = [
  { icon: "home", key: "Accueil", label: t("Accueil"), active: true },
  { icon: "compass", key: "Découvrir", label: t("Découvrir"), active: false },
  { icon: "plus", key: "Créer", label: t("Créer"), active: false, isCenter: true },
  { icon: "music", key: "Mes chansons", label: t("Mes sons"), active: false },
  { icon: "coins", key: "Crédits", label: t("Crédits"), badge: true, active: false },
];

export default function MobileBottomNav({ activeTab = "Accueil" }) {
  const demo = useDemo();
  const [launching, setLaunching] = useState(false);
  const pathname = demo.pathname;
  const currentTab = pathname.startsWith("/dashboard/credits")
    ? "Crédits"
    : pathname.startsWith("/dashboard/discover")
      ? "Découvrir"
      : pathname.startsWith("/dashboard/songs")
        ? "Mes chansons"
        : pathname.startsWith("/dashboard/create")
          ? "Créer"
          : pathname === "/dashboard"
            ? "Accueil"
            : activeTab;
  return (
    <nav
      aria-label="Navigation mobile"
      className="banani-bottom-nav bg-card border border-border rounded-xl mx-4 mb-4 px-2 py-2 flex items-center justify-around"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
    >
      {items.map((item) => {
        const isActive = item.key === currentTab;
        if (item.isCenter) {
          return (
            <button
              type="button"
              data-demo-ready
              onClick={() => {
                if (launching) return;
                setLaunching(true);
                window.setTimeout(() => demo.go(demoDestination(item.key)), 180);
              }}
              aria-label={item.label}
              aria-busy={launching}
              aria-current={isActive ? "page" : undefined}
              key={item.key}
              className={`mobile-create-launch flex flex-col items-center justify-center -mt-6 ${launching ? "is-launching" : ""}`}
            >
              <div
                className="bg-primary w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.40)" }}
              >
                <Icon i="plus" size={28} className="text-primary-foreground" />
              </div>
            </button>
          );
        }
        return (
          <button
            type="button"
            data-demo-ready
            onClick={() => demo.go(demoDestination(item.key))}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            key={item.key}
            className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
          >
            <Icon i={item.icon} size={22} className={isActive ? "text-primary" : "text-muted-foreground"} />
            {item.badge && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {demo.balance}
              </div>
            )}
            <span className={`text-xs font-body ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
