"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

export const displayName = "Étape 1 — Choisir une occasion";
export const screenSize = "mobile";

import StepProgressBar from "./StepProgressBar";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function SongCreationStep1Mobile() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard" current={1} total={8} />

      {/* Progress */}
      <div className="px-4 pt-4 pb-2">
        <StepProgressBar current={1} total={8} />
      </div>

      {/* Title */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Quelle est l'occasion ?")}</h1>
        <p className="text-sm text-muted-foreground">{t("Choisis le thème de ta chanson")}</p>
      </div>

      {/* Occasions Grid */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {demo.occasions.map((occasion) => (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => demo.choose("occasion", occasion.name)}
              aria-pressed={demo.choices.occasion === occasion.name}
              key={occasion.id}
              className="demo-choice-card bg-card border border-border rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center"
            >
              <span className="text-3xl">{occasion.emoji}</span>
              <p className="text-sm font-semibold text-foreground">{occasion.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="creation-mobile-cta px-4 pb-6 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard/create/story")}
          disabled={!demo.choices.occasion}
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Continuer")} <Icon i="arrow-right" size={18} />
        </button>
      </div>
    </div>
  );
}
