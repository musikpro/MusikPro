import { describe, expect, it, vi } from "vitest";
import { createLogger } from "@/lib/observability/logger";

describe("structured logger", () => {
  it("redacts nested secret-like keys in production logs", () => {
    vi.stubEnv("NODE_ENV", "production");
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    createLogger("test").info("hello", {
      user: { email: "user@example.com" },
      token: "abc",
      safe: "ok",
    });
    const line = String(spy.mock.calls[0]?.[0] ?? "");
    expect(line).toContain("[REDACTED]");
    expect(line).not.toContain("user@example.com");
    expect(line).not.toContain("abc");
    spy.mockRestore();
    vi.unstubAllEnvs();
  });
});
