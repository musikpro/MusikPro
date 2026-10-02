import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeSchedulerStats, getSchedulerStatus, toRun, type EasyCronLog } from "@/lib/cron/easycron";

const log = (overrides: Partial<EasyCronLog> = {}): EasyCronLog => ({
  scheduled_time: "2026-10-02 02:35:00",
  fired_time: "2026-10-02 02:35:02",
  done_time: "2026-10-02 02:35:03",
  http_code: 200,
  error: "",
  total_time: 0.5,
  ...overrides,
});

describe("toRun", () => {
  it("reads EasyCron dates as UTC and treats a 2xx without error as a success", () => {
    const run = toRun(log());
    expect(run?.at).toBe(Date.UTC(2026, 9, 2, 2, 35, 2));
    expect(run?.ok).toBe(true);
    expect(run?.seconds).toBe(0.5);
  });

  it("flags a non-2xx response or an error message as a failure", () => {
    expect(toRun(log({ http_code: 401 }))?.ok).toBe(false);
    expect(toRun(log({ error: "timeout" }))?.ok).toBe(false);
  });

  it("ignores runs that have not happened yet", () => {
    expect(toRun(log({ fired_time: null, scheduled_time: null }))).toBeNull();
    expect(toRun(log({ http_code: null }))).toBeNull();
  });
});

describe("computeSchedulerStats", () => {
  it("sorts newest first and counts failures independently of the order received", () => {
    const stats = computeSchedulerStats([
      log({ fired_time: "2026-10-02 01:00:00", http_code: 401 }),
      log({ fired_time: "2026-10-02 03:00:00", total_time: 1.5 }),
      log({ fired_time: "2026-10-02 02:00:00", total_time: 0.5 }),
    ]);
    expect(stats.runsSampled).toBe(3);
    expect(stats.failuresSampled).toBe(1);
    expect(stats.last?.at).toBe(Date.UTC(2026, 9, 2, 3, 0, 0));
    expect(stats.last?.ok).toBe(true);
    expect(stats.coveredHours).toBe(2);
  });

  it("handles an empty history", () => {
    const stats = computeSchedulerStats([]);
    expect(stats.last).toBeNull();
    expect(stats.averageSeconds).toBeNull();
    expect(stats.runsSampled).toBe(0);
  });
});

describe("getSchedulerStatus", () => {
  it("explains what is missing instead of throwing when the variables are not set", async () => {
    vi.stubEnv("EASYCRON_API_KEY", "");
    vi.stubEnv("EASYCRON_CRON_JOB_ID", "");
    const status = await getSchedulerStatus();
    expect(status.ok).toBe(false);
    if (!status.ok) {
      expect(status.configured).toBe(false);
      expect(status.reason).toContain("EASYCRON_API_KEY");
    }
    vi.unstubAllEnvs();
  });

  it("rejects a job id that is not a number without calling the API", async () => {
    vi.stubEnv("EASYCRON_API_KEY", "test-key");
    vi.stubEnv("EASYCRON_CRON_JOB_ID", "../other");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const status = await getSchedulerStatus();
    expect(status.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
