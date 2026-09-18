import { neon } from "@neondatabase/serverless";

export type DependencyProbe = {
  status: "ok" | "down" | "skipped";
  latencyMs?: number;
};

export type ReadinessReport = {
  status: "ready" | "not_ready";
  checks: {
    database: DependencyProbe;
    redis: DependencyProbe;
  };
  checkedAt: string;
};

async function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("timeout")), { once: true })),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function probeDatabase(): Promise<DependencyProbe> {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return { status: "down" };
  const started = Date.now();
  try {
    const sql = neon(url);
    await withTimeout(sql`select 1 as ok`, 3000);
    return { status: "ok", latencyMs: Date.now() - started };
  } catch {
    return { status: "down", latencyMs: Date.now() - started };
  }
}

async function probeRedis(): Promise<DependencyProbe> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url && !token) return { status: "skipped" };
  if (!url || !token) return { status: "down" };
  const started = Date.now();
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/ping`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error("redis unavailable");
    return { status: "ok", latencyMs: Date.now() - started };
  } catch {
    return { status: "down", latencyMs: Date.now() - started };
  }
}

export async function getReadinessReport(): Promise<ReadinessReport> {
  const [database, redis] = await Promise.all([probeDatabase(), probeRedis()]);
  const ready = database.status === "ok" && redis.status !== "down";
  return {
    status: ready ? "ready" : "not_ready",
    checks: { database, redis },
    checkedAt: new Date().toISOString(),
  };
}
