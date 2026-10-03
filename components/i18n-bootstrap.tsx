"use client";

import { useEffect } from "react";
import { markI18nReady } from "@/lib/i18n/overlay";
import { scheduleI18nReady } from "@/lib/i18n/ready-schedule";
import { useI18nOverlay } from "@/lib/i18n/use-overlay";

/**
 * Monté une fois dans le layout racine. Charge les traductions de la base pour la langue de <html lang>
 * et, une fois le document entièrement chargé (readyState "complete"/`load`, y compris les segments
 * streamés tard) puis deux requestAnimationFrame, autorise translate() à lire la langue : le premier
 * rendu client reste identique au HTML serveur (pas d'erreur #418). Détails dans lib/i18n/ready-schedule.ts.
 */
export function I18nBootstrap() {
  useI18nOverlay();
  useEffect(() => scheduleI18nReady(window, document, markI18nReady), []);
  return null;
}
