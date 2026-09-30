"use client";

import { useEffect } from "react";

/**
 * One song at a time across the whole page: the instant any <audio>/<video> starts, every other one
 * that is still playing is paused (the in-card player of "Ils ont créé avec MusikPro", the inline
 * "Écouter" buttons of "Bibliothèque populaire", …). The native `play` event doesn't bubble but does
 * fire during the capture phase on every ancestor, so a single listener covers current and future
 * players without touching each of them. Renders nothing.
 */
export default function ExclusiveAudioPlayback() {
  useEffect(() => {
    const pauseOthers = (event: Event) => {
      const started = event.target;
      if (!(started instanceof HTMLMediaElement)) return;
      document.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => {
        if (media !== started && !media.paused) media.pause();
      });
    };
    document.addEventListener("play", pauseOthers, true);
    return () => document.removeEventListener("play", pauseOthers, true);
  }, []);
  return null;
}
