import { createHash } from "node:crypto";
import { buildReplicateInput } from "./replicate-model";

/**
 * Pure logic of the ACE-Step version manager (skill Replicate-MusikPro-MP3 v1.1.0, §16): schema comparison,
 * compatibility classification and the lifecycle gates. No network, no database, no secret: everything here is
 * unit-tested. The Replicate/DB side lives in replicate-versions.ts.
 *
 * Lifecycle: detected → (free static checks) → paid probe by the owner → approved → active, with a rollback.
 * Nothing in this file, and no detection, can make a version active by itself.
 */

export const VERSION_STATUSES = ["detected", "tested", "approved", "blocked", "superseded", "rolled_back"] as const;
export type VersionStatus = (typeof VERSION_STATUSES)[number];
export const COMPATIBILITIES = ["compatible", "requires_code_review", "incompatible", "unknown"] as const;
export type Compatibility = (typeof COMPATIBILITIES)[number];
export type ProbeStatus = "none" | "running" | "passed" | "failed";

export const VERSION_PATTERN = /^[a-f0-9]{64}$/;
export const isVersionHash = (value: unknown): value is string =>
  typeof value === "string" && VERSION_PATTERN.test(value);

type Json = Record<string, unknown>;
const asRecord = (value: unknown): Json | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;

/** Stable JSON (sorted keys) so the same schema always hashes to the same value. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = asRecord(value);
  if (record) {
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export type ModelSchemas = { input: Json | null; output: Json | null };

/** Input/Output component schemas of a Replicate version's `openapi_schema`; null parts when unreadable. */
export function extractSchemas(openapiSchema: unknown): ModelSchemas {
  const schemas = asRecord(asRecord(asRecord(openapiSchema)?.components)?.schemas);
  return { input: asRecord(schemas?.Input), output: asRecord(schemas?.Output) };
}

export function hashSchemas(schemas: ModelSchemas): string {
  return createHash("sha256")
    .update(canonicalJson({ input: schemas.input, output: schemas.output }))
    .digest("hex");
}

/** Resolves a `$ref`/`allOf` wrapper (Cog emits `allOf: [{$ref}]` for enums) against the schemas of the document. */
function resolveProperty(property: unknown, openapiSchema: unknown): Json {
  const record = asRecord(property) ?? {};
  const allOf = Array.isArray(record.allOf) ? asRecord(record.allOf[0]) : null;
  const ref = typeof (record.$ref ?? allOf?.$ref) === "string" ? String(record.$ref ?? allOf?.$ref) : null;
  if (!ref) return record;
  const name = ref.split("/").pop() ?? "";
  const target = asRecord(asRecord(asRecord(asRecord(openapiSchema)?.components)?.schemas)?.[name]);
  return { ...(target ?? {}), ...record };
}

const properties = (input: Json | null): Json => asRecord(input?.properties) ?? {};
const required = (input: Json | null): string[] =>
  Array.isArray(input?.required) ? input.required.filter((item): item is string => typeof item === "string") : [];

export type SchemaDiff = {
  addedFields: string[];
  removedFields: string[];
  newRequiredFields: string[];
  changedFields: { field: string; changes: string[] }[];
  outputChanged: boolean;
};

const TRACKED = ["type", "minimum", "maximum", "maxLength", "minLength", "enum", "default"] as const;

/** Field-level comparison of two Input schemas (and a flag when the Output schema differs). */
export function diffSchemas(
  active: ModelSchemas,
  candidate: ModelSchemas,
  documents: { active: unknown; candidate: unknown },
): SchemaDiff {
  const before = properties(active.input);
  const after = properties(candidate.input);
  const diff: SchemaDiff = {
    addedFields: Object.keys(after)
      .filter((key) => !(key in before))
      .sort(),
    removedFields: Object.keys(before)
      .filter((key) => !(key in after))
      .sort(),
    newRequiredFields: required(candidate.input)
      .filter((key) => !required(active.input).includes(key))
      .sort(),
    changedFields: [],
    outputChanged: canonicalJson(active.output) !== canonicalJson(candidate.output),
  };
  for (const field of Object.keys(after)
    .filter((key) => key in before)
    .sort()) {
    const left = resolveProperty(before[field], documents.active);
    const right = resolveProperty(after[field], documents.candidate);
    const changes = TRACKED.filter((key) => canonicalJson(left[key]) !== canonicalJson(right[key])).map(
      (key) => `${key}: ${canonicalJson(left[key])} → ${canonicalJson(right[key])}`,
    );
    if (changes.length) diff.changedFields.push({ field, changes });
  }
  return diff;
}

export type ContractCheck = { id: string; label: string; ok: boolean; detail?: string };
export type CompatibilityReport = {
  compatibility: Compatibility;
  mp3Validated: boolean;
  checks: ContractCheck[];
  /** Why the version cannot be promoted without a code change (empty when compatible). */
  blockers: string[];
};

function valueFits(value: unknown, property: Json): string | null {
  const type = property.type;
  if (type === "integer" && !(typeof value === "number" && Number.isInteger(value))) return "type integer";
  if (type === "number" && typeof value !== "number") return "type number";
  if (type === "string" && typeof value !== "string") return "type string";
  if (type === "boolean" && typeof value !== "boolean") return "type boolean";
  if (typeof value === "number") {
    if (typeof property.minimum === "number" && value < property.minimum) return `min ${property.minimum}`;
    if (typeof property.maximum === "number" && value > property.maximum) return `max ${property.maximum}`;
  }
  if (Array.isArray(property.enum) && !property.enum.includes(value)) return "valeur hors enum";
  return null;
}

/** Output must stay what pickReplicateOutputUrl reads: a delivery URL string, or an array of them. */
function outputIsUrlOrUrlList(output: Json | null, document: unknown): boolean {
  if (!output) return false;
  const resolved = resolveProperty(output, document);
  const isUri = (schema: Json) => schema.type === "string" && (schema.format === "uri" || schema.format === undefined);
  if (resolved.type === "array") return isUri(resolveProperty(resolved.items, document));
  return isUri(resolved);
}

/**
 * Static compatibility of a candidate with what MusikPro sends today (buildReplicateInput) and reads back.
 * - `incompatible`: MP3 can no longer be guaranteed (audio_format missing, or its enum excludes "mp3").
 * - `requires_code_review`: a sent field disappeared or no longer accepts our value, a new required field has no
 *   default, or the output no longer looks like a URL/list of URLs → the adapter and the skill must change first.
 * - `compatible`: the contract holds (added optional fields and changed defaults are only listed in the diff).
 * - `unknown`: the schema could not be read.
 */
export function assessCompatibility(candidate: ModelSchemas, document: unknown): CompatibilityReport {
  const checks: ContractCheck[] = [];
  const blockers: string[] = [];
  const props = properties(candidate.input);
  if (!candidate.input || !Object.keys(props).length) {
    return {
      compatibility: "unknown",
      mp3Validated: false,
      checks: [{ id: "schema", label: "Schéma d’entrée lisible", ok: false, detail: "Schéma absent ou illisible" }],
      blockers: ["Schéma OpenAPI absent ou illisible"],
    };
  }

  // MP3 contract: audio_format must exist and accept "mp3" (forced server-side, never taken from a client).
  const sent = buildReplicateInput({ lyrics: "x", style: "x", instrumental: false });
  const audioFormat = props.audio_format === undefined ? null : resolveProperty(props.audio_format, document);
  const mp3Accepted = audioFormat !== null && valueFits("mp3", audioFormat) === null;
  checks.push({
    id: "mp3",
    label: "Le paramètre audio_format accepte « mp3 »",
    ok: mp3Accepted,
    detail:
      audioFormat === null ? "audio_format absent du schéma" : mp3Accepted ? undefined : "mp3 refusé par le schéma",
  });
  checks.push({
    id: "mp3-forced",
    label: "MusikPro envoie toujours audio_format = mp3",
    ok: sent.audio_format === "mp3",
  });

  const fieldIssues: string[] = [];
  for (const [field, value] of Object.entries(sent)) {
    if (!(field in props)) {
      fieldIssues.push(`${field} : champ supprimé`);
      continue;
    }
    const misfit = valueFits(value, resolveProperty(props[field], document));
    if (misfit) fieldIssues.push(`${field} : ${misfit}`);
  }
  // Text limits: our clipping constants (512 / 4096) must still fit under the model's maxLength.
  for (const [field, ours] of [
    ["prompt", 512],
    ["lyrics", 4096],
  ] as const) {
    const max = resolveProperty(props[field], document).maxLength;
    if (typeof max === "number" && max < ours) fieldIssues.push(`${field} : maxLength ${max} < ${ours}`);
  }
  checks.push({
    id: "sent-fields",
    label: "Les champs envoyés existent et acceptent nos valeurs",
    ok: fieldIssues.length === 0,
    detail: fieldIssues.join(" ; ") || undefined,
  });

  const defaults = (field: string) => resolveProperty(props[field], document).default !== undefined;
  const unsupportedRequired = required(candidate.input).filter((field) => !(field in sent) && !defaults(field));
  checks.push({
    id: "required",
    label: "Aucun champ obligatoire sans valeur par défaut que nous ne gérons pas",
    ok: unsupportedRequired.length === 0,
    detail: unsupportedRequired.join(", ") || undefined,
  });

  const outputOk = outputIsUrlOrUrlList(candidate.output, document);
  checks.push({ id: "output", label: "La sortie reste une URL (ou une liste d’URL)", ok: outputOk });

  let compatibility: Compatibility = "compatible";
  if (!mp3Accepted) {
    compatibility = "incompatible";
    blockers.push("Le format MP3 n’est plus garanti par le schéma.");
  }
  if (fieldIssues.length) blockers.push(`Champs incompatibles : ${fieldIssues.join(" ; ")}`);
  if (unsupportedRequired.length) blockers.push(`Nouveaux champs obligatoires : ${unsupportedRequired.join(", ")}`);
  if (!outputOk) blockers.push("La forme de la sortie a changé.");
  if (compatibility === "compatible" && blockers.length) compatibility = "requires_code_review";
  return { compatibility, mp3Validated: mp3Accepted, checks, blockers };
}

/** First bytes of an MP3: an ID3v2 tag, or an MPEG audio frame sync (0xFFEx / 0xFFFx). */
export function looksLikeMp3(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return true;
  for (let i = 0; i < Math.min(bytes.length - 1, 4096); i += 1) {
    if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0 && (bytes[i + 1] & 0x06) !== 0) return true;
  }
  return false;
}

/** Short, harmless input of the paid probe (instrumental, short, MP3): the cheapest real end-to-end check. */
export function buildProbeInput(): Record<string, unknown> {
  return {
    ...buildReplicateInput({ lyrics: null, style: "short acoustic guitar test", instrumental: true }),
    duration: 30,
  };
}

export type VersionRow = {
  version: string;
  status: VersionStatus;
  compatibility: Compatibility;
  mp3Validated: boolean;
  probeStatus: ProbeStatus;
  schemaHash: string | null;
};

export type Gate = { ok: true } | { ok: false; reason: string };
const refuse = (reason: string): Gate => ({ ok: false, reason });

/** Free checks are enough to *test*; only a passed paid probe (owner-consented) makes a version approvable. */
export function canApprove(row: VersionRow, activeVersion: string, freshSchemaHash: string | null): Gate {
  if (row.version === activeVersion) return refuse("Cette version est déjà active.");
  if (row.status === "blocked") return refuse("Version bloquée.");
  if (row.compatibility !== "compatible") return refuse("Compatibilité non démontrée : revue de code nécessaire.");
  if (!row.mp3Validated) return refuse("Le contrat MP3 n’est pas validé.");
  if (row.probeStatus !== "passed") return refuse("Le test réel (génération MP3 courte) n’a pas réussi.");
  if (!row.schemaHash || !freshSchemaHash || row.schemaHash !== freshSchemaHash) {
    return refuse("Le schéma a changé depuis le test : relancer la vérification.");
  }
  return { ok: true };
}

export function canActivate(row: VersionRow, activeVersion: string, expectedActive: string): Gate {
  if (row.version === activeVersion) return refuse("Cette version est déjà active.");
  if (expectedActive !== activeVersion) return refuse("La version active a changé entre-temps : recharger la page.");
  if (row.status !== "approved") return refuse("Seule une version approuvée par le propriétaire peut être activée.");
  if (row.compatibility !== "compatible" || !row.mp3Validated) return refuse("Version non compatible MP3.");
  return { ok: true };
}

/** Most recent previously-active, previously-approved version that is not the current one. */
export function pickRollbackTarget(
  history: { version: string; activatedAt: Date | null; status: VersionStatus }[],
  activeVersion: string,
): string | null {
  const candidates = history
    .filter(
      (row) =>
        row.version !== activeVersion && row.activatedAt && row.status !== "blocked" && row.status !== "rolled_back",
    )
    .sort((a, b) => (b.activatedAt?.getTime() ?? 0) - (a.activatedAt?.getTime() ?? 0));
  return candidates[0]?.version ?? null;
}
