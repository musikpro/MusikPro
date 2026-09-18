import { afterEach, describe, expect, it } from "vitest";
import { verifyCronRequest } from "@/lib/cron/auth";

const oldNodeEnv = process.env.NODE_ENV;
const oldSecret = process.env.CRON_SECRET;
afterEach(() => {
  process.env.NODE_ENV = oldNodeEnv;
  if (oldSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = oldSecret;
});

describe("verifyCronRequest", () => {
  it("accepts the configured bearer secret", () => {
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "a-very-long-random-cron-secret";
    const req = new Request("https://example.test/api/cron/x", { headers: { authorization: "Bearer a-very-long-random-cron-secret" } });
    expect(verifyCronRequest(req)).toBe(true);
  });

  it("fails closed in production when no secret is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRON_SECRET;
    expect(verifyCronRequest(new Request("https://example.test/api/cron/x"))).toBe(false);
  });
});
