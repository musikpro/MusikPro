"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { translate as t } from "@/lib/i18n/translate";
import { lyricsPreview, resumeStepFor, summarizeCreationDraft } from "@/lib/creation-draft/summary";
import type { CreationDraftData, CreationDraftStep } from "@/lib/validation/creation-draft";
import AppLogo from "./AppLogo";
import Icon from "./Icon";
import { useDemo } from "./DemoProvider";

export type ResumableCreationDraft = {
  step: CreationDraftStep;
  data: CreationDraftData;
  /** Date ISO de la dernière sauvegarde. */
  updatedAt: string;
};

function relativeTime(iso: string, language: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  if (Math.abs(seconds) < 60) return t("À l'instant");
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(-1, "minute");
}

/**
 * Écran d'entrée de la création lorsqu'un parcours a été commencé sans générer la chanson : continuer là où l'on
 * s'était arrêté, ou repartir de zéro (suppression du brouillon, confirmée). Affiché par `app/dashboard/create/page.tsx`.
 */
export default function ResumeOrRestartCreation({ draft }: { draft: ResumableCreationDraft }) {
  const demo = useDemo();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [age, setAge] = useState("");
  const steps = summarizeCreationDraft(draft.data);
  const currentIndex = steps.findIndex((step) => !step.done);
  const preview = lyricsPreview(draft.data.fields.lyrics);

  // Calculé après l'hydratation (dépend de l'heure et de la langue du navigateur) pour éviter tout décalage serveur/client.
  useEffect(() => {
    let active = true;
    window.queueMicrotask(() => {
      if (active) setAge(relativeTime(draft.updatedAt, document.documentElement.lang || "fr"));
    });
    return () => {
      active = false;
    };
  }, [draft.updatedAt]);

  const labels: Record<(typeof steps)[number]["id"], string> = {
    story: t("Histoire sélectionnée"),
    style: t("Style musical choisi"),
    lyrics: t("Paroles générées"),
    checkout: t("Finalisation & paiement"),
  };

  const resume = () => {
    demo.restoreCreationDraft(draft.data);
    demo.go(`/dashboard/create/${resumeStepFor(draft.step, draft.data)}`);
  };

  const restart = async () => {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/creation-draft", { method: "DELETE", credentials: "same-origin" });
      if (!response.ok) throw new Error("delete failed");
      demo.resetCreationDraft();
      router.refresh();
    } catch {
      demo.notify(t("Impossible de recommencer pour le moment. Réessaie dans un instant."));
      setPending(false);
    }
  };

  return (
    <div className="bg-background font-body text-foreground flex flex-col" style={{ minHeight: "100dvh" }}>
      <div className="px-5 pt-6 pb-2 flex items-center justify-between">
        <AppLogo size="sm" />
        <button
          type="button"
          data-demo-ready="true"
          onClick={() => demo.go("/dashboard")}
          aria-label={t("Fermer")}
          className="w-9 h-9 bg-input border border-border rounded-lg flex items-center justify-center"
        >
          <Icon i="x" size={16} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-5 pt-4 pb-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#f26522,#f4845f)" }}
            >
              <Icon i="music-2" size={16} className="text-primary-foreground" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              {t("Création de chanson")}
            </span>
          </div>
          <h1 className="font-headings font-bold text-2xl text-foreground leading-tight mb-2">
            {t("Tu avais déjà commencé une chanson")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("Veux-tu continuer là où tu t'es arrêté(e) ou repartir de zéro ?")}
          </p>
        </div>

        <div className="bg-secondary border border-primary/20 rounded-2xl p-4 mb-6">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-bold text-primary uppercase tracking-widest">{t("Session en cours")}</p>
            {age && (
              <span className="text-xs text-muted-foreground bg-background border border-border px-2 py-0.5 rounded-full">
                {age}
              </span>
            )}
          </div>

          <ol className="flex flex-col gap-2 mb-4" aria-label={t("Étapes de la création")}>
            {steps.map((step, index) => (
              <li key={step.id} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.done ? "bg-primary" : "border-2 border-border bg-background"
                  }`}
                >
                  {step.done ? (
                    <Icon i="check" size={10} className="text-primary-foreground" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                    {labels[step.id]}
                  </span>
                  {step.detail && <span className="text-xs text-muted-foreground"> · {step.detail}</span>}
                  {!step.done && step.id === "checkout" && (
                    <span className="text-xs text-muted-foreground"> · {t("Non complété")}</span>
                  )}
                </div>
                {index === currentIndex && (
                  <span className="text-xs font-bold text-orange-500 flex-shrink-0">{t("← Ici")}</span>
                )}
              </li>
            ))}
          </ol>

          {preview && (
            <div className="bg-background border border-border rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon i="file-text" size={13} className="text-primary" />
                <span className="text-xs font-bold text-foreground">{t("Aperçu des paroles générées")}</span>
              </div>
              <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-3">{preview}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            data-demo-ready="true"
            onClick={resume}
            disabled={pending}
            className="w-full rounded-2xl py-4 px-5 flex items-center gap-4 text-primary-foreground"
            style={{
              background: "linear-gradient(135deg,#f26522,#f4845f)",
              boxShadow: "0 6px 20px rgba(242,101,34,0.30)",
            }}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon i="circle-play" size={20} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-base leading-tight">{t("Continuer ma chanson")}</p>
              <p className="text-xs opacity-80 mt-0.5">{t("Reprendre là où tu t'es arrêté(e)")}</p>
            </div>
            <Icon i="arrow-right" size={18} className="opacity-80 flex-shrink-0" />
          </button>

          {!confirming ? (
            <button
              type="button"
              data-demo-ready="true"
              onClick={() => setConfirming(true)}
              disabled={pending}
              className="w-full rounded-2xl py-4 px-5 flex items-center gap-4 bg-card border border-border"
            >
              <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon i="refresh-cw" size={18} className="text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-base text-foreground leading-tight">{t("Recommencer de zéro")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("Nouvelle histoire, nouveaux paramètres")}</p>
              </div>
              <Icon i="arrow-right" size={18} className="text-muted-foreground flex-shrink-0" />
            </button>
          ) : (
            <div
              role="alertdialog"
              aria-label={t("Confirmer le nouveau départ")}
              className="rounded-2xl p-4 bg-card border border-border"
            >
              <p className="text-sm font-semibold text-foreground mb-1">{t("Supprimer cette session ?")}</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                {t("La session précédente et les paroles générées seront supprimées définitivement.")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-demo-ready="true"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className="flex-1 rounded-xl py-3 text-sm font-semibold bg-input border border-border"
                >
                  {t("Annuler")}
                </button>
                <button
                  type="button"
                  data-demo-ready="true"
                  onClick={() => void restart()}
                  disabled={pending}
                  className="flex-1 rounded-xl py-3 text-sm font-bold text-primary-foreground bg-primary"
                >
                  {pending ? t("Suppression…") : t("Oui, recommencer")}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 mt-5 px-1">
          <Icon i="circle-alert" size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t("Si tu recommences, la session précédente et les paroles générées seront supprimées définitivement.")}
          </p>
        </div>
      </div>
    </div>
  );
}
