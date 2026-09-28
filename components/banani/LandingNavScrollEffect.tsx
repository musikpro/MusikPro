"use client";

import { useEffect } from "react";

/**
 * Toggles `.landing-nav-scrolled` on every `.landing-nav` element once the page scrolls past a
 * small threshold — mounted once in app/page.tsx (like SmoothScroll) since LandingPageDesktop/Mobile
 * are both always mounted simultaneously behind a CSS media query, each rendering its own `.landing-nav`.
 */
export default function LandingNavScrollEffect() {
  useEffect(() => {
    const navs = document.querySelectorAll<HTMLElement>(".landing-nav");
    if (!navs.length) return undefined;
    const onScroll = () => {
      const scrolled = window.scrollY > 24;
      navs.forEach((nav) => nav.classList.toggle("landing-nav-scrolled", scrolled));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
