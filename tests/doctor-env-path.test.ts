import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mergeEnv, parseEnvText, resolveDoctorEnvPaths } from "../scripts/lib/doctor-env-path.mjs";

const root = "/projet";
const base = path.join(root, ".env.local");

describe("resolveDoctorEnvPaths", () => {
  it("n'a pas de surcharge par défaut (comportement historique)", () => {
    expect(resolveDoctorEnvPaths(root, undefined)).toEqual({ baseEnvPath: base, overlayEnvPath: null });
    expect(resolveDoctorEnvPaths(root, "   ")).toEqual({ baseEnvPath: base, overlayEnvPath: null });
  });

  it("accepte un chemin absolu", () => {
    expect(resolveDoctorEnvPaths(root, "/secrets/prod.env")).toEqual({
      baseEnvPath: base,
      overlayEnvPath: "/secrets/prod.env",
    });
  });

  it("développe ~ vers le dossier personnel", () => {
    expect(resolveDoctorEnvPaths(root, "~/musikpro-prod.env").overlayEnvPath).toBe(
      path.join(os.homedir(), "musikpro-prod.env"),
    );
  });

  it("résout un chemin relatif depuis la racine du projet", () => {
    expect(resolveDoctorEnvPaths(root, "../prod.env").overlayEnvPath).toBe(path.resolve(root, "../prod.env"));
  });
});

describe("parseEnvText / mergeEnv", () => {
  it("ignore commentaires et lignes vides, retire les guillemets", () => {
    expect(parseEnvText("# c\n\nA=1\nB=\"deux\"\nC='x'\n")).toEqual({ A: "1", B: "deux", C: "x" });
  });

  it("un fichier vide ne donne aucune variable", () => {
    expect(parseEnvText("")).toEqual({});
  });

  it("la surcharge l'emporte, le reste de .env.local est conservé", () => {
    const merged = mergeEnv(
      { DATABASE_URL: "dev", RESEND_API_KEY: "re_x", APP_URL: "http://localhost:3000" },
      { DATABASE_URL: "prod", APP_URL: "https://musikpro.net" },
    );
    expect(merged).toEqual({ DATABASE_URL: "prod", RESEND_API_KEY: "re_x", APP_URL: "https://musikpro.net" });
  });
});
