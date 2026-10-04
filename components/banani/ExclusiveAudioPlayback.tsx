"use client";

import { useEffect } from "react";
import { mediaToPause } from "@/lib/audio/exclusive-playback";

/**
 * One song at a time across the whole site: the instant any <audio>/<video> starts, every other one
 * that is still playing is paused (cards "Tendances", "Mes chansons", inline "Écouter" buttons, the
 * public song page, the owner dashboard previews, …). The native `play` event doesn't bubble but does
 * fire during the capture phase on every ancestor, so a single listener covers current and future
 * players without touching each of them. It is mounted once, in the root layout. The ambient music
 * (`data-audio-role="ambient"`) is exempt: `AmbientPlayerContext` ducks it on its own. The owner can turn the
 * rule off from /admin/settings (`enabled={false}`), see lib/settings/playback.ts.
 * Renders nothing.
 */
export default function ExclusiveAudioPlayback({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const pauseOthers = (event: Event) => {
      const started = event.target;
      if (!(started instanceof HTMLMediaElement)) return;
      const all = document.querySelectorAll<HTMLMediaElement>("audio, video");
      for (const media of mediaToPause(started, all)) media.pause();
    };
    document.addEventListener("play", pauseOthers, true);
    return () => document.removeEventListener("play", pauseOthers, true);
  }, [enabled]);
  return null;
}
