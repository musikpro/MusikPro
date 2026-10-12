"use client";
import "./credits-gate.css";

import { useEffect, useRef, useState } from "react";
import { translate as t, translateTemplate } from "@/lib/i18n/translate";
import { apiFetch } from "@/lib/api/client";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";
import type { CreationDraftData } from "@/lib/validation/creation-draft";
import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import { useDemo } from "./DemoProvider";

const POLL_INTERVAL_MS = 2_000;
// Le paiement est crédité par le fournisseur (webhook) : quelques secondes en général, plus parfois.
const MAX_WAIT_MS = 90_000;

export const displayName = "Confirmation du paiement avant les paroles";
export const screenSize = "mobile";

/**
 * Page de retour du paiement Chariow lorsque l'achat servait à débloquer les paroles : restaure le brouillon enregistré,
 * attend que les crédits soient arrivés puis lance toute seule la génération des paroles (écran d'animation).
 */
export default function AfterPaymentLyrics({ draft }: { draft: CreationDraftData | null }) {
  const demo = useDemo();
  const restoreStarted = useRef(false);
  const [restoreDone, setRestoreDone] = useState(false);
  const [credited, setCredited] = useState(false);
  const [late, setLate] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hasStory = Boolean(demo.fields.story.trim());

  // 1. Le retour du paiement recharge la page : on remet le parcours en mémoire depuis le brouillon du compte.
  useEffect(() => {
    if (restoreStarted.current || demo.isDemo || !draft || hasStory) return;
    restoreStarted.current = true;
    demo.restoreCreationDraft(draft);
    window.queueMicrotask(() => setRestoreDone(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hasStory, demo.isDemo]);

  // 2. Attente des crédits (lecture seule du solde, rien n'est débité).
  useEffect(() => {
    if (demo.isDemo) return;
    let stopped = false;
    const startedAt = Date.now();
    window.queueMicrotask(() => setLate(false));
    const check = async () => {
      try {
        const result = await apiFetch<{ balance: number }>("/api/credits/balance", { timeoutMs: 8_000, retries: 0 });
        if (stopped) return;
        if (Number.isFinite(result.balance) && result.balance >= CREDITS_PER_GENERATION) {
          setCredited(true);
          return;
        }
      } catch {
        // On réessaie au prochain passage.
      }
      if (stopped) return;
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setLate(true);
        return;
      }
      window.setTimeout(check, POLL_INTERVAL_MS);
    };
    void check();
    return () => {
      stopped = true;
    };
  }, [demo.isDemo, attempt]);

  // 3. Crédits arrivés et parcours restauré : on lance les paroles.
  useEffect(() => {
    if (!credited || !hasStory) return;
    const timer = window.setTimeout(() => demo.go("/dashboard/create/lyrics/generating"), 900);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credited, hasStory]);

  const missingDraft = !hasStory && (restoreDone || !draft) && !demo.isDemo;

  const steps = [
    { label: t("Paiement reçu"), done: true },
    { label: t("Crédits ajoutés à ton compte"), done: credited },
    { label: t("Génération de tes paroles"), done: false },
  ];

  return (
    <div className="bg-surface flex flex-col min-h-full relative overflow-hidden">
      <CreationTopNav backHref="/dashboard/create/parameters" current={5} total={8} />
      <div className="relative z-10 px-4 py-10 text-center flex flex-col items-center justify-center w-full max-w-sm mx-auto flex-1">
        <div className="mb-6 relative w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          {late || missingDraft ? (
            <Icon i="clock" size={34} className="text-primary" />
          ) : (
            <>
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
                style={{ animation: "spin 1.6s linear infinite" }}
              />
              <Icon i="coins" size={30} className="text-primary" />
            </>
          )}
        </div>

        <h1 className="font-headings font-bold text-2xl text-foreground mb-2">
          {missingDraft
            ? t("Paiement reçu")
            : late
              ? t("Ton paiement est en cours de validation")
              : t("Confirmation de ton paiement…")}
        </h1>
        <p className="text-sm text-muted-foreground mb-8" role="status" aria-live="polite">
          {missingDraft
            ? t("Tes crédits sont disponibles. Reprends ta création pour générer tes paroles.")
            : late
              ? t("La banque met un peu plus de temps que prévu. Tes crédits seront ajoutés dès la confirmation.")
              : t("Nous ajoutons tes crédits, puis tes paroles démarrent automatiquement.")}
        </p>

        {!missingDraft && !late && (
          <ol className="w-full space-y-3 text-left">
            {steps.map((step, index) => (
              <li key={step.label} className="flex items-center gap-3 text-sm text-foreground">
                <span
                  className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${step.done ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {step.done ? <Icon i="check" size={14} /> : index + 1}
                </span>
                {step.label}
              </li>
            ))}
          </ol>
        )}

        {(late || missingDraft) && (
          <div className="mt-2 w-full space-y-2">
            {missingDraft ? (
              <button
                type="button"
                onClick={() => demo.go("/dashboard/create")}
                className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
              >
                {t("Reprendre ma création")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                  className="w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
                >
                  {t("Vérifier à nouveau")}
                </button>
                <button
                  type="button"
                  onClick={() => demo.go("/dashboard/credits")}
                  className="w-full rounded-xl px-5 py-3 font-semibold text-muted-foreground"
                >
                  {t("Voir mes crédits")}
                </button>
              </>
            )}
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          {translateTemplate("Ta chanson utilisera {credits} crédits au moment de la composition.", {
            credits: CREDITS_PER_GENERATION,
          })}
        </p>
      </div>
    </div>
  );
}
