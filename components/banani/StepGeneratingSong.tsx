"use client";
import { useEffect, useRef, useState } from "react";
import { translate as t } from "@/lib/i18n/translate";
import Icon from "./Icon";
import AppLogo from "./AppLogo";
import { useDemo } from "./DemoProvider";
import { apiFetch } from "@/lib/api/client";

export const displayName = "Génération en cours — Attente";
export const screenSize = "mobile";

/** Demo-only fake animation duration — the real path below waits for genuine Musicful completion instead. */
const DEMO_DURATION_MS = 4000;
const POLL_INTERVAL_MS = 5000;
/** Musicful generation can genuinely take minutes; after this we stop waiting HERE but the
 * job keeps processing server-side and stays trackable (with live status) on the songs page. */
const MAX_REAL_WAIT_MS = 5 * 60 * 1000;

const encouragementMessages = [
  { icon: "music-2", text: "Ta chanson unique est en cours de création…" },
  { icon: "mic", text: "Chaque note est personnalisée juste pour toi." },
  { icon: "heart", text: "Prépare-toi à écouter quelque chose d’extraordinaire !" },
] as const;

function formatElapsed(totalSeconds: number) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export default function StepGeneratingSong() {
  const demo = useDemo();
  const [progress, setProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const skipRequested = useRef(false);
  const finished = useRef(false);
  /** Guards ONLY the real submission call (a real, non-idempotent Musicful request + credit
   * deduction) against React's dev Strict Mode double-invoking this effect — unlike the
   * interval/timeout below, this must never fire twice. Intentionally never reset by the
   * effect's cleanup, since the whole point is to survive the synthetic mount→cleanup→mount. */
  const submissionStarted = useRef(false);

  useEffect(() => {
    let active = true;
    const startedAt = Date.now();
    const durationMs = demo.isDemo ? DEMO_DURATION_MS : MAX_REAL_WAIT_MS;
    const maxProgress = demo.isDemo ? 100 : 92;
    const messageStepMs = demo.isDemo ? DEMO_DURATION_MS / encouragementMessages.length : 20_000;

    const tick = window.setInterval(() => {
      if (!active) return;
      const elapsed = Date.now() - startedAt;
      setProgress((prev) => (prev >= 100 ? prev : Math.min(maxProgress, Math.round((elapsed / durationMs) * maxProgress))));
      setElapsedSeconds(Math.floor(elapsed / 1000));
      setMessageIndex(Math.min(encouragementMessages.length - 1, Math.floor(elapsed / messageStepMs)));
    }, demo.isDemo ? 100 : 1000);

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      setProgress(100);
      demo.go("/dashboard/songs");
    };

    async function runReal() {
      const submission = await demo.startRealGeneration();
      if (!active || skipRequested.current) return;
      if (!submission) return; // startRealGeneration already redirected on failure/insufficient credits.
      const deadline = Date.now() + MAX_REAL_WAIT_MS;
      while (active && !skipRequested.current && Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, POLL_INTERVAL_MS));
        if (!active || skipRequested.current) break;
        try {
          const result = await apiFetch<{ song: { status: string } }>(`/api/songs/${submission.songGroupId}`, { timeoutMs: 20_000 });
          if (result.song.status === "completed" || result.song.status === "failed") break;
        } catch {
          // A transient poll failure just retries on the next tick until the deadline.
        }
      }
      if (!active) return;
      await demo.refreshSongs();
      if (active) finish();
    }

    const demoTimer = demo.isDemo
      ? window.setTimeout(() => {
          if (active) void demo.generateSong();
        }, DEMO_DURATION_MS)
      : undefined;
    if (!demo.isDemo && !submissionStarted.current) {
      submissionStarted.current = true;
      void runReal();
    }

    return () => {
      active = false;
      window.clearInterval(tick);
      if (demoTimer) window.clearTimeout(demoTimer);
    };
    // Runs once: restarting the timers/polling on every demo context change would replay the animation or double-submit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => {
    skipRequested.current = true;
    if (demo.isDemo) {
      void demo.generateSong();
      return;
    }
    if (finished.current) return;
    finished.current = true;
    demo.go("/dashboard/songs");
  };

  return (
    <div className="bg-background flex flex-col items-center" style={{ minHeight: 812 }}>
      <div
        className="w-full px-4 pb-4 flex items-center justify-between"
        style={{ paddingTop: "max(28px, calc(env(safe-area-inset-top, 0px) + 16px))" }}
      >
        <AppLogo size="sm" />
        <div className="flex items-center gap-1.5 bg-secondary border border-primary/20 px-3 py-1.5 rounded-xl">
          <Icon i="zap" size={13} className="text-primary" />
          <span className="text-xs font-bold text-primary">{t("Génération IA")}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 w-full px-6 pt-4">
        <div className="relative flex items-center justify-center mb-8">
          <div
            className="absolute w-44 h-44 rounded-full border-2 border-primary/10 animate-ping"
            style={{ animationDuration: "2.6s" }}
          />
          <div
            className="absolute w-36 h-36 rounded-full border-2 border-primary/20 animate-ping"
            style={{ animationDuration: "2.2s", animationDelay: "0.2s" }}
          />
          <div className="absolute w-28 h-28 rounded-full border-2 border-primary/35 animate-pulse" />
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#f26522,#f4845f)", boxShadow: "0 8px 32px rgba(242,101,34,0.45)" }}
          >
            <Icon i="music-2" size={34} className="text-primary-foreground" />
          </div>
        </div>

        <h2 className="font-headings font-bold text-2xl text-foreground text-center mb-2 leading-tight">
          {t("Ta chanson est en création…")}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed px-4">
          {t("L’IA compose une chanson unique rien que pour toi. Prends un moment, ça arrive bientôt !")}
        </p>

        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-secondary border border-primary/20 rounded-lg flex items-center justify-center">
            <Icon i="timer" size={16} className="text-primary" />
          </div>
          <span className="font-headings font-bold text-3xl text-foreground" aria-live="off">
            {formatElapsed(elapsedSeconds)}
          </span>
          <span className="text-xs text-muted-foreground">{t("écoulé")}</span>
        </div>

        <div className="w-full mb-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>{t("Progression")}</span>
            <span className="font-bold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg,#f26522,#f4845f)", transition: "width 120ms linear" }}
            />
          </div>
        </div>

        <div className="w-full bg-secondary border border-primary/20 rounded-2xl px-4 py-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">
              🎶
            </span>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">{t("Le saviez-vous ?")}</p>
              <p className="text-sm text-foreground leading-relaxed">
                {t("Chaque chanson MusikPro est unique — les paroles sont générées spécialement pour toi et ta personne.")}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex flex-col gap-2" role="status" aria-live="polite">
          {encouragementMessages.map((msg, i) => (
            <div
              key={msg.text}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                i === messageIndex
                  ? "bg-secondary border-primary/25"
                  : i < messageIndex
                    ? "bg-input border-border opacity-50"
                    : "bg-input border-border opacity-30"
              }`}
            >
              <Icon
                i={msg.icon}
                size={17}
                className={i === messageIndex ? "text-primary flex-shrink-0" : "text-muted-foreground flex-shrink-0"}
              />
              <span className={`text-sm font-medium ${i === messageIndex ? "text-primary" : "text-muted-foreground"}`}>
                {t(msg.text)}
              </span>
              {i < messageIndex ? <Icon i="circle-check-big" size={14} className="text-primary ml-auto flex-shrink-0" /> : null}
              {i === messageIndex ? (
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0s" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.15s" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0.3s" }} />
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <button
          type="button"
          data-demo-ready
          onClick={skip}
          className="w-full mt-8 py-3 rounded-2xl font-bold text-sm text-primary flex items-center justify-center gap-2 border border-primary/20 bg-secondary"
        >
          {t(demo.isDemo ? "Passer l’animation" : "Continuer en arrière-plan")}
        </button>
      </div>

      <div className="h-10" />
    </div>
  );
}
