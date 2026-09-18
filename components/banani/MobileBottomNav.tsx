"use client";
import { useDemo } from "./DemoProvider";
import { usePathname } from "next/navigation";
import { demoDestination } from "@/lib/demo/navigation";
const t = (text: string) => text;

import Icon from "./Icon";

export const displayName = "Mobile Bottom Nav";
export const shortDescription =
  "Fixed bottom navigation bar for mobile screens";

const items = [
  { icon: "home", label: t("Accueil"), active: true },
  { icon: "compass", label: t("Découvrir"), active: false },
  { icon: "plus", label: t("Créer"), active: false, isCenter: true },
  { icon: "music", label: t("Mes chansons"), active: false },
  { icon: "zap", label: t("Crédits"), badge: "3", active: false },
];

export default function MobileBottomNav({ activeTab = "Accueil" }) {
  const demo = useDemo();
  const pathname = usePathname();
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
    <div
      className="banani-bottom-nav bg-card border border-border rounded-xl mx-4 mb-4 px-2 py-2 flex items-center justify-around"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
    >
      {items.map((item) => {
        const isActive = item.label === currentTab;
        if (item.isCenter) {
          return (
            <button
              type="button"
              data-demo-ready
              onClick={() => demo.go(demoDestination(item.label))}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              key={item.label}
              className="flex flex-col items-center justify-center -mt-6"
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
            onClick={() => demo.go(demoDestination(item.label))}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            key={item.label}
            className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
          >
            <Icon
              i={item.icon}
              size={22}
              className={isActive ? "text-primary" : "text-muted-foreground"}
            />
            {item.badge && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {item.badge}
              </div>
            )}
            <span
              className={`text-xs font-body ${isActive ? "text-primary font-semibold" : "text-muted-foreground"}`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
