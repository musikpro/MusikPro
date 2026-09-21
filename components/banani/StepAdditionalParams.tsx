"use client";
import { useEffect, useState } from "react";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoDetailSchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Étape 5 — Paramètres additionnels";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import VoiceMicrophoneButton from "./VoiceMicrophoneButton";
import { InlineNotice } from "@/components/ui/inline-notice";

export default function StepAdditionalParams() {
  const demo = useDemo();
  const [detailError, setDetailError] = useState("");
  const hasRequiredOptions = Boolean(demo.choices.language && demo.choices.voice);

  useEffect(() => {
    if (!detailError) return;
    const timer = window.setTimeout(() => setDetailError(""), 4200);
    return () => window.clearTimeout(timer);
  }, [detailError]);
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/style" current={5} total={8} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={5} total={8} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demo.occasionEmoji(demo.choices.occasion)} {demo.choices.occasion}
          {demo.choices.mood ? ` • 🚀 ${demo.choices.mood}` : ""}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">{t("Paramètres additionnels")}</h1>
        <p className="text-sm text-muted-foreground">{t("Affine ta chanson avec plus d'options")}</p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {/* Language Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">{t("Langue des paroles")}</label>
          <div className="flex flex-col gap-2">
            {[
              { name: "Français", flag: "🇫🇷" },
              { name: "Anglais", flag: "🇬🇧" },
            ].map((lang) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("language", demo.choices.language === lang.name ? "" : lang.name)}
                aria-pressed={demo.choices.language === lang.name}
                key={lang.name}
                className="demo-choice-card bg-card border-2 border-border rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-lg">{lang.flag}</span>
                <p className="text-sm font-semibold text-foreground">{lang.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Voice/Singer Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">{t("Voix du chanteur")}</label>
          <div className="flex flex-col gap-2">
            {[
              { emoji: "👩🎤", text: t("Femme") },
              { emoji: "👨🎤", text: t("Homme") },
              { emoji: "👥", text: t("Duo") },
            ].map((voice) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("voice", demo.choices.voice === voice.text ? "" : voice.text)}
                aria-pressed={demo.choices.voice === voice.text}
                key={voice.text}
                className="demo-choice-card bg-card border-2 border-border rounded-lg p-3 flex items-center gap-3"
              >
                <span className="text-lg">{voice.emoji}</span>
                <p className="text-sm font-semibold text-foreground">{voice.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Special Event Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">{t("Détail spécial (optionnel)")}</label>
          <div className="additional-detail-shell bg-card border-2 border-border rounded-xl p-4 relative">
            <DemoField
              name="detail"
              label="Détail spécial"
              multiline
              rows={3}
              maxLength={3000}
              ariaInvalid={Boolean(detailError)}
              describedBy={detailError ? "detail-special-error" : undefined}
              onValueChange={() => setDetailError("")}
              placeholder="Y a-t-il un événement ou moment spécial que tu aimerais ajouter ?"
            />
            <VoiceMicrophoneButton
              value={demo.fields.detail}
              onTranscript={(value) => {
                demo.field("detail", value.slice(0, 3000));
                setDetailError("");
              }}
              onMessage={demo.notify}
              language={demo.choices.language === "Anglais" ? "en-US" : "fr-FR"}
              label="Ajouter le détail spécial avec le microphone"
              className="absolute top-3 right-3"
            />
          </div>
          {detailError && (
            <InlineNotice id="detail-special-error" tone="error" className="field-notice">
              {detailError}
            </InlineNotice>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {t("Maximum 50 mots · L'IA transcrit automatiquement le vocal")}
          </p>
        </div>

        {/* Tip */}
        <div className="bg-secondary/60 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-foreground leading-relaxed">
            💡 <span className="font-semibold">{t("Info :")}</span>{" "}
            {t("Tu pourras modifier les paroles avant la génération musicale")}
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="creation-mobile-cta px-4 pb-8 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          disabled={!hasRequiredOptions || demo.lyricsPending}
          onClick={async () => {
            const parsed = demoDetailSchema.safeParse(demo.fields.detail);
            if (!parsed.success) {
              setDetailError(parsed.error.issues[0].message);
              return;
            }
            demo.field("detail", parsed.data);
            demo.go("/dashboard/create/lyrics/generating");
            await demo.generateLyrics("lyrics.generate");
          }}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {demo.lyricsPending ? t("Génération…") : t("Générer les paroles")} <Icon i="arrow-right" size={18} />
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {hasRequiredOptions
            ? t("Cette génération utilisera 2 crédits")
            : t("Choisis une langue et une voix pour continuer")}
        </p>
      </div>
    </div>
  );
}
