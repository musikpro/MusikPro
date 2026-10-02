import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeSchedulerStats, type SchedulerRun } from "@/lib/cron/github-actions";

const run = (overrides: Partial<SchedulerRun>): SchedulerRun => ({
  status: "completed",
  conclusion: "success",
  event: "schedule",
  run_started_at: "2026-10-02T00:00:00Z",
  created_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:09Z",
  html_url: "https://github.com/musikpro/MusikPro/actions/runs/1",
  ...overrides,
});

describe("computeSchedulerStats", () => {
  it("averages durations and extrapolates the minutes over the 24 h total", () => {
    const sample = [run({}), run({ updated_at: "2026-10-02T00:00:11Z" })];
    const stats = computeSchedulerStats(sample, 288, 4);
    expect(stats.averageSeconds).toBe(10);
    expect(stats.estimatedMinutes24h).toBe(48);
    expect(stats.runs24h).toBe(288);
    expect(stats.failures24h).toBe(4);
    expect(stats.last?.seconds).toBe(9);
  });

  it("ignores runs that are still in progress and handles an empty window", () => {
    const pending = run({ status: "in_progress", conclusion: null });
    expect(computeSchedulerStats([pending], 1, 0).averageSeconds).toBeNull();
    expect(computeSchedulerStats([pending], 1, 0).estimatedMinutes24h).toBe(0);
    const empty = computeSchedulerStats([], 0, 0);
    expect(empty.last).toBeNull();
    expect(empty.averageSeconds).toBeNull();
  });
});
