"use client";
import { useEffect } from "react";
import { translate as t } from "@/lib/i18n/translate";
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 7 — Révision des paroles";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import { DEMO_LYRICS_MAX_WORDS } from "@/lib/validation/musikpro-demo";
import { estimateLyricsDurationSeconds, formatLyricsDuration } from "@/lib/ai/lyrics-policy";

export default function ReviewLyricsScreen() {
  const demo = useDemo();
  const hasLyrics = Boolean(demo.fields.lyrics.trim());
  useEffect(() => {
    if (!hasLyrics) demo.go("/dashboard/create/parameters");
  }, [demo, hasLyrics]);
  if (!hasLyrics) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        {t("Redirection vers la génération des paroles…")}
      </p>
    );
  }
  const lyricsWordCount = demo.fields.lyrics.trim().split(/\s+/).filter(Boolean).length;
  const estimatedDuration = formatLyricsDuration(estimateLyricsDurationSeconds(lyricsWordCount));
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/parameters" current={7} total={8} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={7} total={8} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demo.occasionEmoji(demo.choices.occasion)} {demo.displayName(demo.occasions, demo.choices.occasion)} • 🎵{" "}
          {demo.displayName(demo.musicStyles, demo.choices.genre)}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Révise les paroles")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Révise-les avec l’IA ou modifie-les toi-même avant la génération musicale")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        {/* Lyrics Display */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-foreground mb-3">{t("Paroles générées")}</label>
          <div className="lyrics-scroll-shell">
            <div
              className="lyrics-scrollbox bg-card border border-border rounded-lg p-4"
              role="region"
              aria-label="Paroles générées, zone défilable"
              tabIndex={0}
            >
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{demo.fields.lyrics}</p>
            </div>
          </div>
          <div className="lyrics-scroll-meta text-xs text-muted-foreground mt-2">
            <p className="lyrics-scroll-hint">
              <Icon i="mouse-pointer-2" size={13} />
              {t("Clique puis fais défiler pour lire toutes les paroles")}
            </p>
            <span className="lyrics-word-count">
              {lyricsWordCount} / {DEMO_LYRICS_MAX_WORDS} mots
            </span>
          </div>
        </div>

        <div className="lyrics-compact-actions mb-4">
          <div className="lyrics-duration-chip">
            <div className="lyrics-compact-icon">
              <Icon i="clock" size={15} />
            </div>
            <div>
              <p>{t("Durée estimée de la chanson")}</p>
              <strong>{estimatedDuration}</strong>
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
          disabled={demo.lyricsPending}
          onClick={() => void demo.generateLyrics("lyrics.extend")}
          className="w-full py-3 bg-background border border-border rounded-lg flex items-center justify-center gap-2 mb-6"
        >
          <Icon i="plus" size={16} className="text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground">
            {demo.lyricsPending ? t("Rallongement…") : t("Rallonger les paroles")}
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
