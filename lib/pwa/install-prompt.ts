"use client";

import { useSyncExternalStore } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STANDALONE_QUERY = "(display-mode: standalone)";

let deferred: InstallPromptEvent | null = null;
let installedNow = false;
let started = false;
const INSTALLED_KEY = "musikpro_app_installed";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function rememberInstalled(): void {
  try {
    window.localStorage.setItem(INSTALLED_KEY, "1");
  } catch {
    // stockage indisponible (navigation privée) : on retombe sur la détection en direct
  }
}

function wasInstalledBefore(): boolean {
  try {
    return window.localStorage.getItem(INSTALLED_KEY) === "1";
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia(STANDALONE_QUERY).matches || iosStandalone;
}

/**
 * Capte l'invitation d'installation du navigateur (Chrome / Edge) dès le chargement de la page : l'événement
 * `beforeinstallprompt` n'est émis qu'une fois, souvent avant l'affichage des composants qui en ont besoin.
 */
export function startInstallPromptCapture(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  // Ouverte en mode application : on s'en souvient, pour masquer aussi l'invitation dans un onglet du navigateur.
  if (isStandalone()) rememberInstalled();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installedNow = true;
    rememberInstalled();
    emit();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function subscribeStandalone(listener: () => void) {
  const media = window.matchMedia(STANDALONE_QUERY);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

/** Vrai quand le navigateur peut ouvrir tout de suite sa fenêtre d'installation. */
export function useInstallPromptAvailable(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
}

/** Vrai quand le site tourne déjà comme application installée (ou vient d'être installé). Rendu serveur = faux. */
export function useAppInstalled(): boolean {
  const justInstalled = useSyncExternalStore(
    subscribe,
    () => installedNow || wasInstalledBefore(),
    () => false,
  );
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  return justInstalled || standalone;
}

export type DevicePlatform = "android" | "ios" | "other";

function detectPlatform(): DevicePlatform {
  const agent = navigator.userAgent;
  if (/android/i.test(agent)) return "android";
  if (/iphone|ipad|ipod/i.test(agent)) return "ios";
  return "other";
}

const subscribeNever = () => () => {};

/** Plateforme de l'appareil (rendu serveur = « other » : pas d'écart d'hydratation). */
export function useDevicePlatform(): DevicePlatform {
  return useSyncExternalStore(subscribeNever, detectPlatform, () => "other");
}

/** Ouvre la fenêtre d'installation du navigateur. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    emit();
    return outcome;
  } catch {
    return "unavailable";
  }
}
