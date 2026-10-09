import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { audioProviderConfigs, replicateModelVersions, user } from "@/db/schema";

vi.mock("server-only", () => ({}));

const state = vi.hoisted(() => ({
  model: "",
  latestId: "",
  failMetadata: false,
  specs: {} as Record<string, unknown>,
  probeStatus: "succeeded",
  probeBytes: new Uint8Array(),
}));
vi.mock("@/lib/ai/musicful", () => ({
  getAudioProviderConfig: async () => {
    // Same source as production: the stored `default_model` of the replicate row.
    const { getServiceDb } = await import("@/db");
    const { eq } = await import("drizzle-orm");
    const { audioProviderConfigs } = await import("@/db/schema");
    const [row] = await getServiceDb()
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, "replicate"))
      .limit(1);
    state.model = row?.defaultModel ?? state.model;
    return {
      providerId: "replicate",
      config: { id: "x" },
      apiKey: "r8_test",
      enabled: true,
      baseUrl: "https://api.replicate.com",
      model: state.model,
      timeoutMs: 5000,
      maxRetries: 0,
    };
  },
}));

const BASE = "https://api.replicate.com/v1/models/fishaudio/ace-step-1.5";
const CANDIDATE = "e".repeat(64);
const INCOMPATIBLE = "d".repeat(64);
const spec = (extra: Record<string, unknown> = {}, drop: string[] = []) => {
  const properties: Record<string, unknown> = {
    prompt: { type: "string", maxLength: 512 },
    lyrics: { type: "string", maxLength: 4096 },
    duration: { type: "number", minimum: -1, maximum: 600 },
    time_signature: { type: "string" },
    inference_steps: { type: "integer", minimum: 1, maximum: 200 },
    guidance_scale: { type: "number", minimum: 1, maximum: 15 },
    shift: { type: "number", minimum: 1, maximum: 5 },
    seed: { type: "integer" },
    thinking: { type: "boolean" },
    batch_size: { type: "integer", minimum: 1, maximum: 4 },
    audio_format: { type: "string", enum: ["mp3", "wav"] },
    ...extra,
  };
  drop.forEach((key) => delete properties[key]);
  return {
    components: {
      schemas: {
        Input: { type: "object", properties },
        Output: { type: "array", items: { type: "string", format: "uri" } },
      },
    },
  };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe.runIf(process.env.RUN_DB_INTEGRATION_TESTS === "1")("Replicate version manager (live integration)", () => {
  let actorId = "";
  let original: { defaultModel: string } | null = null;
  let createdRow = false;
  let activeDefault = "";

  beforeAll(async () => {
    const { getServiceDb } = await import("@/db");
    const { REPLICATE_DEFAULT_VERSION } = await import("@/lib/ai/audio-providers/replicate-model");
    activeDefault = REPLICATE_DEFAULT_VERSION;
    const database = getServiceDb();
    const [admin] = await database.select({ id: user.id }).from(user).limit(1);
    actorId = admin.id;
    const [row] = await database
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, "replicate"))
      .limit(1);
    if (row) original = { defaultModel: row.defaultModel };
    else {
      createdRow = true;
      await database
        .insert(audioProviderConfigs)
        .values({ id: "test-replicate-versions", provider: "replicate", defaultModel: activeDefault });
    }
    await database
      .update(audioProviderConfigs)
      .set({ defaultModel: activeDefault })
      .where(eq(audioProviderConfigs.provider, "replicate"));
    state.model = activeDefault;
    state.latestId = CANDIDATE;
    state.specs = {
      [activeDefault]: spec(),
      [CANDIDATE]: spec({ style: { type: "string" } }),
      [INCOMPATIBLE]: spec({}, ["audio_format"]),
    };
    state.probeBytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, ...new Array(3000).fill(0x11)]);
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      // Only Replicate is simulated; the Neon HTTP driver keeps using the real network.
      if (!/^https:\/\/(api\.replicate\.com|replicate\.delivery)\//.test(url)) return realFetch(input as never, init);
      const method = init?.method ?? "GET";
      if (url.startsWith("https://replicate.delivery/")) return new Response(state.probeBytes);
      if (state.failMetadata) return json({ detail: "boom" }, 500);
      if (url === BASE)
        return json({
          latest_version: {
            id: state.latestId,
            created_at: "2026-10-10T00:00:00Z",
            openapi_schema: state.specs[state.latestId],
          },
        });
      const versionMatch = url.match(/\/versions\/([a-f0-9]{64})$/);
      if (versionMatch) {
        const openapi = state.specs[versionMatch[1]];
        return openapi
          ? json({ id: versionMatch[1], created_at: "2026-10-01T00:00:00Z", openapi_schema: openapi })
          : json({ detail: "gone" }, 404);
      }
      if (method === "POST" && url.endsWith("/predictions")) return json({ id: "probe123", status: "starting" }, 201);
      if (url.endsWith("/predictions/probe123")) {
        return json({
          id: "probe123",
          status: state.probeStatus,
          version: CANDIDATE,
          output: ["https://replicate.delivery/x/out.mp3"],
        });
      }
      return json({ detail: "unexpected" }, 404);
    });
  });

  afterAll(async () => {
    const { getServiceDb } = await import("@/db");
    const database = getServiceDb();
    vi.unstubAllGlobals();
    await database
      .delete(replicateModelVersions)
      .where(inArray(replicateModelVersions.version, [CANDIDATE, INCOMPATIBLE, activeDefault]));
    if (createdRow)
      await database.delete(audioProviderConfigs).where(eq(audioProviderConfigs.id, "test-replicate-versions"));
    else if (original)
      await database
        .update(audioProviderConfigs)
        .set({ defaultModel: original.defaultModel })
        .where(eq(audioProviderConfigs.provider, "replicate"));
  });

  const active = async () => {
    const { getServiceDb } = await import("@/db");
    const [row] = await getServiceDb()
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, "replicate"))
      .limit(1);
    return row.defaultModel;
  };

  it("vérifier → comparer → tester → approuver → activer → retour arrière, sans jamais activer seul", async () => {
    const versions = await import("@/lib/ai/audio-providers/replicate-versions");

    // Detection (two parallel checks): one row, active version untouched.
    const checks = await Promise.all([versions.checkForUpdates(actorId), versions.checkForUpdates(actorId)]);
    expect(checks.every((result) => result.ok)).toBe(true);
    expect(await active()).toBe(activeDefault);
    const { getServiceDb } = await import("@/db");
    const rows = await getServiceDb()
      .select()
      .from(replicateModelVersions)
      .where(eq(replicateModelVersions.version, CANDIDATE));
    expect(rows).toHaveLength(1);
    expect(rows[0].compatibility).toBe("compatible");
    expect(rows[0].mp3Validated).toBe(true);
    expect((rows[0].diff as { addedFields: string[] }).addedFields).toEqual(["style"]);

    // Free validation only: cannot be approved or activated.
    expect((await versions.validateVersion(CANDIDATE, actorId, { runPaidProbe: false })).ok).toBe(true);
    expect((await versions.approveVersion(CANDIDATE, actorId)).ok).toBe(false);
    expect((await versions.activateVersion(CANDIDATE, activeDefault, actorId)).ok).toBe(false);
    expect(await active()).toBe(activeDefault);

    // Paid probe with a failing output (not an MP3): refused.
    expect((await versions.validateVersion(CANDIDATE, actorId, { runPaidProbe: true })).ok).toBe(true);
    state.probeBytes = new TextEncoder().encode(`<html>${"x".repeat(3000)}</html>`);
    expect((await versions.finishProbe(CANDIDATE, actorId)).ok).toBe(false);
    expect((await versions.approveVersion(CANDIDATE, actorId)).ok).toBe(false);

    // Real MP3 probe: approvable, but not active until the owner activates.
    state.probeBytes = new Uint8Array([0x49, 0x44, 0x33, 4, 0, ...new Array(3000).fill(0x11)]);
    expect((await versions.validateVersion(CANDIDATE, actorId, { runPaidProbe: true })).ok).toBe(true);
    expect((await versions.finishProbe(CANDIDATE, actorId)).ok).toBe(true);
    expect((await versions.approveVersion(CANDIDATE, actorId)).ok).toBe(true);
    expect(await active()).toBe(activeDefault);

    // Activation: wrong expected version refused; double click -> exactly one wins.
    expect((await versions.activateVersion(CANDIDATE, "f".repeat(64), actorId)).ok).toBe(false);
    const clicks = await Promise.all([
      versions.activateVersion(CANDIDATE, activeDefault, actorId),
      versions.activateVersion(CANDIDATE, activeDefault, actorId),
    ]);
    expect(clicks.filter((result) => result.ok)).toHaveLength(1);
    expect(await active()).toBe(CANDIDATE);

    // Rollback restores the previous version; a stale expectation is refused.
    expect((await versions.rollbackVersion(activeDefault, actorId)).ok).toBe(false);
    expect((await versions.rollbackVersion(CANDIDATE, actorId)).ok).toBe(true);
    expect(await active()).toBe(activeDefault);
    const overview = await versions.getVersionOverview();
    expect(overview.activeVersion).toBe(activeDefault);
  }, 30_000);

  it("Replicate indisponible ou schéma incompatible : version active inchangée", async () => {
    const versions = await import("@/lib/ai/audio-providers/replicate-versions");
    state.failMetadata = true;
    expect((await versions.checkForUpdates(actorId)).ok).toBe(false);
    state.failMetadata = false;
    expect(await active()).toBe(activeDefault);

    state.latestId = INCOMPATIBLE;
    expect((await versions.checkForUpdates(actorId)).ok).toBe(true);
    const { getServiceDb } = await import("@/db");
    const [row] = await getServiceDb()
      .select()
      .from(replicateModelVersions)
      .where(eq(replicateModelVersions.version, INCOMPATIBLE));
    expect(row.compatibility).toBe("incompatible");
    expect(row.status).toBe("blocked");
    expect((await versions.validateVersion(INCOMPATIBLE, actorId, { runPaidProbe: true })).ok).toBe(false);
    expect((await versions.activateVersion(INCOMPATIBLE, activeDefault, actorId)).ok).toBe(false);
    expect(await active()).toBe(activeDefault);
  }, 30_000);
});
