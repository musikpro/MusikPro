"use client";
import { translate as t } from "@/lib/i18n/translate";
import type { MusicStyleOption } from "@/lib/music-styles/catalog";
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 4 — Choisis le style et l'ambiance";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function StepStyleAndMood({ genres }: { genres: MusicStyleOption[] }) {
  const demo = useDemo();
  const hasSelectedGenre = genres.some((genre) => genre.name === demo.choices.genre);
  const moods = [
    { emoji: "🚀", label: "Énergique", desc: t("Upbeat") },
    { emoji: "💕", label: "Romantique", desc: t("Tender") },
    { emoji: "👑", label: "Épique", desc: t("Majestic") },
    { emoji: "😂", label: "Joyeuse", desc: t("Fun") },
    { emoji: "🎭", label: "Dramatique", desc: t("Epic") },
    { emoji: "🌙", label: "Mystique", desc: t("Magical") },
  ];
  const hasSelectedMood = moods.some((mood) => mood.label === demo.choices.mood);
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/recipient" current={4} total={8} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={4} total={8} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demo.occasionEmoji(demo.choices.occasion)} {demo.choices.occasion}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Choisis le style et l'ambiance")}</h1>
        <p className="text-sm text-muted-foreground">{t("Sélectionne le genre musical et l'émotion")}</p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {/* Genre/Style Section */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">{t("Genre musical")}</h2>
          <div className="creation-genre-grid grid grid-cols-3 gap-2">
            {genres.map((genre) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("genre", demo.choices.genre === genre.name ? "" : genre.name)}
                aria-pressed={demo.choices.genre === genre.name}
                key={genre.name}
                className="creation-genre-card demo-choice-card bg-card border-2 border-border rounded-lg p-2 text-center flex flex-col items-center gap-2"
              >
                <span className={`genre-choice-icon genre-choice-icon-${genre.tone}`}>
                  <Icon i={genre.icon} size={20} />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-foreground">{genre.name}</p>
                  <p className="text-xs text-muted-foreground">{genre.description}</p>
                </div>
              </button>
            ))}
            {!genres.length ? (
              <div className="music-style-empty">
                <Icon i="music-2" size={24} />
                <strong>Aucun style disponible</strong>
                <p>Les styles musicaux seront bientôt proposés.</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Mood/Ambiance Section */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-foreground mb-3">{t("Ambiance")}</h2>
          <div className="grid grid-cols-3 gap-2">
            {moods.map((mood) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("mood", demo.choices.mood === mood.label ? "" : mood.label)}
                aria-pressed={demo.choices.mood === mood.label}
                key={mood.label}
                className="demo-choice-card bg-card border-2 border-border rounded-lg py-3 px-2 flex flex-col items-center gap-1"
              >
                <span className="text-2xl">{mood.emoji}</span>
                <p className="font-semibold text-xs text-foreground text-center">{mood.label}</p>
                <p className="text-xs text-muted-foreground">{mood.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Tip */}
        <div className="bg-secondary/60 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-foreground leading-relaxed">
            💡 <span className="font-semibold">{t("Conseil :")}</span>{" "}
            {t("Combine un genre avec une ambiance pour plus de personnalisation !")}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="creation-mobile-cta px-4 pb-8 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          disabled={!hasSelectedGenre || !hasSelectedMood}
          onClick={() => demo.go("/dashboard/create/parameters")}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="chevron-right" size={18} />
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("Sélectionne au moins un genre et une ambiance")}
        </p>
      </div>
    </div>
  );
}
