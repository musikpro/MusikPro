"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

/**
 * Eases mouse-wheel/trackpad scrolling on the landing page into one continuous, interpolated
 * motion instead of the browser/OS's default fixed-step jumps — mounted once in app/page.tsx
 * (not inside LandingPageDesktop/Mobile, which are both always mounted simultaneously behind a
 * CSS media query — a second Lenis instance would fight the first over the same window scroll).
 * Skipped entirely for prefers-reduced-motion, matching the accessibility stance already used for
 * HeroRotatingText and the .reveal-up animations elsewhere on this page.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.1, duration: 1.1 });
    return () => lenis.destroy();
  }, []);

  return null;
}
