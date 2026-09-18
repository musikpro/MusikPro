type CacheJson = null | boolean | number | string | CacheJson[] | { [key: string]: CacheJson };

function credentials() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function isUpstashConfigured(): boolean {
  return Boolean(credentials());
}

async function command(args: Array<string | number>): Promise<unknown> {
  const c = credentials();
  if (!c) throw new Error("UPSTASH_NOT_CONFIGURED");
  const response = await fetch(c.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) throw new Error(`UPSTASH_HTTP_${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error("UPSTASH_COMMAND_FAILED");
  return body.result;
}

export async function cacheGet<T extends CacheJson>(key: string): Promise<T | null> {
  if (!isUpstashConfigured()) return null;
  try {
    const result = await command(["GET", key]);
    if (typeof result !== "string") return null;
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: CacheJson, ttlSeconds = 300): Promise<boolean> {
  if (!isUpstashConfigured()) return false;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) throw new Error("CACHE_TTL_INVALID");
  try {
    await command(["SET", key, JSON.stringify(value), "EX", ttlSeconds]);
    return true;
  } catch {
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  if (!isUpstashConfigured()) return false;
  try {
    await command(["DEL", key]);
    return true;
  } catch {
    return false;
  }
}

export async function withCache<T extends CacheJson>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await loader();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
