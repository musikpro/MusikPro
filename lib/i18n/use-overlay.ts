"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getOverlayVersion, setOverlay, subscribeOverlay } from "./overlay";
import { overlayLocaleSchema } from "./overlay-schema";

const REFETCH_AFTER_MS = 60_000;
const loadedAt = new Map<string, number>();

function isDictionary(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

async function loadCurrentLocale() {
  const parsed = overlayLocaleSchema.safeParse(document.documentElement.lang.split("-")[0]);
  if (!parsed.success) return; // français ou langue inconnue : rien à charger
  const locale = parsed.data;
  const last = loadedAt.get(locale);
  if (last && Date.now() - last < REFETCH_AFTER_MS) return;
  loadedAt.set(locale, Date.now());
  try {
    const response = await fetch(`/api/i18n/overlay?locale=${locale}`);
    if (!response.ok) throw new Error("overlay unavailable");
    const dictionary: unknown = await response.json();
    if (isDictionary(dictionary)) setOverlay(locale, dictionary);
  } catch {
    loadedAt.delete(locale); // repli silencieux sur les fichiers JSON ; nouvel essai au prochain changement de langue
  }
}

/** Charge les traductions de la base pour la langue courante et re-rend le composant quand elles arrivent. */
export function useI18nOverlay(): void {
  useSyncExternalStore(subscribeOverlay, getOverlayVersion, () => 0);
  useEffect(() => {
    void loadCurrentLocale();
    const observer = new MutationObserver(() => void loadCurrentLocale());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
}
