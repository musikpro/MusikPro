"use client";

import { useEffect } from "react";
import { markI18nReady } from "@/lib/i18n/overlay";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

/**
 * Monté une fois dans le layout racine. Charge les traductions de la base pour la langue de <html lang>
 * et, une fois la peinture suivante passée (deux requestAnimationFrame, comme DemoProvider), autorise
 * translate() à lire la langue : le premier rendu client reste identique au HTML serveur (pas d'erreur #418).
 */
export function I18nBootstrap() {
  useI18nOverlay();
  useEffect(() => {
    let second: number | null = null;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => markI18nReady());
    });
    return () => {
      window.cancelAnimationFrame(first);
      if (second !== null) window.cancelAnimationFrame(second);
    };
  }, []);
  return null;
}
