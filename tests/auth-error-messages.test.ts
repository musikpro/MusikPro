import { describe, expect, it } from "vitest";
import { authErrorMessage, authResultErrorMessage } from "@/lib/auth/auth-error-messages";
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

describe("authErrorMessage — anti-énumération et codes propriétaire", () => {
  it("rend USER_NOT_FOUND comme le message générique d'identifiants invalides", () => {
    expect(authErrorMessage("USER_NOT_FOUND", "Repli")).toBe("E-mail ou mot de passe incorrect.");
    expect(authErrorMessage("USER_NOT_FOUND", "Repli")).toBe(authErrorMessage("INVALID_EMAIL_OR_PASSWORD", "Repli"));
  });
  it("traduit les codes du plugin owner-two-factor avec le libellé serveur", () => {
    expect(authErrorMessage("OWNER_TWO_FACTOR_ONLY", "Repli")).toBe("Le double facteur est réservé aux propriétaires.");
    expect(authErrorMessage("OWNER_TWO_FACTOR_BOOTSTRAP_FAILED", "Repli")).toBe(
      "Impossible de préparer la vérification du propriétaire.",
    );
  });
});

describe("authResultErrorMessage", () => {
  it("affiche « Trop de requêtes » pour un 429 sans code (limitation de débit better-auth)", () => {
    expect(authResultErrorMessage({ status: 429 }, "Connexion impossible")).toBe(
      "Trop de requêtes. Réessaie dans un instant.",
    );
    expect(authResultErrorMessage({ status: 429, code: "SOMETHING_NEW" }, "Repli")).toBe(
      "Trop de requêtes. Réessaie dans un instant.",
    );
  });
  it("garde le message du code connu, même en 429", () => {
    expect(authResultErrorMessage({ status: 429, code: "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE" }, "Repli")).toBe(
      "Trop de tentatives. Demandez un nouveau code.",
    );
  });
  it("retombe sur le repli hors 429 ou sans erreur", () => {
    expect(authResultErrorMessage({ status: 400 }, "Repli")).toBe("Repli");
    expect(authResultErrorMessage({ status: 401, code: null }, "Repli")).toBe("Repli");
    expect(authResultErrorMessage(null, "Repli")).toBe("Repli");
    expect(authResultErrorMessage({ status: 404, code: "USER_NOT_FOUND" }, "Repli")).toBe(
      "E-mail ou mot de passe incorrect.",
    );
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
