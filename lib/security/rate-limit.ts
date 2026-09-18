type LimitResult = { success: boolean; remaining: number; reset: number; backend: "upstash" | "memory" | "unavailable" };

const memory = new Map<string, { count: number; reset: number }>();

export async function rateLimit(key: string, limit: number, windowSeconds = 60): Promise<LimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
      const redisKey = `ratelimit:${key}:${bucket}`;
      const res = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([["INCR", redisKey], ["EXPIRE", redisKey, windowSeconds + 2]]),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json() as Array<{ result?: number }>;
        const count = Number(json?.[0]?.result ?? 1);
        return { success: count <= limit, remaining: Math.max(0, limit - count), reset: (bucket + 1) * windowSeconds, backend: "upstash" };
      }
    } catch {
      // Production fails closed below; development can still use the in-memory fallback.
    }
  }

  if (process.env.NODE_ENV === "production") {
    return { success: false, remaining: 0, reset: Math.floor(Date.now() / 1000) + windowSeconds, backend: "unavailable" };
  }

  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return { success: true, remaining: limit - 1, reset: Math.floor((now + windowSeconds * 1000) / 1000), backend: "memory" };
  }
  current.count += 1;
  return { success: current.count <= limit, remaining: Math.max(0, limit - current.count), reset: Math.floor(current.reset / 1000), backend: "memory" };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip") || forwarded || "unknown";
}
