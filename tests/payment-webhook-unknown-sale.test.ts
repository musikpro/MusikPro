import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ selects: 0, reconcile: vi.fn() }));

vi.mock("@/lib/billing/reconcile", () => ({ reconcilePayment: state.reconcile }));
vi.mock("@/db", () => ({
  getServiceDb: () => ({
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
    select: () => ({
      from: () => ({
        where: () => ({
          // 1st read = the stored webhook event; every later read = payment lookups, none found.
          limit: async () => (state.selects++ === 0 ? [{ id: "evt", processed: false }] : []),
        }),
      }),
    }),
    update: () => ({ set: () => ({ where: async () => undefined }) }),
  }),
}));

describe("processPaymentWebhook — vente inconnue", () => {
  beforeEach(() => {
    state.selects = 0;
    state.reconcile.mockReset();
  });

  it("acquitte une vente inconnue (ping de test Chariow) sans lever d'erreur ni réconcilier", async () => {
    const { processPaymentWebhook } = await import("@/lib/billing/webhook");

    const result = await processPaymentWebhook({ id: "chariow" } as never, {
      id: "chariow:delivery-1",
      type: "successful.sale",
      payload: { transaction: { id: "sale_unknown" } },
    });

    expect(result).toMatchObject({ duplicate: false, ignored: true, reason: "payment_not_found" });
    expect(state.reconcile).not.toHaveBeenCalled();
  });
});
