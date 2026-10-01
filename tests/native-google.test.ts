import { beforeEach, describe, expect, it, vi } from "vitest";

const initialize = vi.fn();
const login = vi.fn();
const isNative = vi.fn();

vi.mock("@capgo/capacitor-social-login", () => ({ SocialLogin: { initialize, login } }));
vi.mock("@/lib/mobile/native-runtime", () => ({ isNativeMobileApp: () => isNative() }));

import { NATIVE_GOOGLE_CANCELLED, canUseNativeGoogleSignIn, nativeGoogleIdToken } from "@/lib/auth/native-google";

beforeEach(() => {
  initialize.mockReset();
  login.mockReset();
  isNative.mockReset();
});

describe("connexion Google native", () => {
  it("n'est utilisée que dans l'application native et avec un identifiant client", () => {
    isNative.mockReturnValue(true);
    expect(canUseNativeGoogleSignIn("web-client.apps.googleusercontent.com")).toBe(true);
    expect(canUseNativeGoogleSignIn(undefined)).toBe(false);
    isNative.mockReturnValue(false);
    expect(canUseNativeGoogleSignIn("web-client.apps.googleusercontent.com")).toBe(false);
  });

  it("initialise le plugin avec l'identifiant Web et renvoie le jeton Google", async () => {
    login.mockResolvedValue({ provider: "google", result: { idToken: "jeton-google" } });
    await expect(nativeGoogleIdToken("web-client")).resolves.toBe("jeton-google");
    expect(initialize).toHaveBeenCalledWith({ google: { webClientId: "web-client", mode: "online" } });
    expect(login).toHaveBeenCalledWith({ provider: "google", options: { scopes: ["email", "profile"] } });
  });

  it("refuse une réponse sans jeton", async () => {
    login.mockResolvedValue({ provider: "google", result: {} });
    await expect(nativeGoogleIdToken("web-client")).rejects.toThrow("Jeton Google manquant");
  });

  it("signale l'annulation par l'utilisateur sans la traiter comme une erreur", async () => {
    login.mockRejectedValue(new Error("User cancelled the sign-in flow"));
    await expect(nativeGoogleIdToken("web-client")).rejects.toThrow(NATIVE_GOOGLE_CANCELLED);
  });

  it("remonte les autres erreurs telles quelles", async () => {
    login.mockRejectedValue(new Error("[28444] Developer console is not set up correctly"));
    await expect(nativeGoogleIdToken("web-client")).rejects.toThrow("Developer console");
  });
});
