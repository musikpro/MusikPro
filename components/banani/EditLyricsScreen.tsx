"use client";
const t = (text: string) => text;
import { useDemo } from "./DemoProvider";

import DemoField from "./DemoField";
import { demoLyricsSchema } from "@/lib/validation/musikpro-demo";
import { demoLyrics } from "@/lib/demo/musikpro-data";

export const displayName = "Étape 5 — Édition des paroles";
export const screenSize = "mobile";

import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";

export default function EditLyricsScreen() {
  const demo = useDemo();
  return (
    <div className="bg-surface flex flex-col">
      <CreationTopNav backHref="/dashboard/create/lyrics" label="Édition" />

      {/* Title */}
      <div className="px-4 pt-4 pb-5">
        <h1 className="font-headings font-bold text-2xl text-foreground mb-1">
          {t("Édite tes paroles")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("Personnalise la chanson à ton goût")}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 pb-4 flex flex-col gap-4">
        {/* Lyrics Text Area */}
        <div className="flex-1 flex flex-col">
          <label className="block text-sm font-bold text-foreground mb-3">
            {t("Tes paroles")}
          </label>
          <div className="bg-card border border-border rounded-lg p-4 flex-1 flex items-start justify-start">
            <DemoField
              name="lyrics"
              label="Tes paroles"
              multiline
              rows={12}
              maxLength={12000}
              className="text-sm leading-relaxed whitespace-pre-wrap"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("Clique pour éditer · Maximum 500 mots")}
          </p>
        </div>

        {/* Character Count */}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {t("Nombre de mots")}:{" "}
            {demo.fields.lyrics.trim().split(/\s+/).filter(Boolean).length}
          </span>
          <span className="text-xs text-muted-foreground">500 {t("max")}</span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            data-demo-ready="true"
            onClick={() => demo.field("lyrics", demoLyrics)}
            className="flex-1 py-2 bg-secondary border border-primary/30 text-primary font-semibold text-xs rounded-lg flex items-center justify-center gap-1"
          >
            <Icon i="undo-2" size={14} />
            {t("Réinitialiser")}
          </button>
          <button
            type="button"
            data-demo-ready="true"
            onClick={() =>
              (() => {
                navigator.clipboard.writeText(demo.fields.lyrics).then(
                  () => demo.notify("Paroles copiées."),
                  () =>
                    demo.notify(
                      "La copie est indisponible dans ce navigateur.",
                    ),
                );
              })()
            }
            className="flex-1 py-2 bg-secondary border border-primary/30 text-primary font-semibold text-xs rounded-lg flex items-center justify-center gap-1"
          >
            <Icon i="copy" size={14} />
            {t("Copier")}
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="creation-mobile-cta px-4 pb-8 border-t border-border bg-background">
        <button
          type="button"
          data-demo-ready="true"
          onClick={() =>
            (() => {
              const parsed = demoLyricsSchema.safeParse(demo.fields.lyrics);
              if (!parsed.success) {
                demo.notify(parsed.error.issues[0].message);
                return;
              }
              demo.field("lyrics", parsed.data);
              demo.go("/dashboard/create/lyrics");
            })()
          }
          className="w-full py-4 bg-primary text-primary-foreground font-bold text-base rounded-xl flex items-center justify-center gap-2 mt-4"
          style={{ boxShadow: "0 4px 16px rgba(242,101,34,0.35)" }}
        >
          {t("Enregistrer")} <Icon i="check" size={18} />
        </button>
      </div>
    </div>
  );
}
