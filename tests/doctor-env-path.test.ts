import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveDoctorEnvPath } from "../scripts/lib/doctor-env-path.mjs";

const root = "/projet";

describe("resolveDoctorEnvPath", () => {
  it("garde .env.local par défaut (comportement historique)", () => {
    expect(resolveDoctorEnvPath(root, undefined)).toEqual({ envPath: path.join(root, ".env.local"), custom: false });
    expect(resolveDoctorEnvPath(root, "   ")).toEqual({ envPath: path.join(root, ".env.local"), custom: false });
  });

  it("accepte un chemin absolu", () => {
    expect(resolveDoctorEnvPath(root, "/secrets/prod.env")).toEqual({ envPath: "/secrets/prod.env", custom: true });
  });

  it("développe ~ vers le dossier personnel", () => {
    expect(resolveDoctorEnvPath(root, "~/musikpro-prod.env")).toEqual({
      envPath: path.join(os.homedir(), "musikpro-prod.env"),
      custom: true,
    });
  });

  it("résout un chemin relatif depuis la racine du projet", () => {
    expect(resolveDoctorEnvPath(root, "../prod.env")).toEqual({
      envPath: path.resolve(root, "../prod.env"),
      custom: true,
    });
  });
});
