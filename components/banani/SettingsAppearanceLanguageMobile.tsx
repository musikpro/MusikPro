"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";
import DemoToggle from "./DemoToggle";
import { demoDestination } from "@/lib/demo/navigation";

export const displayName = "Paramètres - Apparence et Langue";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import MobileBottomNav from "./MobileBottomNav";
import Icon from "./Icon";

export default function SettingsMobile() {
  const demo = useDemo();
  return (
    <div className="bg-background flex flex-col">
      <MobileTopBar credits={3} />

      {/* Header */}
      <div className="px-4 pt-4 pb-4 flex items-center justify-between border-b border-border">
        <div>
          <h1 className="font-headings font-bold text-lg text-foreground">
            {t("Paramètres")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("Personnalise ton expérience")}
          </p>
        </div>
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

      {/* Settings Content */}
      <div className="workspace-settings-grid flex-1 px-4 py-4 flex flex-col gap-6 pb-24">
        {/* Theme / Apparence Section */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("Apparence")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            {/* Theme Options */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-2">
                {t("Thème")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-demo-ready="true"
                  aria-pressed={demo.choices.theme === "Clair"}
                  onClick={() => {
                    demo.choose("theme", "Clair");
                  }}
                  className="demo-theme-choice flex-1 py-2.5 bg-input border border-border text-foreground rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Icon i="sun" size={13} />
                  {t("Clair")}
                </button>
                <button
                  type="button"
                  data-demo-ready="true"
                  aria-pressed={demo.choices.theme === "Sombre"}
                  onClick={() => {
                    demo.choose("theme", "Sombre");
                  }}
                  className="demo-theme-choice flex-1 py-2.5 bg-input border border-border text-foreground rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Icon i="moon" size={13} />
                  {t("Sombre")}
                </button>
                <button
                  type="button"
                  data-demo-ready="true"
                  aria-pressed={demo.choices.theme === "Auto"}
                  onClick={() => {
                    demo.choose("theme", "Auto");
                  }}
                  className="demo-theme-choice flex-1 py-2.5 bg-input border border-border text-foreground rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Icon i="monitor" size={13} />
                  {t("Auto")}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Font Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">
                  {t("Taille du texte")}
                </p>
                <span className="text-xs text-muted-foreground">
                  {t("Normal")}
                </span>
              </div>
              <input
                aria-label="Taille du texte"
                type="range"
                min="1"
                max="5"
                value={demo.fields.fontSize ?? "3"}
                onChange={(e) => demo.field("fontSize", e.target.value)}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>{t("Petit")}</span>
                <span>{t("Grand")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("Langue")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            {/* Language Selection */}
            {[
              { code: "FR", name: t("Français"), active: true },
              { code: "EN", name: t("English"), active: false },
              { code: "ES", name: t("Español"), active: false },
              { code: "PT", name: t("Português"), active: false },
            ].map((lang) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("appLanguage", lang.name)}
                aria-pressed={demo.choices.appLanguage === lang.name}
                key={lang.code}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg ${demo.choices.appLanguage === lang.name ? "bg-secondary border border-primary/15" : "bg-input border border-border"}`}
              >
                <span
                  className={`text-sm font-semibold ${demo.choices.appLanguage === lang.name ? "text-primary" : "text-foreground"}`}
                >
                  {lang.name}
                </span>
                {demo.choices.appLanguage === lang.name && (
                  <Icon i="check" size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Settings */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("Audio")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            {/* Volume Notification */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("Volume des notifications")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Sons de l'app")}
                </p>
              </div>
              <DemoToggle label="Volume des notifications" large />
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Quality Streaming */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("Qualité audio")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Haute qualité")}
                </p>
              </div>
              <DemoToggle label="Qualité audio" large />
            </div>
          </div>
        </div>

        {/* Privacy & Data Section */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("Données")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            {/* Cache */}
            <button
              type="button"
              data-demo-ready="true"
              onClick={() =>
                demo.notify(
                  "Action de démonstration : aucune opération réelle effectuée.",
                )
              }
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border"
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">
                  {t("Effacer le cache")}
                </p>
                <p className="text-xs text-muted-foreground">{t("42 MB")}</p>
              </div>
              <Icon
                i="chevron-right"
                size={16}
                className="text-muted-foreground flex-shrink-0"
              />
            </button>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Download Helper */}
            <button
              type="button"
              data-demo-ready="true"
              role="switch"
              aria-checked={!!demo.toggles["Assistant de téléchargement"]}
              onClick={() => demo.toggle("Assistant de téléchargement")}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border"
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">
                  {t("Assistant de téléchargement")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("Télécharge auto sur WiFi")}
                </p>
              </div>
              <div
                className={`w-12 h-7 ${demo.toggles["Assistant de téléchargement"] ? "bg-primary" : "bg-muted"} rounded-full relative flex-shrink-0`}
              >
                <div
                  className={`absolute ${demo.toggles["Assistant de téléchargement"] ? "right-1" : "left-1"} top-1 w-5 h-5 bg-white rounded-full`}
                />
              </div>
            </button>
          </div>
        </div>

        {/* About & Legal */}
        <div>
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {t("À propos")}
          </h2>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
            {[
              { label: t("Version"), value: "v2.1.4" },
              { label: t("Conditions"), value: t("Lire") },
              { label: t("Confidentialité"), value: t("Lire") },
            ].map((item) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() =>
                  demo.notify("Information de maquette : " + item.label)
                }
                key={item.label}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              >
                <span className="text-sm text-foreground">{item.label}</span>
                <span
                  className={`text-xs ${item.label === "Version" ? "text-muted-foreground" : "text-primary font-semibold"}`}
                >
                  {item.value}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <MobileBottomNav activeTab={t("Profil")} />
    </div>
  );
}
