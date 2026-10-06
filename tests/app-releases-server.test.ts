import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  latestBuild: null as number | null,
  inserted: null as Record<string, unknown> | null,
  blob: null as Buffer | null,
  inspect: { ok: true } as { ok: true } | { ok: false; reason: string },
}));
const del = vi.hoisted(() => vi.fn());

vi.mock("@vercel/blob", () => ({
  del,
  get: async () =>
    state.blob
      ? {
          statusCode: 200,
          blob: { size: state.blob.length },
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(state.blob!));
              controller.close();
            },
          }),
        }
      : null,
}));
vi.mock("@/lib/app-releases/apk", () => ({ inspectApk: () => state.inspect }));
vi.mock("@/db", () => ({
  getServiceDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: async () => (state.latestBuild === null ? [] : [{ build: state.latestBuild }]) }),
        }),
      }),
    }),
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        state.inserted = values;
        return {
          returning: async () => [
            {
              ...values,
              downloads: 0,
              published: false,
              createdAt: new Date(),
              publishedAt: null,
              notes: values.notes ?? null,
            },
          ],
        };
      },
    }),
  }),
}));

import { AppReleaseError, registerAppRelease } from "@/lib/app-releases/server";

const input = { pathname: "app-releases/android/android-x.apk", version: "1.2", build: 5, notes: null };

describe("registerAppRelease", () => {
  beforeEach(() => {
    state.latestBuild = null;
    state.inserted = null;
    state.blob = Buffer.from("contenu de l'apk");
    state.inspect = { ok: true };
    del.mockReset().mockResolvedValue(undefined);
  });

  it("calcule l'empreinte SHA-256 côté serveur et crée la version non publiée", async () => {
    const release = await registerAppRelease(input, "admin-1");
    expect(state.inserted).toMatchObject({
      platform: "android",
      version: "1.2",
      build: 5,
      fileName: "MusikPro-1.2.apk",
      sizeBytes: state.blob!.length,
      sha256: createHash("sha256").update(state.blob!).digest("hex"),
      blobPathname: input.pathname,
      createdBy: "admin-1",
    });
    expect(release.published).toBe(false);
    expect(del).not.toHaveBeenCalled();
  });

  it("refuse un fichier qui n'est pas un APK de MusikPro et le supprime du stockage", async () => {
    state.inspect = { ok: false, reason: "Ce fichier n'est pas une archive d'application Android (APK)." };
    await expect(registerAppRelease(input, "admin-1")).rejects.toThrow("pas une archive");
    expect(state.inserted).toBeNull();
    expect(del).toHaveBeenCalledWith(input.pathname);
  });

  it("exige un build supérieur au dernier envoi", async () => {
    state.latestBuild = 5;
    await expect(registerAppRelease(input, "admin-1")).rejects.toBeInstanceOf(AppReleaseError);
    expect(state.inserted).toBeNull();
    expect(del).toHaveBeenCalledWith(input.pathname);
  });

  it("refuse un fichier introuvable dans le stockage", async () => {
    state.blob = null;
    await expect(registerAppRelease(input, "admin-1")).rejects.toThrow("introuvable");
  });

  it("refuse un chemin hors du dossier réservé sans toucher au stockage", async () => {
    await expect(registerAppRelease({ ...input, pathname: "autre/x.apk" }, "admin-1")).rejects.toThrow("Chemin");
    expect(del).not.toHaveBeenCalled();
  });
});

describe("toFreshStream", () => {
  it("restitue les mêmes octets dans un flux neuf et propage l'annulation", async () => {
    const { toFreshStream } = await import("@/lib/app-releases/server");
    const cancelled = vi.fn();
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.enqueue(new Uint8Array([3]));
        controller.close();
      },
      cancel: cancelled,
    });
    const fresh = toFreshStream(source);
    expect(fresh.locked).toBe(false);
    const chunks: number[] = [];
    const reader = fresh.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(...value);
    }
    expect(chunks).toEqual([1, 2, 3]);

    const second = toFreshStream(new ReadableStream<Uint8Array>({ pull() {}, cancel: cancelled }));
    await second.cancel("fermé par le client");
    expect(cancelled).toHaveBeenCalledWith("fermé par le client");
  });
});
