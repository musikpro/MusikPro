import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { replicateAudioAdapter } from "@/lib/ai/audio-providers/replicate";
import {
  REPLICATE_DEFAULT_VERSION,
  buildReplicateInput,
  isReplicateDeliveryUrl,
  resolveReplicateVersion,
  verifyReplicateWebhookSignature,
} from "@/lib/ai/audio-providers/replicate-model";

const config = {
  apiKey: "r8_test_key",
  baseUrl: "https://evil.example",
  model: REPLICATE_DEFAULT_VERSION,
  timeoutMs: 5000,
  maxRetries: 0,
  webhookUrl: "https://musikpro.net/api/webhooks/replicate/token",
};
const submitInput = {
  title: "T",
  lyrics: "la la",
  style: "Zouglou",
  instrumental: false,
  gender: null,
  versionCount: 1,
};

afterEach(() => vi.unstubAllGlobals());

describe("buildReplicateInput", () => {
  it("force toujours audio_format mp3 et respecte les bornes du modèle", () => {
    const input = buildReplicateInput({ lyrics: "x".repeat(9000), style: "y ".repeat(600), instrumental: false });
    expect(input.audio_format).toBe("mp3");
    expect(String(input.lyrics).length).toBeLessThanOrEqual(4096);
    expect(String(input.prompt).length).toBeLessThanOrEqual(512);
    expect(input.batch_size).toBe(1);
  });

  it("envoie [Instrumental] quand la chanson est instrumentale", () => {
    expect(buildReplicateInput({ lyrics: "paroles", style: "afrobeats", instrumental: true }).lyrics).toBe(
      "[Instrumental]",
    );
  });

  it("n'accepte qu'un hash de version valide", () => {
    expect(resolveReplicateVersion("MFV3.0")).toBe(REPLICATE_DEFAULT_VERSION);
    expect(resolveReplicateVersion("A".repeat(64))).toBe("a".repeat(64));
  });
});

describe("isReplicateDeliveryUrl", () => {
  it("accepte replicate.delivery et ses sous-domaines exacts seulement", () => {
    expect(isReplicateDeliveryUrl("https://replicate.delivery/x/out.mp3")).toBe(true);
    expect(isReplicateDeliveryUrl("https://pbxt.replicate.delivery/x/out.mp3")).toBe(true);
    expect(isReplicateDeliveryUrl("https://replicate.delivery.evil.example/out.mp3")).toBe(false);
    expect(isReplicateDeliveryUrl("https://evilreplicate.delivery/out.mp3")).toBe(false);
    expect(isReplicateDeliveryUrl("http://replicate.delivery/out.mp3")).toBe(false);
    expect(isReplicateDeliveryUrl("https://user:pw@replicate.delivery/out.mp3")).toBe(false);
  });
});

describe("verifyReplicateWebhookSignature", () => {
  const key = Buffer.from("secret-key-bytes");
  const webhookSecret = `whsec_${key.toString("base64")}`;
  const now = 1_800_000_000;
  const body = '{"id":"abc123","status":"succeeded"}';
  const sign = (id: string, ts: number, payload: string) =>
    `v1,${createHmac("sha256", key).update(`${id}.${ts}.${payload}`).digest("base64")}`;
  const headers = (signature: string, ts = now) =>
    new Headers({ "webhook-id": "msg_1", "webhook-timestamp": String(ts), "webhook-signature": signature });

  it("valide une signature correcte, y compris parmi plusieurs versions", () => {
    expect(
      verifyReplicateWebhookSignature({
        rawBody: body,
        headers: headers(sign("msg_1", now, body)),
        webhookSecret,
        nowSeconds: now,
      }),
    ).toBe(true);
    expect(
      verifyReplicateWebhookSignature({
        rawBody: body,
        headers: headers(`v1,AAAA ${sign("msg_1", now, body)}`),
        webhookSecret,
        nowSeconds: now,
      }),
    ).toBe(true);
  });

  it("refuse corps modifié, mauvais secret, horodatage périmé et en-têtes absents", () => {
    const good = headers(sign("msg_1", now, body));
    expect(
      verifyReplicateWebhookSignature({ rawBody: body + " ", headers: good, webhookSecret, nowSeconds: now }),
    ).toBe(false);
    expect(
      verifyReplicateWebhookSignature({
        rawBody: body,
        headers: good,
        webhookSecret: "whsec_b3RoZXI=",
        nowSeconds: now,
      }),
    ).toBe(false);
    expect(
      verifyReplicateWebhookSignature({
        rawBody: body,
        headers: headers(sign("msg_1", now, body)),
        webhookSecret,
        nowSeconds: now + 301,
      }),
    ).toBe(false);
    expect(
      verifyReplicateWebhookSignature({ rawBody: body, headers: new Headers(), webhookSecret, nowSeconds: now }),
    ).toBe(false);
  });
});

describe("Replicate adapter", () => {
  function mockFetch(handler: (url: string, init: RequestInit) => unknown, status = 200) {
    const fn = vi.fn(
      async (url: string, init: RequestInit) => new Response(JSON.stringify(handler(url, init)), { status }),
    );
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("crée une prédiction asynchrone MP3 sur l'hôte fixe, avec webhook, sans jamais utiliser baseUrl", async () => {
    const fn = mockFetch(() => ({ id: "pred1", status: "starting" }));
    const result = await replicateAudioAdapter.submit(submitInput, config);
    expect(result.taskIds).toEqual(["pred1"]);
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe("https://api.replicate.com/v1/predictions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer r8_test_key");
    const body = JSON.parse(String(init.body));
    expect(body.version).toBe(`fishaudio/ace-step-1.5:${REPLICATE_DEFAULT_VERSION}`);
    expect(body.input.audio_format).toBe("mp3");
    expect(body.webhook).toBe(config.webhookUrl);
    expect(body.webhook_events_filter).toEqual(["completed"]);
    expect(JSON.stringify(result.raw)).not.toContain("r8_test_key");
  });

  it("crée une prédiction par version demandée", async () => {
    let n = 0;
    const fn = mockFetch(() => ({ id: `pred${(n += 1)}`, status: "starting" }));
    const result = await replicateAudioAdapter.submit({ ...submitInput, versionCount: 2 }, config);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.taskIds).toHaveLength(2);
  });

  it("propage l'échec quand aucune prédiction n'est créée, sans exposer la clé", async () => {
    mockFetch(() => ({ detail: "Insufficient credit" }), 402);
    await expect(replicateAudioAdapter.submit(submitInput, config)).rejects.toThrow(/402/);
    await expect(replicateAudioAdapter.submit(submitInput, config)).rejects.not.toThrow(/r8_test_key/);
  });

  it("renvoie le MP3 d'une prédiction réussie et demande sa copie durable", async () => {
    mockFetch(() => ({
      status: "succeeded",
      output: ["https://replicate.delivery/p/out.mp3"],
      input: { duration: -1, prompt: "secret prompt" },
      metrics: { predict_time: 12.5 },
    }));
    const task = await replicateAudioAdapter.getTask("pred1", config);
    expect(task).toMatchObject({
      state: "completed",
      audioUrl: "https://replicate.delivery/p/out.mp3",
      persistAudio: true,
    });
    expect(JSON.stringify(task.raw)).not.toContain("secret prompt");
    expect((task.raw as { metrics: { predict_time: number } }).metrics.predict_time).toBe(12.5);
  });

  it("refuse une sortie hors replicate.delivery", async () => {
    mockFetch(() => ({ status: "succeeded", output: ["https://evil.example/out.mp3"] }));
    expect(await replicateAudioAdapter.getTask("pred1", config)).toMatchObject({
      state: "failed",
      failureReason: "replicate_invalid_output",
    });
  });

  it("distingue en cours, échec et annulation", async () => {
    mockFetch(() => ({ status: "processing" }));
    expect((await replicateAudioAdapter.getTask("pred1", config)).state).toBe("processing");
    mockFetch(() => ({ status: "failed", error: "boom" }));
    expect(await replicateAudioAdapter.getTask("pred1", config)).toMatchObject({ state: "failed" });
    mockFetch(() => ({ status: "canceled" }));
    expect(await replicateAudioAdapter.getTask("pred1", config)).toMatchObject({ state: "failed" });
  });

  it("rejette un identifiant de prédiction non conforme sans appel réseau", async () => {
    const fn = mockFetch(() => ({}));
    expect((await replicateAudioAdapter.getTask("../account", config)).state).toBe("failed");
    expect(fn).not.toHaveBeenCalled();
  });

  it("teste la connexion avec l'appel gratuit /account", async () => {
    const fn = mockFetch(() => ({ username: "owner", type: "user" }));
    const info = await replicateAudioAdapter.testConnection!(config);
    expect(fn.mock.calls[0][0]).toBe("https://api.replicate.com/v1/account");
    expect(info.summary).toContain("owner");
  });
});
