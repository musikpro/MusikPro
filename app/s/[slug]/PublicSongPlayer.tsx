"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Icon from "@/components/banani/Icon";

const BAR_COUNT = 28;
// Combien de frames (~60fps) on laisse une chance à l'analyseur audio réel avant
// d'abandonner et de se rabattre définitivement sur l'animation CSS décorative —
// certains CDN ne renvoient pas les en-têtes CORS nécessaires à l'AnalyserNode, qui
// reçoit alors silencieusement des données à zéro (pas d'exception à intercepter).
const DETECTION_FRAMES = 40;

type PublicSongPlayerProps = {
  audioUrl: string;
  title: string;
  playLabel: string;
  pauseLabel: string;
  seekLabel: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PublicSongPlayer({ audioUrl, title, playLabel, pauseLabel, seekLabel }: PublicSongPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectionFrameRef = useRef(0);
  const graphAttemptedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [useCssFallback, setUseCssFallback] = useState(true);
  // Vrai tant que l'utilisateur fait glisser la barre : on n'écrase alors pas sa position avec
  // les mises à jour de lecture (sinon le curseur "saute" en arrière pendant le glissement).
  const scrubbingRef = useRef(false);

  // La durée est lue directement sur l'élément <audio> (et pas seulement via `onLoadedMetadata`) :
  // sur mobile, les métadonnées peuvent arriver AVANT que React ait attaché ses écouteurs à la
  // page rendue côté serveur — l'événement est alors perdu, la durée reste à 0, et la barre (dont
  // le maximum vaut la durée) ne peut ni avancer ni être déplacée.
  function syncDuration() {
    const value = audioRef.current?.duration;
    if (value && Number.isFinite(value) && value > 0) setDuration((prev) => (prev === value ? prev : value));
  }

  useEffect(() => {
    syncDuration();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // `timeupdate` n'arrive que ~4 fois par seconde et peut être ralenti/absent dans certains
  // navigateurs mobiles ou WebViews : pendant la lecture, on relit aussi l'heure à intervalle fixe.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio) return;
      syncDuration();
      if (!scrubbingRef.current) setCurrentTime(audio.currentTime);
    }, 250);
    return () => window.clearInterval(id);
  }, [isPlaying]);

  function ensureAudioGraph() {
    if (graphAttemptedRef.current || !audioRef.current) return;
    graphAttemptedRef.current = true;
    try {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioContextCtor();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      analyserRef.current = null;
    }
  }

  function tick() {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return;
    analyser.getByteFrequencyData(data);
    let hasSignal = false;
    for (let i = 0; i < BAR_COUNT; i++) {
      const bucket = Math.floor((i / BAR_COUNT) * data.length);
      if ((data[bucket] || 0) > 4) {
        hasSignal = true;
        break;
      }
    }
    if (hasSignal) {
      detectionFrameRef.current = 0;
      setUseCssFallback((prev) => (prev ? false : prev));
      for (let i = 0; i < BAR_COUNT; i++) {
        const bucket = Math.floor((i / BAR_COUNT) * data.length);
        const value = data[bucket] || 0;
        const bar = barRefs.current[i];
        if (bar) bar.style.transform = `scaleY(${Math.max(0.15, value / 255)})`;
      }
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    detectionFrameRef.current += 1;
    if (detectionFrameRef.current > DETECTION_FRAMES) {
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  async function handleToggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      ensureAudioGraph();
      await audioCtxRef.current?.resume().catch(() => {});
      try {
        await audio.play();
      } catch {
        // lecture bloquée par le navigateur (rare) — les contrôles restent utilisables
      }
    } else {
      audio.pause();
    }
  }

  function handlePlay() {
    setIsPlaying(true);
    detectionFrameRef.current = 0;
    if (analyserRef.current && !rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }

  function handlePause() {
    setIsPlaying(false);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    setCurrentTime(value);
    if (audioRef.current) audioRef.current.currentTime = value;
  }

  function endScrub() {
    scrubbingRef.current = false;
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`psp-player ${isPlaying ? "is-playing" : ""}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        controlsList="nodownload"
        onContextMenu={(event) => event.preventDefault()}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handlePause}
        onTimeUpdate={(event) => {
          if (!scrubbingRef.current) setCurrentTime(event.currentTarget.currentTime);
          syncDuration();
        }}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onLoadedData={syncDuration}
        onCanPlay={syncDuration}
        aria-label={title}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={handleToggle}
        className={`psp-play-button ${isPlaying ? "is-playing" : ""}`}
        aria-label={isPlaying ? pauseLabel : playLabel}
      >
        <Icon i={isPlaying ? "pause" : "play"} size={26} />
      </button>
      <div className={`psp-waveform ${isPlaying ? "is-playing" : ""} ${useCssFallback ? "is-css-fallback" : ""}`} aria-hidden="true">
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <span
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            className="psp-waveform-bar"
          />
        ))}
      </div>
      <div className="psp-progress">
        <input
          type="range"
          className="psp-progress-track"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          onPointerDown={() => {
            scrubbingRef.current = true;
          }}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onBlur={endScrub}
          aria-label={seekLabel}
          style={{ "--psp-progress": `${progressPercent}%` } as CSSProperties}
        />
        <div className="psp-progress-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
