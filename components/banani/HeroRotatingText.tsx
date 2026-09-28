"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { HeroAnimationType } from "@/lib/hero-animation/types";

export type HeroRotatingTextItem = { id: string; emoji: string; label: string };

const ROTATE_INTERVAL_MS = 2500;

/**
 * Cycles through admin-managed words/phrases (see /admin/animated-texts) under the landing Hero
 * title. Static (first item, no interval) when there's only one entry or the visitor prefers
 * reduced motion — same accessibility stance as .reveal-up in app/dashboard/banani.css.
 */
export default function HeroRotatingText({
  texts,
  animationType,
  className = "",
}: {
  texts: HeroRotatingTextItem[];
  animationType: HeroAnimationType;
  className?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (texts.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % texts.length);
    }, ROTATE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [texts.length]);

  if (texts.length === 0) return null;
  const current = texts[index % texts.length];
  const style =
    animationType === "typewriter"
      ? ({ "--hero-type-chars": String([...current.label].length + 2) } as CSSProperties)
      : undefined;

  return (
    <div className={`hero-rotate-line ${className}`}>
      <span key={current.id} className={`hero-rotate-word hero-rotate-${animationType}`} style={style}>
        <span aria-hidden="true">{current.emoji}</span> {current.label}
      </span>
    </div>
  );
}
