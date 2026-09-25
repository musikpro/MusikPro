import { describe, expect, it } from "vitest";
import { classifyMusicfulError, MusicfulApiError } from "@/lib/ai/errors";

describe("Musicful public error classification", () => {
  it("flags an invalid API key without leaking the provider body", () => {
    expect(
      classifyMusicfulError(
        new MusicfulApiError("Musicful request failed with HTTP 401", 401, { secret: "should not leak" }),
      ),
    ).toMatchObject({
      status: 503,
      code: "MUSICFUL_INVALID_KEY",
    });
  });

  it("flags exhausted credits distinctly from an invalid key", () => {
    expect(classifyMusicfulError(new MusicfulApiError("Musicful request failed with HTTP 402", 402, {}))).toMatchObject(
      {
        status: 503,
        code: "MUSICFUL_NO_CREDITS",
      },
    );
  });

  it("keeps rate limiting distinct from other provider errors", () => {
    expect(classifyMusicfulError(new MusicfulApiError("Musicful request failed with HTTP 429", 429, {}))).toMatchObject(
      {
        status: 429,
        code: "MUSICFUL_RATE_LIMITED",
      },
    );
  });

  it("falls back to a generic provider error for unmapped statuses", () => {
    expect(classifyMusicfulError(new MusicfulApiError("Musicful request failed with HTTP 500", 500, {}))).toMatchObject(
      {
        status: 502,
        code: "MUSICFUL_PROVIDER_ERROR",
      },
    );
  });
});
