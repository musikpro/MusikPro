import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const state = vi.hoisted(() => ({ active: true }));
vi.mock("@/lib/maintenance/flag", () => ({ isMaintenanceActive: async () => state.active }));

const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`https://musikpro.net${path}`, init);

describe("proxy en mode maintenance", () => {
  it("réécrit les pages clientes vers /maintenance en 503, sans indexation", async () => {
    state.active = true;
    for (const path of ["/", "/dashboard/songs", "/demo", "/g/mon-lien", "/terms", "/fr/dashboard"]) {
      const response = await proxy(request(path));
      expect(response.status, path).toBe(503);
      expect(response.headers.get("x-middleware-rewrite"), path).toBe("https://musikpro.net/maintenance");
      expect(response.headers.get("retry-after")).toBe("300");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
      expect(response.headers.get("content-security-policy")).toContain("script-src");
    }
  });

  it("répond en JSON 503 aux API clientes", async () => {
    state.active = true;
    for (const path of ["/api/music/generate", "/api/payments/checkout", "/api/songs"]) {
      const response = await proxy(request(path, { method: "POST" }));
      expect(response.status, path).toBe(503);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect((await response.json()).error).toMatch(/maintenance/i);
    }
  });

  it("ne bloque jamais l'administration, la connexion, les webhooks, le cron ni la santé", async () => {
    state.active = true;
    for (const path of [
      "/admin",
      "/admin/maintenance",
      "/api/admin/audit/export",
      "/login",
      "/two-factor",
      "/api/auth/sign-in/email",
      "/api/webhooks/chariow",
      "/api/cron/reconcile-payments",
      "/api/health",
      "/api/readyz",
      "/maintenance",
    ]) {
      const response = await proxy(request(path));
      expect(response.status, path).not.toBe(503);
      expect(response.headers.get("x-middleware-rewrite"), path).not.toBe("https://musikpro.net/maintenance");
    }
  });

  it("garde le routage habituel quand la maintenance est désactivée", async () => {
    state.active = false;
    const home = await proxy(request("/"));
    expect(home.status).toBe(200);
    const dashboard = await proxy(request("/dashboard"));
    expect(dashboard.headers.get("location")).toBe("https://musikpro.net/login");
    const api = await proxy(request("/api/songs"));
    expect(api.status).toBe(200);
  });
});
