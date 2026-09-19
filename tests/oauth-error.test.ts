import { describe, expect, it } from "vitest";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

describe("OAuth error messages", () => {
  it("turns a stale OAuth state into an actionable message", () => {
    expect(getOAuthErrorMessage("state_mismatch")).toContain("Recommencez la connexion");
  });

  it("does not expose unknown technical error codes", () => {
    const message = getOAuthErrorMessage("unexpected_internal_code");
    expect(message).toBe("La connexion n’a pas abouti. Veuillez réessayer.");
    expect(message).not.toContain("unexpected_internal_code");
  });

  it("does not show an alert when no OAuth error is present", () => {
    expect(getOAuthErrorMessage()).toBe("");
  });
});
