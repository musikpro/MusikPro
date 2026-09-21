"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";
import { demoDestination } from "@/lib/demo/navigation";

export const displayName = "Menu Utilisateur Mobile";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import UserAvatar from "./UserAvatar";
import Icon from "./Icon";

const menuItems = [
  { icon: "user", label: t("Mon Profil"), sub: t("Gérer mes informations") },
  { icon: "heart", label: t("Mes Favoris"), sub: t("Chansons aimées") },
  {
    icon: "download",
    label: t("Téléchargements"),
    sub: t("Chansons hors ligne"),
  },
  { icon: "bell", label: t("Notifications"), sub: t("Gérer les alertes") },
  { icon: "coins", label: t("Crédits"), sub: t("Solde de génération") },
  {
    icon: "help-circle",
    label: t("Aide & FAQ"),
    sub: t("Questions fréquentes"),
  },
  { icon: "mail", label: t("Support"), sub: t("Nous contacter") },
  { icon: "settings", label: t("Paramètres"), sub: t("Apparence et langue") },
];

export default function UserMenuMobile() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={demo.balance} />

      {/* Header with Close Button */}
      <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-border">
        <h1 className="font-headings font-bold text-lg text-foreground">{t("Menu")}</h1>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard")}
          aria-label="Fermer"
          className="text-muted-foreground"
        >
          <Icon i="x" size={20} />
        </button>
      </div>

      {/* Profile Card */}
      <div className="px-4 py-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <UserAvatar gender="male" ageGroup="25-35" heritage="African" index={1} className="w-14 h-14 rounded-lg" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base text-foreground">{demo.profile.name}</h2>
            <p className="text-xs text-muted-foreground">{demo.profile.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-success rounded-full" />
              <span className="text-xs text-success font-semibold">{t("Premium")}</span>
            </div>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/profile/edit")}
            aria-label="Éditer le profil"
            className="text-muted-foreground"
          >
            <Icon i="edit-2" size={16} />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="workspace-menu-grid flex-1 px-4 flex flex-col">
        {menuItems.map((item, i) => (
          <div key={item.label}>
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go(demoDestination(item.label))}
              aria-label={item.label}
              className="w-full flex items-center gap-3 py-3.5 text-left"
            >
              <div className="w-9 h-9 bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon i={item.icon} size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.label === t("Crédits")
                    ? `${demo.balance} crédit${demo.balance > 1 ? "s" : ""} disponible${demo.balance > 1 ? "s" : ""}`
                    : item.sub}
                </p>
              </div>
              <Icon i="chevron-right" size={16} className="text-muted-foreground flex-shrink-0" />
            </button>
            {i < menuItems.length - 1 && <div className="border-t border-border" />}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="px-4 pb-6 flex flex-col gap-2">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/settings")}
          className="w-full py-3 bg-input border border-border rounded-lg text-sm font-semibold text-foreground flex items-center justify-center gap-2"
        >
          <Icon i="globe" size={14} />
          {t("Français")}
        </button>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => void demo.exitAccount()}
          className="w-full py-3 bg-red-50 border border-red-100 rounded-lg text-sm font-semibold text-red-500 flex items-center justify-center gap-2"
        >
          <Icon i="log-out" size={14} />
          {t("Déconnexion")}
        </button>
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
