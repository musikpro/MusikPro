"use client";
const t = (text: string) => text;
import SelectionMark from "./SelectionMark";
import { demoOccasionEmoji } from "@/lib/demo/musikpro-data";
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoDetailSchema } from "@/lib/validation/musikpro-demo";

export const displayName = "Étape 4 — Paramètres additionnels";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function StepAdditionalParams() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/style" current={4} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={4} total={7} />
      </div>

      {/* Occasion tag */}
      <div className="px-4 pt-3 pb-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-secondary px-3 py-1.5 rounded-lg">
          {demoOccasionEmoji(demo.choices.occasion)} {demo.choices.occasion} •
          🚀 {demo.choices.mood}
        </span>
      </div>

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Paramètres additionnels")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Affine ta chanson avec plus d'options")}
        </p>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1 px-4 pb-4">
        {/* Language Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">
            {t("Langue des paroles")}
          </label>
          <div className="flex flex-col gap-2">
            {[
              { name: "Français", flag: "🇫🇷" },
              { name: "Anglais", flag: "🇬🇧" },
            ].map((lang) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("language", lang.name)}
                aria-pressed={demo.choices.language === lang.name}
                key={lang.name}
                className="demo-choice-card bg-card border-2 border-border rounded-lg p-3 flex items-center gap-3"
              >
                <SelectionMark selected={demo.choices.language === lang.name} />
                <span className="text-lg">{lang.flag}</span>
                <p className="text-sm font-semibold text-foreground">
                  {lang.name}
                </p>
                <div className="ml-auto w-5 h-5 border-2 border-border rounded-full"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Voice/Singer Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">
            {t("Voix du chanteur")}
          </label>
          <div className="flex flex-col gap-2">
            {[
              { emoji: "👩🎤", text: t("Femme") },
              { emoji: "👨🎤", text: t("Homme") },
              { emoji: "👥", text: t("Duo") },
            ].map((voice) => (
              <button
                type="button"
                data-demo-ready="true"
                onClick={() => demo.choose("voice", voice.text)}
                aria-pressed={demo.choices.voice === voice.text}
                key={voice.text}
                className="demo-choice-card bg-card border-2 border-border rounded-lg p-3 flex items-center gap-3"
              >
                <SelectionMark selected={demo.choices.voice === voice.text} />
                <span className="text-lg">{voice.emoji}</span>
                <p className="text-sm font-semibold text-foreground">
                  {voice.text}
                </p>
                <div className="ml-auto w-5 h-5 border-2 border-border rounded-full"></div>
              </button>
            ))}
          </div>
        </div>

        {/* Special Event Section */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-foreground mb-3">
            {t("Détail spécial (optionnel)")}
          </label>
          <div className="bg-card border-2 border-border rounded-xl p-4 flex items-start justify-between gap-2">
            <DemoField
              name="detail"
              label="Détail spécial"
              multiline
              rows={3}
              maxLength={3000}
              placeholder="Y a-t-il un événement ou moment spécial que tu aimerais ajouter ?"
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
              className="w-10 h-10 bg-secondary border border-primary/30 rounded-lg flex items-center justify-center flex-shrink-0"
            >
              <Icon i="mic" size={18} className="text-primary" />
            </button>
          </div>
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
          onClick={() =>
            (() => {
              const parsed = demoDetailSchema.safeParse(demo.fields.detail);
              if (!parsed.success) {
                demo.notify(parsed.error.issues[0].message);
                return;
              }
              demo.field("detail", parsed.data);
              demo.go("/dashboard/create/lyrics/generating");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Générer les paroles")} <Icon i="arrow-right" size={18} />
        </button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("Une chanson de votre pack")}
        </p>
      </div>
    </div>
  );
}
