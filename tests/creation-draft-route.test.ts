import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const rateLimit = vi.hoisted(() => vi.fn());
const saveCreationDraft = vi.hoisted(() => vi.fn());
const deleteCreationDraft = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit, clientIp: () => "127.0.0.1" }));
vi.mock("@/lib/creation-draft/server", () => ({ saveCreationDraft, deleteCreationDraft }));

import { DELETE, PUT } from "@/app/api/creation-draft/route";

const draft = (occasion = "Anniversaire") => ({
  step: "lyrics",
  data: {
    choices: {
      occasion,
      genre: "Afrobeat",
      mood: "Modéré",
      language: "Français",
      voice: "Féminine",
      recipientRelation: "Maman",
    },
    fields: {
      story: "Une belle histoire",
      recipientName: "Awa",
      recipientPronunciation: "a-oua",
      senderName: "Issa",
      senderPronunciation: "i-sa",
      lyrics: "Maman, tu es ma lumière",
      detail: "",
    },
    details: {},
    packIndex: -1,
  },
});
const put = (body: unknown) =>
  new Request("https://musikpro.net/api/creation-draft", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: "https://musikpro.net" },
    body: JSON.stringify(body),
  });

describe("/api/creation-draft", () => {
  beforeEach(() => {
    getSession.mockReset().mockResolvedValue({ user: { id: "user-1" } });
    rateLimit.mockReset().mockResolvedValue({ success: true, backend: "memory" });
    saveCreationDraft.mockReset().mockResolvedValue(undefined);
    deleteCreationDraft.mockReset().mockResolvedValue(undefined);
  });

  it("saves the draft for the authenticated user only", async () => {
    const response = await PUT(put(draft()));
    expect(response.status).toBe(200);
    expect(saveCreationDraft).toHaveBeenCalledWith("user-1", draft());
  });

  it("never trusts a user id sent by the client", async () => {
    const response = await PUT(put({ ...draft(), userId: "someone-else" }));
    expect(response.status).toBe(400);
    expect(saveCreationDraft).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    getSession.mockResolvedValue(null);
    expect((await PUT(put(draft()))).status).toBe(401);
    expect(
      (
        await DELETE(
          new Request("https://musikpro.net/api/creation-draft", {
            method: "DELETE",
            headers: { origin: "https://musikpro.net" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(saveCreationDraft).not.toHaveBeenCalled();
    expect(deleteCreationDraft).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads and drafts without an occasion", async () => {
    expect((await PUT(put({ step: "nope", data: {} }))).status).toBe(400);
    expect((await PUT(put(draft("  ")))).status).toBe(422);
    expect(saveCreationDraft).not.toHaveBeenCalled();
  });

  it("rejects cross-site writes", async () => {
    const response = await PUT(
      new Request("https://musikpro.net/api/creation-draft", {
        method: "PUT",
        headers: { "content-type": "application/json", "sec-fetch-site": "cross-site", origin: "https://evil.example" },
        body: JSON.stringify(draft()),
      }),
    );
    expect(response.status).toBe(403);
    expect(saveCreationDraft).not.toHaveBeenCalled();
  });

  it("applies the rate limit and fails closed when it is unavailable", async () => {
    rateLimit.mockResolvedValueOnce({ success: false, backend: "memory" });
    expect((await PUT(put(draft()))).status).toBe(429);
    rateLimit.mockResolvedValueOnce({ success: false, backend: "unavailable" });
    expect((await PUT(put(draft()))).status).toBe(503);
  });

  it("reports a storage failure without leaking details", async () => {
    saveCreationDraft.mockRejectedValueOnce(new Error("relation creation_drafts does not exist"));
    const response = await PUT(put(draft()));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("creation_drafts");
  });

  it("deletes the draft of the authenticated user", async () => {
    const response = await DELETE(
      new Request("https://musikpro.net/api/creation-draft", {
        method: "DELETE",
        headers: { origin: "https://musikpro.net" },
      }),
    );
    expect(response.status).toBe(200);
    expect(deleteCreationDraft).toHaveBeenCalledWith("user-1");
  });
});
