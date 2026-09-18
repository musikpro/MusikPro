"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoOccasionEmoji } from "@/lib/demo/musikpro-data";
import { demoStorySchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Étape 2 — Raconte ton histoire";
export const screenSize = "mobile";

import MobileTopBar from "./MobileTopBar";
import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";

export default function StepStory() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      {/* Top Nav */}
      <div className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/create")}
          className="flex items-center gap-1.5 text-sm font-semibold text-foreground"
        >
          <Icon i="arrow-left" size={18} /> {t("Retour")}
        </button>
        <span className="text-sm font-medium text-muted-foreground">
          {t("Étape 2 sur 7")}
        </span>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={2} total={7} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demoOccasionEmoji(demo.choices.occasion)} {demo.choices.occasion}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Raconte ton histoire")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Décris ce que tu veux dans ta chanson")}
        </p>
      </div>

      {/* Text area */}
      <div className="px-4 mb-4">
        <div
          className="bg-card border border-border rounded-xl p-4 relative"
          style={{ minHeight: 160 }}
        >
          <DemoField
            name="story"
            label="Ton histoire"
            multiline
            rows={5}
            maxLength={1000}
            className="text-base leading-relaxed"
            placeholder="Ex: Une chanson pour les 50 ans de ma mère Fatou, elle adore danser et est toujours joyeuse..."
          />
          <button
            type="button"
            data-demo-ready="true"
            onClick={() =>
              demo.notify(
                "Transcription vocale non disponible dans la démonstration.",
              )
            }
            aria-label="Microphone de démonstration"
            className="absolute top-3 right-3 w-10 h-10 bg-secondary border border-primary/30 rounded-lg flex items-center justify-center"
          >
            <Icon i="mic" size={18} className="text-primary" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-right">
          {demo.fields.story.length} / 1000 caractères
        </p>
      </div>

      {/* Voice hint */}
      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-lg">🎙️</span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t("Tu peux aussi parler !")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Appuie sur le micro et parle librement. L'IA transcrit et améliore automatiquement ton texte.",
              )}
            </p>
            <p className="text-xs text-primary font-medium mt-1">
              {t("Durée recommandée : 30 à 60 secondes")}
            </p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="px-4 mb-6">
        <div className="bg-secondary/60 rounded-xl px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            💡 <span className="font-semibold">{t("Astuce :")}</span>{" "}
            {t(
              "Plus tu donnes de détails, plus ta chanson sera personnalisée ! Mentionne les prénoms, souvenirs, traits de caractère...",
            )}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-8">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoStorySchema.safeParse(demo.fields.story);
              if (!parsed.success) {
                demo.notify(parsed.error.issues[0].message);
                return;
              }
              demo.field("story", parsed.data);
              demo.go("/dashboard/create/style");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="chevron-right" size={18} />
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("Minimum 10 caractères")}
        </p>
      </div>
    </div>
  );
}
