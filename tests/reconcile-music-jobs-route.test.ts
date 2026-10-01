import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getServiceDb: vi.fn() }));
vi.mock("@/lib/ai/audio-providers/dispatch", () => ({ pollJobForProvider: vi.fn() }));

describe("GET /api/cron/reconcile-music-jobs", () => {
  it("rejects requests without the cron secret in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CRON_SECRET", "a-very-long-random-cron-secret");
    const { GET } = await import("@/app/api/cron/reconcile-music-jobs/route");
    const response = await GET(new Request("https://example.test/api/cron/reconcile-music-jobs"));
    expect(response.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
