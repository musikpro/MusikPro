import { beforeEach, describe, expect, it, vi } from "vitest";

const state = { balance: 0, bypass: false };

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => "query" }) }) }) },
  userQuery: async () => [{ balance: state.balance }],
}));
vi.mock("@/db/schema", () => ({ credits: { balance: "balance", userId: "userId" } }));
vi.mock("drizzle-orm", () => ({ eq: () => ({}) }));
vi.mock("@/lib/settings/payment-bypass", () => ({ isPaymentBypassEnabled: async () => state.bypass }));

import { hasCreditsForLyrics } from "@/lib/credits/lyrics-gate";
import { CREDITS_PER_GENERATION } from "@/lib/credit-plans/catalog";

describe("hasCreditsForLyrics", () => {
  beforeEach(() => {
    state.balance = 0;
    state.bypass = false;
  });

  it("refuse un solde inférieur au coût d'une chanson", async () => {
    state.balance = CREDITS_PER_GENERATION - 1;
    expect(await hasCreditsForLyrics("u1", "user")).toBe(false);
  });

  it("accepte un solde égal ou supérieur au coût d'une chanson", async () => {
    state.balance = CREDITS_PER_GENERATION;
    expect(await hasCreditsForLyrics("u1", "user")).toBe(true);
  });

  it("laisse passer le propriétaire quand le contournement de paiement est actif", async () => {
    state.bypass = true;
    expect(await hasCreditsForLyrics("owner", "admin")).toBe(true);
  });

  it("n'applique pas le contournement à un client", async () => {
    state.bypass = true;
    expect(await hasCreditsForLyrics("u1", "user")).toBe(false);
  });
});
