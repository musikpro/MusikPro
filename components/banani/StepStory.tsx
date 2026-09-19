"use client";
import { useEffect, useState } from "react";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoOccasionEmoji } from "@/lib/demo/musikpro-data";
import { demoStorySchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Étape 2 — Raconte ton histoire";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function StepStory() {
  const demo = useDemo();
  const [storyError, setStoryError] = useState("");
  const storyWordCount = demo.fields.story.trim().split(/\s+/).filter(Boolean).length;
  useEffect(() => {
    if (!storyError) return;
    const timer = window.setTimeout(() => setStoryError(""), 4200);
    return () => window.clearTimeout(timer);
  }, [storyError]);

  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create" current={2} />

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
            maxLength={2000}
            maxWords={250}
            className="text-base leading-relaxed"
            placeholder="Ex. : Je veux rendre hommage à ma femme Aïcha. Sa force, sa douceur et son sourire illuminent notre famille depuis toutes ces années..."
          />
          <button
            type="button"
            data-demo-ready="true"
            onClick={() =>
              demo.notify(
                "Transcription vocale non disponible dans la démonstration.",
              )
            }
            aria-label="Raconter mon histoire avec le microphone"
            title="Raconter mon histoire avec le microphone"
            className="story-mic-button absolute top-3 right-3 flex items-center justify-center"
          >
            <Icon i="mic" size={20} />
          </button>
        </div>
        <div className="story-field-meta">
          <span>Minimum 10 caractères</span>
          <span>{storyWordCount} / 250 mots</span>
        </div>
        {storyError && (
          <p className="story-field-error" role="alert">
            <Icon i="circle-alert" size={15} />
            {storyError}
          </p>
        )}
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
      <div className="creation-mobile-cta px-4 pb-8">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoStorySchema.safeParse(demo.fields.story);
              if (!parsed.success) {
                setStoryError(parsed.error.issues[0].message);
                return;
              }
              setStoryError("");
              demo.field("story", parsed.data);
              demo.go("/dashboard/create/style");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="chevron-right" size={18} />
        </button>
      </div>
    </div>
  );
}
