import { describe, expect, it } from "vitest";
import { GUEST_RESUME_PATH, isSocialInAppBrowser } from "@/lib/guest/resume";

describe("reprise invité", () => {
  it("reconnaît les navigateurs intégrés des réseaux sociaux", () => {
    expect(isSocialInAppBrowser("Mozilla/5.0 (Linux; Android 14) [FB_IAB/FB4A;FBAV/450.0]")).toBe(true);
    expect(isSocialInAppBrowser("Mozilla/5.0 (iPhone) AppleWebKit Instagram 320.0")).toBe(true);
    expect(isSocialInAppBrowser("Mozilla/5.0 (Linux; Android 14) musical_ly_2023 BytedanceWebview")).toBe(true);
  });

  it("laisse passer les vrais navigateurs", () => {
    expect(isSocialInAppBrowser("Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36")).toBe(false);
    expect(isSocialInAppBrowser("Mozilla/5.0 (iPhone) Version/17.0 Mobile Safari/604.1")).toBe(false);
  });

  it("ramène toujours vers une destination fixe interne", () => {
    expect(GUEST_RESUME_PATH).toBe("/dashboard/create");
  });
});
