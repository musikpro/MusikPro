"use client";
import { useState } from "react";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 5 — Révision des paroles";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function ReviewLyricsScreen() {
  const demo = useDemo();
  const [lyricsScrollProgress, setLyricsScrollProgress] = useState(0);
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/parameters" current={5} />

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
          <div className="lyrics-scroll-shell">
            <div
              className="lyrics-scrollbox bg-card border border-border rounded-lg p-4"
              role="region"
              aria-label="Paroles générées, zone défilable"
              tabIndex={0}
              onScroll={(event) => {
                const element = event.currentTarget;
                const max = element.scrollHeight - element.clientHeight;
                setLyricsScrollProgress(max > 0 ? element.scrollTop / max : 0);
              }}
            >
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {demo.fields.lyrics}
              </p>
            </div>
            <span className="lyrics-scroll-track" aria-hidden="true">
              <span style={{ transform: `translateY(${lyricsScrollProgress * 160}px)` }} />
            </span>
          </div>
          <p className="lyrics-scroll-hint text-xs text-muted-foreground mt-2">
            <Icon i="mouse-pointer-2" size={13} />
            {t("Clique puis fais défiler pour lire toutes les paroles")}
          </p>
        </div>

        <div className="lyrics-compact-actions mb-4">
          <div className="lyrics-duration-chip">
            <div className="lyrics-compact-icon">
              <Icon i="clock" size={15} />
            </div>
            <div>
              <p>{t("Durée estimée")}</p>
              <strong>{t("~1:50")}</strong>
            </div>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/create/lyrics/edit")}
            className="lyrics-edit-button"
          >
            <Icon i="edit-2" size={15} />
            {t("Modifier les paroles")}
          </button>
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
      <div className="creation-mobile-cta px-4 pb-8 border-t border-border bg-background">
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
