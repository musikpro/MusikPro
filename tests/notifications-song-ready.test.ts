import { beforeEach, describe, expect, it, vi } from "vitest";

const createNotification = vi.fn();
const pushSongReady = vi.fn();
const getPreferences = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/notifications/devices", () => ({
  getNotificationPreferences: (...args: unknown[]) => getPreferences(...args),
}));
vi.mock("@/lib/notifications/push-user", () => ({ pushSongReady: (...args: unknown[]) => pushSongReady(...args) }));
vi.mock("@/lib/notifications/server", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
}));

import { notifySongReady } from "@/lib/notifications/song-ready";

describe("notifySongReady", () => {
  beforeEach(() => {
    createNotification.mockReset().mockResolvedValue(true);
    pushSongReady.mockReset();
    getPreferences.mockReset().mockResolvedValue({ songReady: true });
  });

  it("crée une notification unique par groupe de chansons", async () => {
    await notifySongReady({ id: "job-1", userId: "u1", songGroupId: "grp-9", title: "Ma chanson" });
    expect(createNotification).toHaveBeenCalledWith({
      userId: "u1",
      type: "song_ready",
      dedupeKey: "song_ready:grp-9",
      href: "/dashboard/songs",
      subject: "Ma chanson",
    });
  });

  it("retombe sur l'identifiant de la génération sans groupe", async () => {
    await notifySongReady({ id: "job-1", userId: "u1", songGroupId: null, title: null });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: "song_ready:job-1" }));
  });

  it("ne fait rien pour une génération sans propriétaire", async () => {
    await notifySongReady({ id: "job-1", userId: null, songGroupId: "g", title: "x" });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("envoie le push seulement quand la notification vient d'être créée", async () => {
    await notifySongReady({ id: "j", userId: "u1", songGroupId: "g", title: "Titre" });
    expect(pushSongReady).toHaveBeenCalledWith("u1", "Titre", "/dashboard/songs");
    pushSongReady.mockReset();
    createNotification.mockResolvedValue(false);
    await notifySongReady({ id: "j", userId: "u1", songGroupId: "g", title: "Titre" });
    expect(pushSongReady).not.toHaveBeenCalled();
  });

  it("ne crée ni cloche ni push quand « Génération terminée » est coupée", async () => {
    getPreferences.mockResolvedValue({ songReady: false });
    await notifySongReady({ id: "j", userId: "u1", songGroupId: "g", title: "Titre" });
    expect(createNotification).not.toHaveBeenCalled();
    expect(pushSongReady).not.toHaveBeenCalled();
  });

  it("laisse passer la notification si la lecture des préférences échoue", async () => {
    getPreferences.mockRejectedValue(new Error("db"));
    await notifySongReady({ id: "j", userId: "u1", songGroupId: "g", title: "Titre" });
    expect(createNotification).toHaveBeenCalled();
  });
});
