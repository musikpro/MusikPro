"use client";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";
import { demoDestination } from "@/lib/demo/navigation";
import type { MusicStyleOption } from "@/lib/music-styles/catalog";

export const displayName = "Créer une Chanson - Sélection Genre";
export const screenSize = "desktop";

import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

const navItems = [
  { icon: "home", label: t("Accueil"), active: false },
  { icon: "compass", label: t("Découvrir"), active: false },
  { icon: "plus-circle", label: t("Créer"), active: true },
  { icon: "library", label: t("Bibliothèque"), active: false },
  { icon: "music", label: t("Mes chansons"), active: false },
];

const secondaryNav = [
  { icon: "download", label: t("Téléchargements"), active: false },
  { icon: "heart", label: t("Favoris"), active: false },
  { icon: "trophy", label: t("Concours"), active: false },
  { icon: "coins", label: t("Crédits"), active: false },
  { icon: "credit-card", label: t("Paiement"), active: false },
];

const profileNav = [
  { icon: "user", label: t("Profil"), active: false },
  { icon: "settings", label: t("Paramètres"), active: false },
  { icon: "bar-chart-2", label: t("Statistiques"), active: false },
];

export default function SongCreationGenre({ genres }: { genres: MusicStyleOption[] }) {
  const demo = useDemo();
  const hasSelectedGenre = genres.some((genre) => genre.name === demo.choices.genre);
  return (
    <div className="bg-background flex min-h-full font-body">
      {/* Left Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-border flex flex-col py-6 px-4">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Icon i="music-2" size={16} className="text-primary-foreground" />
          </div>
          <span className="font-headings font-bold text-lg text-foreground">{t("Musika")}</span>
        </div>

        {/* Credits Widget - Compact */}
        <div className="bg-secondary border border-primary/20 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Icon i="zap" size={16} className="text-primary" />
            <span className="text-sm font-bold text-foreground">{t("Crédits")}</span>
          </div>
          <p className="text-2xl font-headings font-bold text-primary mb-2">{demo.balance}</p>
          <p className="text-xs text-muted-foreground mb-3">{t("crédits restants")}</p>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/credits")}
            className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-lg"
          >
            {t("Acheter des crédits")}
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-6" />

        {/* Primary Nav Items */}
        <nav className="flex flex-col gap-1 mb-6">
          {navItems.map((item) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go(demoDestination(item.label))}
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                item.active ? "bg-secondary text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon i={item.icon} size={17} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-border mb-6" />

        {/* Secondary Nav Items */}
        <nav className="flex flex-col gap-1 mb-6">
          {secondaryNav.map((item) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go(demoDestination(item.label))}
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Icon i={item.icon} size={17} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-border mb-6" />

        {/* Profile Nav */}
        <nav className="flex flex-col gap-1 mb-4 mt-auto">
          {profileNav.map((item) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go(demoDestination(item.label))}
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <Icon i={item.icon} size={17} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="border-t border-border mb-4" />

        {/* Language & Logout */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.notify("Action de démonstration : aucune opération réelle effectuée.")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Icon i="globe" size={17} />
            <span className="flex-1 text-left">{t("Français")}</span>
            <Icon i="chevron-down" size={14} />
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => void demo.exitAccount()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-500"
          >
            <Icon i="log-out" size={17} />
            <span>{t("Déconnexion")}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="h-16 border-b border-border px-8 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="font-headings font-bold text-xl text-foreground">{t("Créer une Chanson")}</h1>
            <p className="text-xs text-muted-foreground">{t("Étape 1 sur 10 • Sélection du genre")}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go("/dashboard/notifications")}
              aria-label="Notifications"
              className="relative"
            >
              <Icon i="bell" size={20} className="text-muted-foreground" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            </button>
            <UserAvatar gender="male" ageGroup="25-35" heritage="African" index={1} className="w-9 h-9 rounded-full" />
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 px-8 py-6 flex flex-col">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{t("Progression")}</span>
              <span className="text-sm text-muted-foreground">10%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full w-1/10 bg-primary rounded-full" />
            </div>
          </div>

          {/* Section Header */}
          <div className="mb-8">
            <h2 className="font-headings font-bold text-2xl text-foreground mb-2">
              {t("Quel est ton genre préféré ?")}
            </h2>
            <p className="text-base text-muted-foreground">
              {t("Choisis le style musical qui te correspond le mieux pour ta chanson")}
            </p>
          </div>

          {/* Genre Grid */}
          <div className="grid grid-cols-3 gap-4 flex-1 max-h-96">
            {genres.map((genre) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("genre", demo.choices.genre === genre.name ? "" : genre.name)}
                aria-pressed={demo.choices.genre === genre.name}
                key={genre.name}
                className={`demo-choice-card rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2 transition-all ${
                  demo.choices.genre === genre.name
                    ? "border-primary bg-secondary"
                    : "border-border bg-card hover:border-primary/30"
                }`}
                style={{
                  boxShadow:
                    demo.choices.genre === genre.name
                      ? "0 4px 16px rgba(39,126,255,0.15)"
                      : "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  className={`w-16 h-16 genre-choice-icon genre-choice-icon-${genre.tone} rounded-2xl flex items-center justify-center mb-3`}
                >
                  <Icon i={genre.icon} size={24} />
                </div>
                <p className="font-bold text-base text-foreground mb-1">{genre.name}</p>
                <p className="text-xs text-muted-foreground">{genre.description}</p>
              </button>
            ))}
            {!genres.length ? (
              <div className="music-style-empty col-span-3">
                <Icon i="music-2" size={25} />
                <strong>Aucun style disponible</strong>
                <p>Les styles musicaux seront bientôt proposés.</p>
              </div>
            ) : null}
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.go("/dashboard")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              <Icon i="arrow-left" size={16} />
              {t("Retour")}
            </button>
            <button
              type="button"
              data-demo-ready="true"
              disabled={!hasSelectedGenre}
              onClick={() => demo.go("/dashboard/create/story")}
              className="bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-lg flex items-center gap-2"
            >
              {t("Continuer")}
              <Icon i="arrow-right" size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
