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

export type MobileRuntimeContext = "web-desktop" | "web-mobile" | "native-android" | "native-ios" | "native-unknown";

export function isNativeMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

export function nativeMobilePlatform(): "ios" | "android" | "web" | string {
  if (typeof window === "undefined") return "web";
  return window.Capacitor?.getPlatform?.() || "web";
}

export function mobileRuntimeContext(): MobileRuntimeContext {
  if (typeof window === "undefined") return "web-desktop";
  if (isNativeMobileApp()) {
    const platform = nativeMobilePlatform();
    if (platform === "android") return "native-android";
    if (platform === "ios") return "native-ios";
    return "native-unknown";
  }
  return window.matchMedia("(max-width: 767px)").matches ? "web-mobile" : "web-desktop";
}
