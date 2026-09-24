"use client";

import { useEffect, useState } from "react";
import {
  DEMO_STORY_MAX_CHARACTERS,
  DEMO_STORY_MAX_WORDS,
  demoStorySchema,
} from "@/lib/validation/musikpro-demo";
import CreationTopNav from "./CreationTopNav";
import DemoField from "./DemoField";
import { useDemo } from "./DemoProvider";
import Icon from "./Icon";
import StepProgressBar from "./StepProgressBar";
import VoiceMicrophoneButton from "./VoiceMicrophoneButton";
import { InlineNotice } from "@/components/ui/inline-notice";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";

export const displayName = "Étape 2 — Raconte ton histoire";
export const screenSize = "mobile";

export default function StepStory() {
  const demo = useDemo();
  const [storyError, setStoryError] = useState("");
  const storyWordCount = demo.fields.story.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (!storyError) return;
    const timer = window.setTimeout(() => setStoryError(""), 4200);
    return () => window.clearTimeout(timer);
  }, [storyError]);

  const continueToRecipient = () => {
    const parsed = demoStorySchema.safeParse(demo.fields.story);
    if (!parsed.success) {
      setStoryError(parsed.error.issues[0].message);
      return;
    }
    setStoryError("");
    demo.field("story", parsed.data);
    demo.go("/dashboard/create/recipient");
  };

  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create" current={2} total={8} />

      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={2} total={8} />
      </div>

      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demo.occasionEmoji(demo.choices.occasion)} {demo.displayName(demo.occasions, demo.choices.occasion)}
        </span>
      </div>

      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Raconte ton histoire")}</h1>
        <p className="text-sm text-muted-foreground">{t("Décris ce que tu veux dans ta chanson")}</p>
      </div>

      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-xl p-4 relative" style={{ minHeight: 160 }}>
          <DemoField
            name="story"
            label={t("Ton histoire")}
            multiline
            rows={5}
            maxLength={DEMO_STORY_MAX_CHARACTERS}
            maxWords={DEMO_STORY_MAX_WORDS}
            className="text-base leading-relaxed"
            ariaInvalid={Boolean(storyError)}
            describedBy={storyError ? "story-field-error" : undefined}
            onValueChange={() => setStoryError("")}
            placeholder={t(
              "Ex. : Je veux rendre hommage à ma femme Aïcha. Sa force, sa douceur et son sourire illuminent notre famille depuis toutes ces années...",
            )}
          />
          <VoiceMicrophoneButton
            value={demo.fields.story}
            onTranscript={(value) => {
              demo.field("story", value.slice(0, DEMO_STORY_MAX_CHARACTERS));
              setStoryError("");
            }}
            onMessage={demo.notify}
            language={demo.choices.language === "Anglais" ? "en-US" : "fr-FR"}
            label={t("Raconter mon histoire avec le microphone")}
            className="absolute top-3 right-3"
          />
        </div>
        <div className="story-field-meta">
          <span>{t("Minimum 10 caractères")}</span>
          <span>{translateTemplate("{count} / {max} mots", { count: storyWordCount, max: DEMO_STORY_MAX_WORDS })}</span>
        </div>
        {storyError && (
          <InlineNotice id="story-field-error" tone="error" className="field-notice">
            {storyError}
          </InlineNotice>
        )}
      </div>

      <div className="px-4 mb-4">
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
          <Icon i="mic" size={19} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{t("Tu peux aussi parler !")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("Appuie sur le micro et parle librement. L’IA transcrit et améliore automatiquement ton texte.")}
            </p>
            <p className="text-xs text-primary font-medium mt-1">{t("Durée recommandée : 30 à 60 secondes")}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="bg-secondary/60 rounded-xl px-4 py-3">
          <p className="text-sm text-foreground leading-relaxed">
            <Icon i="lightbulb" size={16} className="inline-block text-primary mr-1" />
            <span className="font-semibold">{t("Astuce :")}</span>{" "}
            {t("Plus tu donnes de détails, plus ta chanson sera personnalisée. Mentionne les souvenirs et les traits de caractère importants.")}
          </p>
        </div>
      </div>

      <div className="creation-mobile-cta px-4 pb-8">
        <button
          type="button"
          data-demo-ready="true"
          onClick={continueToRecipient}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="chevron-right" size={18} />
        </button>
      </div>
    </div>
  );
}
