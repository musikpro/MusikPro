"use client";
import { useEffect, useRef } from "react";
import { translate as t } from "@/lib/i18n/translate";

export const displayName = "Étape 6 — Génération des paroles (Animation)";
export const screenSize = "mobile";

import Icon from "./Icon";
import CreationTopNav from "./CreationTopNav";
import { useDemo } from "./DemoProvider";

export default function StepGeneratingLyrics() {
  const demo = useDemo();
  const generationStarted = useRef(false);

  useEffect(() => {
    if (generationStarted.current) return;
    generationStarted.current = true;
    void demo.generateLyrics("lyrics.generate");
  }, [demo]);

  return (
    <div className="bg-surface flex flex-col min-h-full relative overflow-hidden">
      <CreationTopNav backHref="/dashboard/create/parameters" current={6} total={8} />
      {/* Animated Background Elements */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="absolute w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-10 text-center flex flex-col items-center justify-center w-full max-w-sm mx-auto flex-1">
        {/* Animated Microphone Icon */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"></div>
            <div
              className="absolute inset-2 rounded-full border-2 border-primary/30"
              style={{
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            ></div>
            <Icon i="music-2" size={40} className="text-primary relative z-10" />
          </div>
        </div>

        {/* Main Title */}
        <h1 className="font-headings font-bold text-2xl text-foreground mb-2">{t("Génération en cours...")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("MusikPro crée tes paroles uniques")}</p>

        {/* Progress Bars - Animated Lyrics Being Generated */}
        <div className="w-full space-y-4 mb-10">
          {/* Line 1 */}
          <div className="text-left">
            <div className="h-3 bg-card rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: "100%", animation: "slideIn 1.5s ease-out" }}
              ></div>
            </div>
            <p
              className="text-xs text-foreground font-medium leading-relaxed"
              style={{ opacity: 1, animation: "fadeIn 1.5s ease-out" }}
            >
              {t("Au cœur de la nuit étoilée")}
            </p>
          </div>

          {/* Line 2 */}
          <div className="text-left">
            <div className="h-3 bg-card rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: "85%", animation: "slideIn 2.5s ease-out" }}
              ></div>
            </div>
            <p
              className="text-xs text-foreground font-medium leading-relaxed"
              style={{ opacity: 1, animation: "fadeIn 2.5s ease-out" }}
            >
              {t("Ton amour brille de mille feux")}
            </p>
          </div>

          {/* Line 3 */}
          <div className="text-left">
            <div className="h-3 bg-card rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: "60%", animation: "slideIn 3.5s ease-out" }}
              ></div>
            </div>
            <p
              className="text-xs text-muted-foreground font-medium leading-relaxed"
              style={{ opacity: 0.7, animation: "fadeIn 3.5s ease-out" }}
            >
              {t("À jamais gravé dans nos cœurs...")}
            </p>
          </div>

          {/* Line 4 - Cursor animation */}
          <div className="text-left">
            <div className="h-3 bg-card rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-primary/40 rounded-full"
                style={{ width: "35%", animation: "slideIn 4.5s ease-out" }}
              ></div>
            </div>
            <p
              className="text-xs text-muted-foreground font-medium leading-relaxed"
              style={{ opacity: 0.5, animation: "fadeIn 4.5s ease-out" }}
            >
              {t("Les moments partagés...")}
              <span className="inline-block w-2 h-3 bg-primary ml-1 animate-pulse"></span>
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          {t("Étape 6 sur 8 — Génération")}
        </div>

        {/* Tip */}
        <div className="bg-secondary/30 rounded-lg px-3 py-2 w-full">
          <p className="text-xs text-foreground">💡 {t("Les paroles seront personnalisées pour ton moment spécial")}</p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
