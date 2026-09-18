"use client";

type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => "ios" | "android" | "web" | string;
};

declare global {
  interface Window {
    Capacitor?: CapacitorBridge;
  }
}

export function isNativeMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function nativeMobilePlatform(): "ios" | "android" | "web" | string {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() || "web";
}
