import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decryptSecret, encryptSecret, tryDecryptSecret } from "@/lib/ai/secrets-core";

describe("tryDecryptSecret", () => {
  const previous = process.env.APP_SECRETS_ENCRYPTION_KEY;
  beforeEach(() => {
    process.env.APP_SECRETS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });
  afterEach(() => {
    process.env.APP_SECRETS_ENCRYPTION_KEY = previous;
  });

  it("relit un secret chiffré avec la clé courante", () => {
    expect(tryDecryptSecret(encryptSecret("abc"))).toBe("abc");
  });

  it("renvoie undefined quand la clé de chiffrement a changé", () => {
    const stored = encryptSecret("abc");
    process.env.APP_SECRETS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
    expect(() => decryptSecret(stored)).toThrow();
    expect(tryDecryptSecret(stored)).toBeUndefined();
  });
});
