"use client";
const t = (text: string) => text;
import { demoOccasionEmoji } from "@/lib/demo/musikpro-data";
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 7 — Générer ma chanson";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function FinalConfirmationScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/lyrics" current={7} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={7} total={7} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demoOccasionEmoji(demo.choices.occasion)} {demo.choices.occasion} •
          🎵 {demo.choices.genre}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Prêt à générer")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Voici un résumé de ta chanson")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-6">
        {/* Summary Card */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase">
              {t("Occasion")}
            </label>
            <p className="text-base font-semibold text-foreground mt-1">
              {demoOccasionEmoji(demo.choices.occasion)} {demo.choices.occasion}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              {t("Style musical")}
            </label>
            <p className="text-base font-semibold text-foreground mt-1">
              🎵 {demo.choices.genre}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              {t("Voix")}
            </label>
            <p className="text-base font-semibold text-foreground mt-1">
              👩🎤 {demo.choices.voice}
            </p>
          </div>
          <div className="border-t border-border pt-3">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              {t("Langue")}
            </label>
            <p className="text-base font-semibold text-foreground mt-1">
              🇫🇷 {demo.choices.language}
            </p>
          </div>
        </div>

        {/* Lyrics Preview */}
        <div>
          <label className="text-xs font-bold text-muted-foreground uppercase">
            {t("Aperçu des paroles")}
          </label>
          <div className="bg-card border border-border rounded-lg p-3 mt-2">
            <p className="text-xs leading-relaxed text-foreground line-clamp-4">
              {demo.fields.lyrics.slice(0, 180)}…
            </p>
          </div>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.go("/dashboard/create/lyrics")}
            className="text-xs text-primary font-semibold mt-2"
          >
            {t("Voir les paroles complètes")}
          </button>
        </div>

        {/* Credit Info */}
        <div className="bg-secondary/40 border border-secondary rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon
              i="info"
              size={16}
              className="text-primary flex-shrink-0 mt-0.5"
            />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {t("Tu es sur le point de générer ta chanson")}
              </p>
              <p className="text-muted-foreground">
                {t(
                  "Si tu n'as pas encore payé, tu seras redirigé vers la page de paiement.",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="creation-mobile-cta px-4 pb-8 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.generateSong()}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Générer votre chanson")} <Icon i="play" size={18} />
        </button>
      </div>
    </div>
  );
}
