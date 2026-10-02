import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeSchedulerStats, type GithubRun } from "@/lib/ops/github-scheduler";

const run = (id: number, createdAt: string, conclusion: string | null, seconds = 8, event = "schedule"): GithubRun => ({
  id,
  event,
  status: conclusion ? "completed" : "in_progress",
  conclusion,
  created_at: createdAt,
  run_started_at: createdAt,
  updated_at: new Date(Date.parse(createdAt) + seconds * 1000).toISOString(),
  html_url: `https://github.com/x/y/actions/runs/${id}`,
});

describe("computeSchedulerStats", () => {
  it("computes success rate, real interval, duration and billed minutes", () => {
    const stats = computeSchedulerStats(
      [
        run(3, "2026-10-02T00:30:00Z", "success"),
        run(2, "2026-10-02T00:10:00Z", "failure", 70),
        run(1, "2026-10-02T00:00:00Z", "success"),
      ],
      90,
    );
    expect(stats.successRatePercent).toBe(67);
    expect(stats.averageIntervalMinutes).toBe(15);
    expect(stats.averageRunSeconds).toBe(29);
    // billed per run: 1 + 2 + 1 minutes -> 4/3 average -> 90 runs ~ 120 min
    expect(stats.estimatedMinutes30Days).toBe(120);
    expect(stats.delayed).toBe(false);
    expect(stats.lastRun?.conclusion).toBe("success");
  });

  it("flags GitHub delays when the real interval exceeds the alert threshold", () => {
    const stats = computeSchedulerStats(
      [run(2, "2026-10-02T01:00:00Z", "success"), run(1, "2026-10-02T00:00:00Z", "success")],
      10,
    );
    expect(stats.averageIntervalMinutes).toBe(60);
    expect(stats.delayed).toBe(true);
  });

  it("ignores manual runs for the interval and handles an empty list", () => {
    const manual = computeSchedulerStats([run(1, "2026-10-02T00:00:00Z", "success", 8, "workflow_dispatch")], 1);
    expect(manual.averageIntervalMinutes).toBeNull();
    const empty = computeSchedulerStats([], 0);
    expect(empty.lastRun).toBeNull();
    expect(empty.successRatePercent).toBeNull();
    expect(empty.estimatedMinutes30Days).toBe(0);
  });
});
