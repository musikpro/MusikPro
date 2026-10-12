"use client";

import type { CSSProperties } from "react";
import {
  AUDIO_VISUALIZER_VARIANTS,
  audioVisualizerBarCount,
  audioVisualizerBarTiming,
  type AudioVisualizerVariant,
} from "@/lib/audio-visualizer/settings";
import "./audio-visualizer.css";

type AudioVisualizerProps = {
  variant: AudioVisualizerVariant;
  /** Vrai pendant la lecture : les barres s'animent (ou prennent la couleur active si elles sont pilotées par l'analyseur). */
  playing: boolean;
  /**
   * Vrai (par défaut) : animation CSS décorative. Faux : la hauteur des barres est pilotée en direct par l'analyseur
   * audio via `barRef` (le CSS ne les anime alors pas).
   */
  animated?: boolean;
  /** Reçoit chaque barre pour que l'analyseur audio règle sa hauteur (transform: scaleY). */
  barRef?: (element: HTMLSpanElement | null, index: number) => void;
  className?: string;
};

/** Visualiseur audio unique de l'application : mêmes barres, mêmes réglages et même CSS partout. */
export default function AudioVisualizer({
  variant,
  playing,
  animated = true,
  barRef,
  className = "",
}: AudioVisualizerProps) {
  const { heights } = AUDIO_VISUALIZER_VARIANTS[variant];
  const count = audioVisualizerBarCount(variant);
  return (
    <div
      className={`audio-viz audio-viz--${variant} ${playing ? "is-playing" : ""} ${animated ? "is-animated" : "is-live"} ${className}`.trim()}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => {
        const { durationMs, delayMs } = audioVisualizerBarTiming(index);
        const style: CSSProperties & Record<string, string> = {
          "--viz-duration": `${durationMs}ms`,
          "--viz-delay": `${delayMs}ms`,
        };
        if (heights) style["--viz-bar-h"] = `${heights[index]}px`;
        return (
          <span
            key={index}
            ref={barRef ? (element) => barRef(element, index) : undefined}
            className="audio-viz-bar"
            style={style}
          />
        );
      })}
    </div>
  );
}
