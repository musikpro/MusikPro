export class ApiClientError extends Error {
  constructor(public status: number, message: string, public code = "") {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiFetchOptions = RequestInit & { retries?: number; timeoutMs?: number };

export async function apiFetch<T = unknown>(input: RequestInfo | URL, options: ApiFetchOptions = {}): Promise<T> {
  const { retries: retryOption, timeoutMs: timeoutOption, ...fetchOptions } = options;
  const method = String(fetchOptions.method ?? "GET").toUpperCase();
  const idempotent = method === "GET" || method === "HEAD";
  const retries = idempotent ? Math.max(0, Math.min(retryOption ?? 1, 2)) : 0;
  const timeoutMs = Math.max(1_000, Math.min(timeoutOption ?? 30_000, 120_000));

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(input, {
        ...fetchOptions,
        credentials: fetchOptions.credentials ?? "include",
        signal: fetchOptions.signal ?? controller.signal,
      });
      if (!response.ok) {
        let code = "";
        let message = response.status >= 500 ? "Service temporairement indisponible" : `HTTP ${response.status}`;
        try {
          const json = await response.json() as { error?: string; code?: string };
          if (typeof json.code === "string") code = json.code;
          if (typeof json.error === "string") message = json.error;
        } catch {}
        throw new ApiClientError(response.status, message, code);
      }
      if (response.status === 204 || method === "HEAD") return undefined as T;
      return await response.json() as T;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiClientError || attempt >= retries) throw error;
      // Never retry POST/PUT/PATCH/DELETE: a lost response may hide a successful mutation.
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
