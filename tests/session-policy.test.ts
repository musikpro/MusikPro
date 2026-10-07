import { describe, expect, it } from "vitest";
import {
  CLIENT_SESSION_SECONDS,
  MAX_COOKIE_SECONDS,
  OWNER_SESSION_SECONDS,
  clampOwnerExpiry,
  ownerSessionExpiry,
} from "@/lib/auth/session-policy";

describe("session policy", () => {
  const start = new Date("2026-10-07T08:00:00Z");

  it("limits an owner session to 24 hours from login", () => {
    expect(OWNER_SESSION_SECONDS).toBe(86_400);
    expect(ownerSessionExpiry(start).toISOString()).toBe("2026-10-08T08:00:00.000Z");
  });

  it("never lets a renewal extend an owner session past 24 hours", () => {
    const renewed = new Date(start.getTime() + CLIENT_SESSION_SECONDS * 1000);
    expect(clampOwnerExpiry({ createdAt: start, expiresAt: renewed }).toISOString()).toBe("2026-10-08T08:00:00.000Z");
  });

  it("keeps an earlier expiry untouched", () => {
    const early = new Date("2026-10-07T09:00:00Z");
    expect(clampOwnerExpiry({ createdAt: start, expiresAt: early })).toEqual(early);
  });

  it("keeps client sessions long but within what a cookie allows (Max-Age <= 400 days)", () => {
    expect(CLIENT_SESSION_SECONDS).toBeGreaterThan(60 * 60 * 24 * 300);
    expect(CLIENT_SESSION_SECONDS).toBeLessThanOrEqual(MAX_COOKIE_SECONDS);
    expect(OWNER_SESSION_SECONDS).toBeLessThanOrEqual(MAX_COOKIE_SECONDS);
  });
});
