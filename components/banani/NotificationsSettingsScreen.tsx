"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoToggle from "./DemoToggle";

export const displayName = "Paramètres de notifications";
export const screenSize = "mobile";

import Icon from "./Icon";

export default function NotificationsSettingsScreen() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/profile")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <h1 className="text-sm font-medium text-muted-foreground">
          {t("Notifications")}
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6 overflow-y-auto space-y-6">
        {/* Music Notifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">
            {t("Vos chansons")}
          </h3>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="music" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Génération terminée")}
              </span>
            </div>
            <DemoToggle label="Génération terminée" />
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="heart" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Nouvelles likes")}
              </span>
            </div>
            <DemoToggle label="Nouvelles likes" />
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="play" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Nouvelles écoutes")}
              </span>
            </div>
            <DemoToggle label="Nouvelles écoutes" />
          </div>
        </div>

        {/* Community Notifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">
            {t("Communauté")}
          </h3>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="bell" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Concours & événements")}
              </span>
            </div>
            <DemoToggle label="Concours & événements" />
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="trending-up" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Tendances musicales")}
              </span>
            </div>
            <DemoToggle label="Tendances musicales" />
          </div>
        </div>

        {/* System Notifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">
            {t("Système")}
          </h3>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="mail" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Emails promotionnels")}
              </span>
            </div>
            <DemoToggle label="Emails promotionnels" />
          </div>
          <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Icon i="alert-circle" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">
                {t("Alertes de sécurité")}
              </span>
            </div>
            <DemoToggle label="Alertes de sécurité" />
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-secondary/40 border border-secondary rounded-xl p-4 mt-6">
          <p className="text-xs text-muted-foreground">
            {t(
              "Vous pouvez modifier ces paramètres à tout moment. Vos préférences seront sauvegardées automatiquement.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
