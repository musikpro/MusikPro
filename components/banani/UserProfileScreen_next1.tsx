"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Profil Utilisateur (Next)";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import UserAvatar from "./UserAvatar";
import Icon from "./Icon";

export default function UserProfileScreen() {
  const demo = useDemo();
  return (
    <div className="profile-screen bg-background flex flex-col">
      <MobileTopBar credits={3} />

      {/* Profile Header */}
      <div className="profile-hero px-4 pt-6 pb-6 text-center">
        <div className="profile-avatar flex justify-center mb-4">
          <UserAvatar gender="male" ageGroup="25-35" heritage="African" index={1} className="w-20" />
        </div>
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{demo.profile.name}</h1>
        <p className="text-sm text-muted-foreground mb-3">{demo.profile.location}</p>
        <p className="text-xs text-muted-foreground">{t("Membre depuis octobre 2024")}</p>
      </div>

      {/* Stats */}
      <div className="profile-stats px-4 pb-6 grid grid-cols-3 gap-3">
        <div className="profile-stat-card bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary mb-1">5</p>
          <p className="text-xs text-muted-foreground">{t("Chansons")}</p>
        </div>
        <div className="profile-stat-card bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary mb-1">4.2k</p>
          <p className="text-xs text-muted-foreground">{t("Écoutes")}</p>
        </div>
        <div className="profile-stat-card bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary mb-1">568</p>
          <p className="text-xs text-muted-foreground">{t("Likes")}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto space-y-3">
        {/* Plan Section */}
        <div className="profile-plan-card bg-secondary/40 border border-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-foreground">{t("Plan actuel")}</h3>
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-1 rounded-lg">
              {t("Populaire")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t("5 chansons/mois • 2 000 FCFA")}</p>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/credits")}
            className="text-sm font-semibold text-primary"
          >
            {t("Voir les autres plans")}
          </button>
        </div>

        {/* Account Settings */}
        <div className="profile-section space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase px-1">{t("Compte")}</h3>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/profile/edit")}
            className="profile-action-row w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon i="user" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Profil")}</span>
            </div>
            <Icon i="chevron-right" size={16} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/security")}
            className="profile-action-row w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon i="lock" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Mot de passe")}</span>
            </div>
            <Icon i="chevron-right" size={16} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/settings/notifications")}
            className="profile-action-row w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon i="bell" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Notifications")}</span>
            </div>
            <Icon i="chevron-right" size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Support */}
        <div className="profile-section space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase px-1">{t("Support")}</h3>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/help")}
            className="profile-action-row w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon i="help-circle" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Aide & FAQ")}</span>
            </div>
            <Icon i="chevron-right" size={16} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/support")}
            className="profile-action-row w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Icon i="message-circle" size={18} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Contacter le support")}</span>
            </div>
            <Icon i="chevron-right" size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Logout */}
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => void demo.exitAccount()}
          className="profile-logout w-full bg-card border border-border/50 rounded-xl px-4 py-3 flex items-center justify-center gap-2 text-destructive mt-4"
        >
          <Icon i="log-out" size={16} />
          <span className="text-sm font-semibold">{t("Se déconnecter")}</span>
        </button>
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
