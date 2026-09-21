import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { dashboardHref, normalizeDashboardPath } from "@/lib/demo/routing";
import { proxy } from "@/proxy";
import { getWorkspaceDefaults } from "@/lib/demo/workspace-defaults";

describe("demo routing", () => {
  it("keeps demo navigation inside the public demo namespace", () => {
    expect(dashboardHref("/dashboard/songs", true)).toBe("/demo/songs");
    expect(dashboardHref("/dashboard", true)).toBe("/demo");
  });

  it("keeps authenticated dashboard links unchanged", () => {
    expect(dashboardHref("/dashboard/songs", false)).toBe("/dashboard/songs");
  });

  it("normalizes demo URLs for active navigation state", () => {
    expect(normalizeDashboardPath("/demo/profile")).toBe("/dashboard/profile");
    expect(normalizeDashboardPath("/demo")).toBe("/dashboard");
  });

  it("rewrites the public demo to dashboard rendering without a session", () => {
    const response = proxy(new NextRequest("https://musikpro.net/demo/songs"));
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://musikpro.net/dashboard/songs",
    );
  });

  it("keeps the real dashboard protected", () => {
    const response = proxy(new NextRequest("https://musikpro.net/dashboard"));
    expect(response.headers.get("location")).toBe("https://musikpro.net/login");
  });

  it("rejects a forged demo header on the real dashboard", () => {
    const response = proxy(
      new NextRequest("https://musikpro.net/dashboard", {
        headers: { "x-musikpro-demo-route": "1" },
      }),
    );
    expect(response.headers.get("location")).toBe("https://musikpro.net/login");
  });

  it("starts a real account with an empty personal workspace", () => {
    expect(getWorkspaceDefaults(false, 7)).toEqual({
      balance: 7,
      songs: [],
      favorites: [],
      versionFavorites: [],
    });
  });

  it("keeps fixture content exclusive to demo mode", () => {
    const defaults = getWorkspaceDefaults(true);
    expect(defaults.balance).toBe(5);
    expect(defaults.songs.length).toBeGreaterThan(0);
  });
});
