import { describe, expect, it } from "vitest";
import { REPLICATE_DEFAULT_VERSION, buildReplicateInput } from "@/lib/ai/audio-providers/replicate-model";
import {
  assessCompatibility,
  buildProbeInput,
  canActivate,
  canApprove,
  canonicalJson,
  diffSchemas,
  extractSchemas,
  hashSchemas,
  looksLikeMp3,
  pickRollbackTarget,
  type VersionRow,
} from "@/lib/ai/audio-providers/replicate-versions-model";

const VERSION_B = "b".repeat(64);
const VERSION_C = "c".repeat(64);

function openapi(
  overrides: { input?: Record<string, unknown>; remove?: string[]; required?: string[]; output?: unknown } = {},
) {
  const properties: Record<string, unknown> = {
    prompt: { type: "string", maxLength: 512 },
    lyrics: { type: "string", maxLength: 4096 },
    duration: { type: "number", minimum: -1, maximum: 600 },
    bpm: { type: "integer", minimum: 30, maximum: 300 },
    time_signature: { type: "string", default: "auto" },
    inference_steps: { type: "integer", minimum: 1, maximum: 200 },
    guidance_scale: { type: "number", minimum: 1, maximum: 15 },
    shift: { type: "number", minimum: 1, maximum: 5 },
    seed: { type: "integer" },
    thinking: { type: "boolean" },
    batch_size: { type: "integer", minimum: 1, maximum: 4 },
    audio_format: { type: "string", default: "mp3", enum: ["mp3", "wav", "flac"] },
    ...overrides.input,
  };
  for (const key of overrides.remove ?? []) delete properties[key];
  return {
    components: {
      schemas: {
        Input: { type: "object", properties, ...(overrides.required ? { required: overrides.required } : {}) },
        Output: overrides.output ?? { type: "array", items: { type: "string", format: "uri" } },
      },
    },
  };
}
const assess = (doc: unknown) => assessCompatibility(extractSchemas(doc), doc);

describe("compatibilité d'une version candidate", () => {
  it("accepte le schéma actuel : compatible, MP3 validé", () => {
    const report = assess(openapi());
    expect(report.compatibility).toBe("compatible");
    expect(report.mp3Validated).toBe(true);
    expect(report.blockers).toEqual([]);
  });

  it("bloque si audio_format disparaît du schéma (MP3 non garanti)", () => {
    const report = assess(openapi({ remove: ["audio_format"] }));
    expect(report.compatibility).toBe("incompatible");
    expect(report.mp3Validated).toBe(false);
  });

  it("bloque si l'enum de audio_format n'accepte plus mp3", () => {
    const report = assess(openapi({ input: { audio_format: { type: "string", enum: ["wav", "flac"] } } }));
    expect(report.compatibility).toBe("incompatible");
    expect(report.mp3Validated).toBe(false);
  });

  it("résout un audio_format décrit par $ref/allOf (format Cog)", () => {
    const doc = openapi({ input: { audio_format: { allOf: [{ $ref: "#/components/schemas/audio_format" }] } } });
    (doc.components.schemas as Record<string, unknown>).audio_format = { type: "string", enum: ["mp3", "wav"] };
    expect(assess(doc).mp3Validated).toBe(true);
  });

  it("nouveau champ obligatoire sans défaut → revue de code, jamais d'activation", () => {
    const report = assess(openapi({ input: { voice_id: { type: "string" } }, required: ["voice_id"] }));
    expect(report.compatibility).toBe("requires_code_review");
    expect(report.blockers.join(" ")).toContain("voice_id");
  });

  it("nouveau champ obligatoire AVEC défaut → compatible", () => {
    const report = assess(openapi({ input: { voice_id: { type: "string", default: "x" } }, required: ["voice_id"] }));
    expect(report.compatibility).toBe("compatible");
  });

  it("champ envoyé supprimé ou plage qui ne contient plus notre valeur → revue de code", () => {
    expect(assess(openapi({ remove: ["thinking"] })).compatibility).toBe("requires_code_review");
    expect(
      assess(openapi({ input: { inference_steps: { type: "integer", minimum: 10, maximum: 50 } } })).compatibility,
    ).toBe("requires_code_review");
    expect(assess(openapi({ input: { prompt: { type: "string", maxLength: 256 } } })).compatibility).toBe(
      "requires_code_review",
    );
  });

  it("sortie qui n'est plus une URL ou une liste d'URL → revue de code", () => {
    expect(assess(openapi({ output: { type: "object" } })).compatibility).toBe("requires_code_review");
    expect(assess(openapi({ output: { type: "string", format: "uri" } })).compatibility).toBe("compatible");
  });

  it("schéma illisible → unknown, MP3 non validé", () => {
    const report = assessCompatibility({ input: null, output: null }, null);
    expect(report.compatibility).toBe("unknown");
    expect(report.mp3Validated).toBe(false);
  });
});

describe("empreinte et différences de schéma", () => {
  it("l'empreinte est stable, indépendante de l'ordre des clés, et change avec le schéma", () => {
    const a = extractSchemas(openapi());
    const reordered = extractSchemas(JSON.parse(canonicalJson(openapi())));
    expect(hashSchemas(a)).toBe(hashSchemas(reordered));
    expect(hashSchemas(a)).not.toBe(hashSchemas(extractSchemas(openapi({ remove: ["bpm"] }))));
  });

  it("version identique : aucune différence", () => {
    const doc = openapi();
    const schemas = extractSchemas(doc);
    expect(diffSchemas(schemas, schemas, { active: doc, candidate: doc })).toEqual({
      addedFields: [],
      removedFields: [],
      newRequiredFields: [],
      changedFields: [],
      outputChanged: false,
    });
  });

  it("liste champs ajoutés/supprimés, plages modifiées et changement de sortie", () => {
    const before = openapi();
    const after = openapi({
      input: { style: { type: "string" }, shift: { type: "number", minimum: 1, maximum: 8 } },
      remove: ["bpm"],
      output: { type: "string", format: "uri" },
    });
    const diff = diffSchemas(extractSchemas(before), extractSchemas(after), { active: before, candidate: after });
    expect(diff.addedFields).toEqual(["style"]);
    expect(diff.removedFields).toEqual(["bpm"]);
    expect(diff.changedFields.map((change) => change.field)).toEqual(["shift"]);
    expect(diff.outputChanged).toBe(true);
  });
});

describe("contrat MP3 côté MusikPro", () => {
  it("la génération et la sonde envoient toujours audio_format = mp3", () => {
    expect(buildReplicateInput({ lyrics: "la", style: "zouglou", instrumental: false }).audio_format).toBe("mp3");
    const probe = buildProbeInput();
    expect(probe.audio_format).toBe("mp3");
    expect(probe.duration).toBe(30);
    expect(probe.lyrics).toBe("[Instrumental]");
  });

  it("un format forgé par l'appelant ne peut pas atteindre la requête", () => {
    const forged = { lyrics: "la", style: "x", instrumental: false, audio_format: "mp4" } as never;
    expect(buildReplicateInput(forged).audio_format).toBe("mp3");
  });

  it("reconnaît un vrai MP3 (ID3 ou synchro de trame) et refuse le reste", () => {
    expect(looksLikeMp3(new Uint8Array([0x49, 0x44, 0x33, 4, 0]))).toBe(true);
    expect(looksLikeMp3(new Uint8Array([0xff, 0xfb, 0x90, 0x00]))).toBe(true);
    expect(looksLikeMp3(new TextEncoder().encode("RIFF....WAVEfmt "))).toBe(false);
    expect(looksLikeMp3(new TextEncoder().encode("<html>error</html>"))).toBe(false);
    expect(looksLikeMp3(new Uint8Array([1, 2]))).toBe(false);
  });
});

describe("portes du cycle de vie", () => {
  const ready: VersionRow = {
    version: VERSION_B,
    status: "tested",
    compatibility: "compatible",
    mp3Validated: true,
    probeStatus: "passed",
    schemaHash: "h1",
  };
  const active = REPLICATE_DEFAULT_VERSION;

  it("validation gratuite seule : pas d'approbation", () => {
    const gate = canApprove({ ...ready, probeStatus: "none" }, active, "h1");
    expect(gate.ok).toBe(false);
  });

  it("test réel échoué ou non autorisé : pas d'approbation", () => {
    expect(canApprove({ ...ready, probeStatus: "failed" }, active, "h1").ok).toBe(false);
    expect(canApprove({ ...ready, probeStatus: "running" }, active, "h1").ok).toBe(false);
  });

  it("revue de code requise, MP3 non validé ou schéma modifié : pas d'approbation", () => {
    expect(canApprove({ ...ready, compatibility: "requires_code_review" }, active, "h1").ok).toBe(false);
    expect(canApprove({ ...ready, mp3Validated: false }, active, "h1").ok).toBe(false);
    expect(canApprove(ready, active, "autre").ok).toBe(false);
    expect(canApprove(ready, active, null).ok).toBe(false);
  });

  it("approbation possible quand tout est réussi, jamais pour la version déjà active", () => {
    expect(canApprove(ready, active, "h1").ok).toBe(true);
    expect(canApprove({ ...ready, version: active }, active, "h1").ok).toBe(false);
  });

  it("l'activation exige l'approbation du propriétaire (un statut 'tested' ne suffit pas)", () => {
    expect(canActivate({ ...ready, status: "tested" }, active, active).ok).toBe(false);
    expect(canActivate({ ...ready, status: "approved" }, active, active).ok).toBe(true);
  });

  it("double clic / administrateur concurrent : la version attendue ne correspond plus", () => {
    const approved = { ...ready, status: "approved" as const };
    expect(canActivate(approved, VERSION_C, active).ok).toBe(false);
    // Le deuxième clic voit déjà la version active = la candidate.
    expect(canActivate(approved, VERSION_B, active).ok).toBe(false);
  });
});

describe("retour arrière", () => {
  it("choisit la dernière version précédemment active, hors version courante, bloquée ou déjà retirée", () => {
    const history = [
      { version: REPLICATE_DEFAULT_VERSION, activatedAt: new Date(0), status: "superseded" as const },
      { version: VERSION_B, activatedAt: new Date("2026-10-10"), status: "superseded" as const },
      { version: VERSION_C, activatedAt: new Date("2026-10-12"), status: "approved" as const },
    ];
    expect(pickRollbackTarget(history, VERSION_C)).toBe(VERSION_B);
    expect(pickRollbackTarget(history.slice(0, 1), REPLICATE_DEFAULT_VERSION)).toBeNull();
    expect(pickRollbackTarget([{ ...history[1], status: "blocked" }, history[0]], VERSION_C)).toBe(
      REPLICATE_DEFAULT_VERSION,
    );
    expect(pickRollbackTarget([{ ...history[1], status: "rolled_back" }, history[0]], VERSION_C)).toBe(
      REPLICATE_DEFAULT_VERSION,
    );
  });
});
