"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 5 — Révision des paroles";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";

export default function ReviewLyricsScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/create/parameters")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {t("Étape 5 sur 7")}
        </span>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={5} total={7} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          🎂 {t("Anniversaire")} • 🎵 {t("Afrobeat")}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Révise les paroles")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Tu peux les modifier avant la génération")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {/* Lyrics Display */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-foreground mb-3">
            {t("Paroles générées")}
          </label>
          <div className="bg-card border border-border rounded-lg p-4 min-h-48">
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {demo.fields.lyrics}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("Généré par l'IA")}
          </p>
        </div>

        {/* Duration Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Icon i="clock" size={16} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {t("Durée estimée")}
            </p>
            <p className="font-bold text-sm text-foreground">
              {t("~1:50")} / 4:00 {t("max")}
            </p>
          </div>
        </div>

        {/* Extend Lyrics Button */}
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            demo.field(
              "lyrics",
              demo.fields.lyrics +
                "\nUn nouveau refrain accompagne notre histoire.",
            )
          }
          className="w-full py-3 bg-background border border-border rounded-lg flex items-center justify-center gap-2 mb-6"
        >
          <Icon i="plus" size={16} className="text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">
            {t("Rallonger les paroles")}
          </span>
        </button>

        {/* Edit Button */}
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/create/lyrics/edit")}
          className="w-full py-3 bg-secondary border border-primary/30 text-primary font-semibold text-sm rounded-lg flex items-center justify-center gap-2 mb-6"
        >
          <Icon i="edit-2" size={16} />
          {t("Modifier les paroles")}
        </button>

        {/* Info */}
        <div className="bg-secondary/60 rounded-xl px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            💡{" "}
            {t(
              "Les paroles peuvent être éditées librement. Elles seront utilisées pour la génération musicale finale.",
            )}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/create/confirm")}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="arrow-right" size={18} />
        </button>
      </div>
    </div>
  );
}
