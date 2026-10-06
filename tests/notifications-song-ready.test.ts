import { beforeEach, describe, expect, it, vi } from "vitest";

const createNotification = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/lib/notifications/server", () => ({
  createNotification: (...args: unknown[]) => createNotification(...args),
}));

import { notifySongReady } from "@/lib/notifications/song-ready";

describe("notifySongReady", () => {
  beforeEach(() => createNotification.mockReset());

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
});
