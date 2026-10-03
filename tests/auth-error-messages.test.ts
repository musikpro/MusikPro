import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth/auth-error-messages";
import { getOAuthErrorMessage } from "@/lib/auth/oauth-error";

describe("authErrorMessage", () => {
  it("renvoie le message français d'un code connu", () => {
    expect(authErrorMessage("INVALID_EMAIL_OR_PASSWORD", "Connexion impossible")).toBe("E-mail ou mot de passe incorrect.");
  });
  it("retombe sur le message de repli pour un code inconnu ou absent", () => {
    expect(authErrorMessage("SOMETHING_NEW", "Connexion impossible")).toBe("Connexion impossible");
    expect(authErrorMessage(undefined, "Connexion impossible")).toBe("Connexion impossible");
  });
  it("ne prend pas une clé héritée du prototype pour un code", () => {
    expect(authErrorMessage("constructor", "Repli")).toBe("Repli");
    expect(authErrorMessage("__proto__", "Repli")).toBe("Repli");
  });
});

describe("getOAuthErrorMessage", () => {
  it("garde les messages français existants", () => {
    expect(getOAuthErrorMessage("state_mismatch")).toBe(
      "Cette tentative de connexion Google a expiré ou a déjà été utilisée. Recommencez la connexion.",
    );
    expect(getOAuthErrorMessage(undefined)).toBe("");
    expect(getOAuthErrorMessage("zzz")).toBe("La connexion n’a pas abouti. Veuillez réessayer.");
  });
});
