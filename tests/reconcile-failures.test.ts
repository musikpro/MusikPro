import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getServiceDb: () => ({}) }));
vi.mock("@/lib/security/audit", () => ({ writeAuditLogs: async () => {} }));

import { selectNewFailures } from "@/lib/billing/reconcile-failures";

describe("selectNewFailures", () => {
  const failures = [
    { paymentId: "a", error: "x" },
    { paymentId: "b", error: "x" },
    { paymentId: "a", error: "x" },
  ];

  it("garde tout quand rien n'a été journalisé, sans doublon", () => {
    expect(selectNewFailures(failures, new Set()).map((f) => f.paymentId)).toEqual(["a", "b"]);
  });

  it("ignore les paiements déjà journalisés récemment", () => {
    expect(selectNewFailures(failures, new Set(["a"])).map((f) => f.paymentId)).toEqual(["b"]);
  });

  it("renvoie une liste vide quand tout est déjà journalisé", () => {
    expect(selectNewFailures(failures, new Set(["a", "b"]))).toEqual([]);
  });
});
