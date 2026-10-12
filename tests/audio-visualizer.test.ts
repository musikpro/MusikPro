import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import AudioVisualizer from "@/components/ui/audio-visualizer";
import {
  AUDIO_VISUALIZER_VARIANTS,
  audioVisualizerBarCount,
  audioVisualizerBarTiming,
  type AudioVisualizerVariant,
} from "@/lib/audio-visualizer/settings";

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8");
const variants = Object.keys(AUDIO_VISUALIZER_VARIANTS) as AudioVisualizerVariant[];

describe("visualiseur audio commun", () => {
  it("fixe le nombre de barres de chaque emplacement dans un seul réglage", () => {
    expect(audioVisualizerBarCount("player")).toBe(28);
    expect(audioVisualizerBarCount("card")).toBe(24);
    expect(audioVisualizerBarCount("inline")).toBe(20);
    expect(audioVisualizerBarCount("ambient")).toBe(3);
  });

  it("calcule la durée et le décalage des barres de façon déterministe, décalage négatif", () => {
    expect(audioVisualizerBarTiming(0)).toEqual({ durationMs: 520, delayMs: -0 });
    for (let index = 0; index < 40; index++) {
      const timing = audioVisualizerBarTiming(index);
      expect(timing).toEqual(audioVisualizerBarTiming(index));
      expect(timing.delayMs).toBeLessThanOrEqual(0);
      expect(timing.durationMs).toBeGreaterThanOrEqual(520);
    }
  });

  it.each(variants)("rend les barres de la variante %s, masquées aux lecteurs d'écran", (variant) => {
    const html = renderToStaticMarkup(createElement(AudioVisualizer, { variant, playing: true }));
    expect(html).toContain(`audio-viz--${variant}`);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("is-playing");
    expect(html.match(/audio-viz-bar/g)).toHaveLength(audioVisualizerBarCount(variant));
  });

  it("n'anime pas en CSS les barres pilotées par l'analyseur audio", () => {
    const live = renderToStaticMarkup(
      createElement(AudioVisualizer, { variant: "player", playing: true, animated: false }),
    );
    expect(live).toContain("is-live");
    expect(live).not.toContain("is-animated");
  });

  it("applique les hauteurs fixes de la variante inline", () => {
    const html = renderToStaticMarkup(createElement(AudioVisualizer, { variant: "inline", playing: false }));
    expect(html).toContain("--viz-bar-h:3px");
    expect(html).toContain("--viz-bar-h:10px");
  });
});

describe("branchement du visualiseur commun", () => {
  const consumers = [
    "app/s/[slug]/PublicSongPlayer.tsx",
    "components/banani/CardAudioPlayer.tsx",
    "components/banani/MySongsGeneratedScreen.tsx",
    "components/banani/AmbientPlayerButton.tsx",
  ];

  it.each(consumers)("%s utilise le composant commun", (file) => {
    expect(read(file)).toContain('from "@/components/ui/audio-visualizer"');
  });

  it("ne garde aucun ancien visualiseur local", () => {
    const css = `${read("app/globals.css")}\n${read("app/dashboard/banani.css")}`;
    expect(css).not.toMatch(
      /psp-waveform|trend-eq|song-inline-waveform|ambient-player-button-(waveform|bar)|musik-inline-wave/,
    );
    for (const file of consumers) {
      expect(read(file)).not.toMatch(/psp-waveform|trend-eq|song-inline-waveform|ambient-player-button-(waveform|bar)/);
    }
  });
});
