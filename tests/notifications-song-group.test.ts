import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const limit = vi.fn();
vi.mock("@/db", () => ({
  getServiceDb: () => ({ select: () => ({ from: () => ({ where: () => ({ limit }) }) }) }),
}));
vi.mock("@/db/schema", () => ({
  musicGenerationJobs: { id: "id", songGroupId: "g", status: "s" },
}));

import { hasPendingSiblingVersion } from "@/lib/notifications/song-group";

describe("hasPendingSiblingVersion", () => {
  it("n'attend rien sans groupe", async () => {
    expect(await hasPendingSiblingVersion({ id: "a", songGroupId: null })).toBe(false);
  });
  it("attend tant qu'une autre version est en cours", async () => {
    limit.mockResolvedValueOnce([{ id: "b" }]);
    expect(await hasPendingSiblingVersion({ id: "a", songGroupId: "g" })).toBe(true);
  });
  it("notifie quand l'autre version est terminée ou échouée", async () => {
    limit.mockResolvedValueOnce([]);
    expect(await hasPendingSiblingVersion({ id: "a", songGroupId: "g" })).toBe(false);
  });
  it("ne bloque jamais la notification si la lecture échoue", async () => {
    limit.mockRejectedValueOnce(new Error("db"));
    expect(await hasPendingSiblingVersion({ id: "a", songGroupId: "g" })).toBe(false);
  });
});
