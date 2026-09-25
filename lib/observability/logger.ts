export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEY =
  /(password|secret|token|authorization|cookie|email|phone|api[_-]?key|client[_-]?secret|webhook|database[_-]?url|access[_-]?key)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[TRUNCATED]";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(nested, depth + 1);
  }
  return out;
}

function serialize(payload: Record<string, unknown>) {
  try {
    return JSON.stringify(payload);
  } catch {
    return JSON.stringify({ level: payload.level, message: payload.message, serializationError: true });
  }
}

export function createLogger(scope: string) {
  function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
    if (level === "debug" && process.env.NODE_ENV === "production") return;
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      scope,
      message,
      ...(context ? { context: redact(context) } : {}),
    };
    const line =
      process.env.NODE_ENV === "production"
        ? serialize(payload)
        : `[${level.toUpperCase()}] [${scope}] ${message}${context ? ` ${serialize(redact(context) as Record<string, unknown>)}` : ""}`;
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  }
  return {
    debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
    info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
    warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
    error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
  };
}
