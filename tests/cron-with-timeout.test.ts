import { describe, expect, it, vi } from "vitest";
import { CronTimeoutError, withTimeout } from "@/lib/cron/with-timeout";

describe("withTimeout", () => {
  it("renvoie le résultat d'une opération qui répond à temps", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000, "test")).resolves.toBe("ok");
  });

  it("propage l'erreur d'une opération qui échoue avant le délai", async () => {
    await expect(withTimeout(Promise.reject(new Error("boom")), 1000, "test")).rejects.toThrow("boom");
  });

  it("rend la main avec une CronTimeoutError si l'opération ne répond jamais", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise<never>(() => {}), 15_000, "Réconciliation");
    const assertion = expect(pending).rejects.toBeInstanceOf(CronTimeoutError);
    await vi.advanceTimersByTimeAsync(15_000);
    await assertion;
    vi.useRealTimers();
  });
});
