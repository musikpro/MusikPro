import { describe, expect, it } from "vitest";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";

describe("request guards", () => {
  it("rejects explicitly cross-site mutations", () => {
    const req = new Request("https://app.example.test/api/action", { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    expect(rejectCrossSiteMutation(req)?.status).toBe(403);
  });

  it("rejects oversized declared bodies", () => {
    const req = new Request("https://app.example.test/api/action", { method: "POST", headers: { "content-length": "1001" } });
    expect(rejectOversizedRequest(req, 1000)?.status).toBe(413);
  });

  it("rejects an unexpected content type", () => {
    const req = new Request("https://app.example.test/api/action", { method: "POST", headers: { "content-type": "text/plain" } });
    expect(requireContentType(req, "application/json")?.status).toBe(415);
  });
});
