import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  configured: true,
  songReady: true,
  devices: [] as { id: string; token: string; locale: string }[],
}));
const sendPush = vi.hoisted(() => vi.fn());
const deleteTokens = vi.hoisted(() => vi.fn());

vi.mock("@/lib/notifications/fcm", () => ({ isPushConfigured: () => state.configured, sendPush }));
vi.mock("@/lib/notifications/devices", () => ({
  getNotificationPreferences: async () => ({ songReady: state.songReady }),
  listPushDevices: async () => state.devices,
  deletePushDevicesByToken: deleteTokens,
}));
vi.mock("@/lib/i18n/overlay-server", () => ({ primeOverlay: async () => undefined }));

import { pushSongReady } from "@/lib/notifications/push-user";

describe("pushSongReady", () => {
  beforeEach(() => {
    state.configured = true;
    state.songReady = true;
    state.devices = [
      { id: "1", token: "t-fr", locale: "fr" },
      { id: "2", token: "t-en", locale: "en" },
    ];
    sendPush.mockReset().mockResolvedValue({ sent: 1, invalidTokens: [] });
    deleteTokens.mockReset();
  });

  it("envoie un message par langue avec le titre de la chanson", async () => {
    await pushSongReady("u1", "Ma chanson", "/dashboard/songs");
    expect(sendPush).toHaveBeenCalledTimes(2);
    const fr = sendPush.mock.calls.find(([tokens]) => tokens[0] === "t-fr")!;
    expect(fr[1]).toMatchObject({
      title: "Chanson prête",
      body: "Ta chanson « Ma chanson » est prête à écouter !",
      href: "/dashboard/songs",
    });
  });

  it("ne fait rien sans configuration Firebase ni quand la préférence est coupée", async () => {
    state.configured = false;
    await pushSongReady("u1", "x", "/dashboard/songs");
    state.configured = true;
    state.songReady = false;
    await pushSongReady("u1", "x", "/dashboard/songs");
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("supprime les jetons que Firebase déclare morts", async () => {
    sendPush.mockResolvedValue({ sent: 0, invalidTokens: ["t-fr"] });
    await pushSongReady("u1", null, "/dashboard/songs");
    expect(deleteTokens).toHaveBeenCalledWith(["t-fr", "t-fr"]);
  });

  it("ne lève jamais si l'envoi échoue", async () => {
    sendPush.mockRejectedValue(new Error("boom"));
    await expect(pushSongReady("u1", "x", "/dashboard/songs")).resolves.toBeUndefined();
  });
});
