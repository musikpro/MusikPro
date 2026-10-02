import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));

import { pickDashboardLocale } from "@/lib/i18n/dashboard-locale";

describe("pickDashboardLocale", () => {
  it("prefers the URL language over Accept-Language", () => {
    expect(pickDashboardLocale("en", "fr-FR,fr;q=0.9")).toBe("en");
  });
  it("falls back to Accept-Language without URL prefix", () => {
    expect(pickDashboardLocale(null, "es-ES,es;q=0.9")).toBe("es");
  });
  it("ignores unsupported URL codes", () => {
    expect(pickDashboardLocale("de", "pt-BR")).toBe("pt");
  });
});
