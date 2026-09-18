"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import Icon from "./Icon";

export const displayName = "Écran de génération musicale";
export const screenSize = "mobile";

export default function GeneratingScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col" style={{ minHeight: 700 }}>
      {/* Top */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="w-8" />
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <Icon i="music-2" size={12} className="text-primary-foreground" />
          </div>
          <span className="font-headings font-bold text-base text-foreground">
            {t("MusikPro")}
          </span>
        </div>
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard")}
          className="text-sm text-muted-foreground font-medium"
        >
          {t("Quitter")}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6">
        {/* Checkmark Success */}
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
          <Icon i="check" size={48} className="text-green-600" />
        </div>

        <div>
          <h1 className="font-headings font-bold text-2xl text-foreground mb-2">
            {t("Paiement confirmé !")}
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            {t(
              "Vous serez redirigé vers la page de génération de votre musique",
            )}
          </p>
        </div>

        {/* Redirect message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 w-full">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-blue-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-sm text-blue-800">
              {t(
                "Veuillez patienter quelques secondes pendant que nous vous redirigeons vers la page de création…",
              )}
            </p>
          </div>
        </div>

        {/* Loading indicator */}
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0s" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-2 bg-primary rounded-full animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>

      <div className="px-4 pb-8 text-center">
        <p className="text-xs text-muted-foreground">
          {t("Redirection automatique en cours…")}
        </p>
      </div>
    </div>
  );
}
