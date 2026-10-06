import { afterEach, describe, expect, it, vi } from "vitest";
import { hideNativeSplash } from "@/lib/mobile/native-splash";

function stubWindow(capacitor: unknown) {
  vi.stubGlobal("window", { Capacitor: capacitor });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hideNativeSplash", () => {
  it("hides the native splash screen with a short fade in the mobile app", () => {
    const hide = vi.fn(async () => undefined);
    stubWindow({ isNativePlatform: () => true, Plugins: { SplashScreen: { hide } } });
    hideNativeSplash();
    expect(hide).toHaveBeenCalledWith({ fadeOutDuration: 300 });
  });

  it("does nothing on the web (no Capacitor, or not a native platform)", () => {
    const hide = vi.fn();
    stubWindow(undefined);
    expect(() => hideNativeSplash()).not.toThrow();
    stubWindow({ isNativePlatform: () => false, Plugins: { SplashScreen: { hide } } });
    hideNativeSplash();
    expect(hide).not.toHaveBeenCalled();
  });

  it("never throws when the plugin is missing or fails", () => {
    stubWindow({ isNativePlatform: () => true, Plugins: {} });
    expect(() => hideNativeSplash()).not.toThrow();
    stubWindow({
      isNativePlatform: () => true,
      Plugins: {
        SplashScreen: {
          hide: () => {
            throw new Error("boom");
          },
        },
      },
    });
    expect(() => hideNativeSplash()).not.toThrow();
    stubWindow({
      isNativePlatform: () => true,
      Plugins: { SplashScreen: { hide: async () => Promise.reject(new Error("x")) } },
    });
    expect(() => hideNativeSplash()).not.toThrow();
  });
});
