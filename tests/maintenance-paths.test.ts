import { describe, expect, it } from "vitest";
import { isApiPath, isMaintenanceExempt } from "@/lib/maintenance/paths";

describe("isMaintenanceExempt", () => {
  it("laisse toujours passer l'administration, la connexion et l'authentification", () => {
    for (const path of [
      "/admin",
      "/admin/audit",
      "/admin/maintenance",
      "/api/admin/audit/export",
      "/api/auth/sign-in/email",
      "/login",
      "/two-factor",
      "/forgot-password",
      "/reset-password",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(true);
    }
  });

  it("laisse passer les webhooks, le cron, la santé et les ressources publiques nécessaires", () => {
    for (const path of [
      "/api/webhooks/chariow",
      "/api/webhooks/musicgpt/abc123",
      "/api/cron/reconcile-payments",
      "/api/health",
      "/api/readyz",
      "/api/i18n/overlay",
      "/maintenance",
      "/robots.txt",
      "/sitemap.xml",
      "/manifest.webmanifest",
      "/opengraph-image",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(true);
    }
  });

  it("bloque les pages et API clientes", () => {
    for (const path of [
      "/",
      "/dashboard",
      "/dashboard/songs",
      "/demo",
      "/g/mon-lien",
      "/register",
      "/terms",
      "/api/music/generate",
      "/api/payments/checkout",
      "/api/songs",
      "/api/creation-draft",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(false);
    }
  });

  it("ne confond pas un segment voisin avec un chemin exempté", () => {
    for (const path of [
      "/adminx",
      "/admin-panel",
      "/api/authx",
      "/api/administrator",
      "/loginx",
      "/api/healthz",
      "/api/webhooksx",
    ]) {
      expect(isMaintenanceExempt(path), path).toBe(false);
    }
  });

  it("ignore le slash final", () => {
    expect(isMaintenanceExempt("/admin/")).toBe(true);
    expect(isMaintenanceExempt("/dashboard/")).toBe(false);
  });
});

describe("isApiPath", () => {
  it("reconnaît les routes API", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/songs")).toBe(true);
    expect(isApiPath("/apiary")).toBe(false);
    expect(isApiPath("/dashboard")).toBe(false);
  });
});
