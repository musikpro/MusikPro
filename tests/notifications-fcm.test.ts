import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

import { isPushConfigured, resetFcmCache, sendPush } from "@/lib/notifications/fcm";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("fcm", () => {
  beforeEach(() => {
    resetFcmCache();
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      project_id: "demo-project",
      client_email: "svc@demo-project.iam.gserviceaccount.com",
      private_key: privateKey,
    });
  });
  afterEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    vi.unstubAllGlobals();
    resetFcmCache();
  });

  it("n'envoie rien et ne lève pas sans compte de service", async () => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    resetFcmCache();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(isPushConfigured()).toBe(false);
    expect(await sendPush(["a".repeat(30)], { title: "t", body: "b" })).toEqual({ sent: 0, invalidTokens: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un compte de service mal formé", () => {
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = "{pas du json";
    resetFcmCache();
    expect(isPushConfigured()).toBe(false);
  });

  it("obtient un jeton OAuth signé puis envoie à chaque appareil, et signale les jetons morts", async () => {
    const good = "g".repeat(30);
    const dead = "d".repeat(30);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("https://oauth2.googleapis.com")) return json({ access_token: "tok", expires_in: 3600 });
      const body = JSON.parse(String(init?.body));
      if (body.message.token === dead)
        return json({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }, 404);
      return json({ name: "ok" });
    });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await sendPush([good, dead], {
      title: "Chanson prête",
      body: "Ta chanson est prête",
      href: "/dashboard/songs",
    });

    expect(outcome).toEqual({ sent: 1, invalidTokens: [dead] });
    const oauth = fetchMock.mock.calls.find(([url]) => String(url).startsWith("https://oauth2"))!;
    expect(String((oauth[1] as RequestInit).body)).toContain("jwt-bearer");
    const send = fetchMock.mock.calls.find(([url]) => String(url).includes("messages:send"))!;
    expect(String(send[0])).toContain("/projects/demo-project/");
    expect((send[1] as RequestInit).headers).toMatchObject({ Authorization: "Bearer tok" });
    expect(JSON.parse(String((send[1] as RequestInit).body)).message.data).toEqual({ href: "/dashboard/songs" });
  });

  it("réutilise le jeton OAuth entre deux envois", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith("https://oauth2") ? json({ access_token: "tok", expires_in: 3600 }) : json({}),
    );
    vi.stubGlobal("fetch", fetchMock);
    await sendPush(["a".repeat(30)], { title: "t", body: "b" });
    await sendPush(["b".repeat(30)], { title: "t", body: "b" });
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("https://oauth2"))).toHaveLength(1);
  });

  it("ne lève jamais quand l'authentification échoue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "invalid_grant" }, 400)),
    );
    expect(await sendPush(["a".repeat(30)], { title: "t", body: "b" })).toEqual({ sent: 0, invalidTokens: [] });
  });
});
