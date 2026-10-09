import "server-only";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getServiceDb } from "@/db";
import {
  audioProviderConfigs,
  musicGenerationJobs,
  replicateModelVersionEvents,
  replicateModelVersions,
} from "@/db/schema";
import { getAudioProviderConfig } from "@/lib/ai/musicful";
import { writeAuditLog } from "@/lib/security/audit";
import { replicateRequest } from "./replicate";
import {
  REPLICATE_MODEL,
  isReplicateDeliveryUrl,
  isReplicatePredictionId,
  pickReplicateOutputUrl,
  resolveReplicateVersion,
} from "./replicate-model";
import {
  assessCompatibility,
  buildProbeInput,
  canActivate,
  canApprove,
  diffSchemas,
  extractSchemas,
  hashSchemas,
  isVersionHash,
  looksLikeMp3,
  pickRollbackTarget,
  type Compatibility,
  type ProbeStatus,
  type VersionRow,
  type VersionStatus,
} from "./replicate-versions-model";

/**
 * ACE-Step version manager (skill Replicate-MusikPro-MP3 v1.1.0, §16). Detection reads Replicate metadata only;
 * the ACTIVE version is `audio_provider_configs.default_model` and changes only through `activateVersion` /
 * `rollbackVersion`, both owner-triggered, compare-and-set (the Neon HTTP driver has no interactive transaction,
 * so a single conditional UPDATE is the atomic step) and audited. Jobs in flight are unaffected: a prediction is
 * created with the version read at submit time and is afterwards followed by its own id.
 */

export type VersionActionResult = { ok: true; message: string } | { ok: false; message: string };
const ok = (message: string): VersionActionResult => ({ ok: true, message });
const fail = (message: string): VersionActionResult => ({ ok: false, message });

const MODEL_PATH = `/models/${REPLICATE_MODEL}`;
const PROBE_MAX_BYTES = 20 * 1024 * 1024;
/** A probe that never reported back (crash between claim and result) stops blocking new ones after this delay. */
const PROBE_STALE_MS = 30 * 60_000;

type Json = Record<string, unknown>;
const asRecord = (value: unknown): Json | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null;
const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const asDate = (value: unknown): Date | null => {
  const text = asString(value);
  const date = text ? new Date(text) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

async function loadReplicate() {
  const provider = await getAudioProviderConfig("replicate");
  if (!provider.apiKey) return null;
  return {
    stored: provider.config,
    runtime: {
      apiKey: provider.apiKey,
      baseUrl: provider.baseUrl,
      model: provider.model,
      timeoutMs: Math.min(provider.timeoutMs, 30_000),
      maxRetries: 0,
    },
    activeVersion: resolveReplicateVersion(provider.model),
  };
}
type ReplicateContext = NonNullable<Awaited<ReturnType<typeof loadReplicate>>>;

type RemoteVersion = { id: string; createdAt: Date | null; openapi: unknown };
function toRemote(data: unknown): RemoteVersion | null {
  const record = asRecord(data);
  const id = record?.id;
  return isVersionHash(id)
    ? { id, createdAt: asDate(record?.created_at), openapi: record?.openapi_schema ?? null }
    : null;
}
async function fetchLatest(context: ReplicateContext): Promise<RemoteVersion | null> {
  return toRemote(asRecord(await replicateRequest(MODEL_PATH, context.runtime))?.latest_version);
}
async function fetchVersion(context: ReplicateContext, version: string): Promise<RemoteVersion | null> {
  if (!isVersionHash(version)) return null;
  return toRemote(await replicateRequest(`${MODEL_PATH}/versions/${version}`, context.runtime));
}

async function recordEvent(event: {
  version: string;
  event: string;
  actorId?: string | null;
  previousVersion?: string | null;
  schemaHash?: string | null;
  result?: Json;
}) {
  await getServiceDb()
    .insert(replicateModelVersionEvents)
    .values({
      id: randomUUID(),
      version: event.version,
      event: event.event,
      actorId: event.actorId ?? null,
      previousVersion: event.previousVersion ?? null,
      schemaHash: event.schemaHash ?? null,
      result: event.result ?? {},
    });
  await writeAuditLog({
    action: `ai.replicate.version.${event.event}`,
    actorId: event.actorId ?? undefined,
    targetType: "ai_provider",
    targetId: "replicate",
    metadata: { version: event.version, previousVersion: event.previousVersion ?? null, ...(event.result ?? {}) },
  });
}

function toGateRow(row: typeof replicateModelVersions.$inferSelect): VersionRow {
  return {
    version: row.version,
    status: row.status as VersionStatus,
    compatibility: row.compatibility as Compatibility,
    mp3Validated: row.mp3Validated,
    probeStatus: row.probeStatus as ProbeStatus,
    schemaHash: row.schemaHash,
  };
}

/**
 * Compares a remote version with the active one and stores the outcome. Re-running it on an unchanged schema only
 * refreshes `last_checked_at`; a changed schema (or a lost compatibility) clears the tests and the approval.
 */
async function analyseAndStore(
  context: ReplicateContext,
  remote: RemoteVersion,
  actorId: string | null,
): Promise<{ created: boolean; compatibility: Compatibility }> {
  const database = getServiceDb();
  const candidate = extractSchemas(remote.openapi);
  const schemaHash = hashSchemas(candidate);
  const report = assessCompatibility(candidate, remote.openapi);
  let diff: unknown = null;
  try {
    const active = await fetchVersion(context, context.activeVersion);
    if (active)
      diff = diffSchemas(extractSchemas(active.openapi), candidate, {
        active: active.openapi,
        candidate: remote.openapi,
      });
  } catch {
    diff = null; // the active version may have been removed from Replicate: the comparison is simply unavailable
  }
  const checks = { items: report.checks, blockers: report.blockers };
  const now = new Date();
  const inserted = await database
    .insert(replicateModelVersions)
    .values({
      version: remote.id,
      status: report.compatibility === "compatible" || report.compatibility === "unknown" ? "detected" : "blocked",
      compatibility: report.compatibility,
      mp3Validated: report.mp3Validated,
      schemaHash,
      diff,
      checks,
      sourceCreatedAt: remote.createdAt,
    })
    .onConflictDoNothing()
    .returning({ version: replicateModelVersions.version });
  if (inserted.length) {
    await recordEvent({
      version: remote.id,
      event: "detected",
      actorId,
      previousVersion: context.activeVersion,
      schemaHash,
      result: { compatibility: report.compatibility, mp3Validated: report.mp3Validated },
    });
    return { created: true, compatibility: report.compatibility };
  }
  const [existing] = await database
    .select()
    .from(replicateModelVersions)
    .where(eq(replicateModelVersions.version, remote.id))
    .limit(1);
  if (!existing) return { created: false, compatibility: report.compatibility };
  const sameContract = existing.schemaHash === schemaHash && existing.compatibility === report.compatibility;
  if (sameContract) {
    await database
      .update(replicateModelVersions)
      .set({ lastCheckedAt: now, diff, checks, updatedAt: now })
      .where(eq(replicateModelVersions.version, remote.id));
  } else {
    await database
      .update(replicateModelVersions)
      .set({
        status: report.compatibility === "compatible" || report.compatibility === "unknown" ? "detected" : "blocked",
        compatibility: report.compatibility,
        mp3Validated: report.mp3Validated,
        schemaHash,
        diff,
        checks,
        probeStatus: "none",
        probePredictionId: null,
        probeError: null,
        testedAt: null,
        approvedBy: null,
        approvedAt: null,
        lastCheckedAt: now,
        updatedAt: now,
      })
      .where(eq(replicateModelVersions.version, remote.id));
    await recordEvent({
      version: remote.id,
      event: "schema_changed",
      actorId,
      schemaHash,
      result: { compatibility: report.compatibility },
    });
  }
  return { created: false, compatibility: report.compatibility };
}

/** Read-only toward Replicate and toward the active version: never activates, never starts a paid prediction. */
export async function checkForUpdates(actorId: string | null): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  try {
    const latest = await fetchLatest(context);
    if (!latest) return fail("Réponse Replicate illisible : la version active est inchangée.");
    if (latest.id === context.activeVersion) {
      await recordEvent({ version: latest.id, event: "checked", actorId, result: { outcome: "identical" } });
      return ok("Aucune nouvelle version : la version active est la plus récente.");
    }
    const result = await analyseAndStore(context, latest, actorId);
    await recordEvent({
      version: latest.id,
      event: "checked",
      actorId,
      previousVersion: context.activeVersion,
      result: { outcome: result.created ? "new" : "known", compatibility: result.compatibility },
    });
    return ok(
      `${result.created ? "Nouvelle version détectée" : "Version déjà connue, contrôles actualisés"} (${latest.id.slice(0, 8)}…) : ${
        result.compatibility === "compatible"
          ? "compatible"
          : result.compatibility === "unknown"
            ? "à vérifier"
            : "revue de code nécessaire"
      }. La version active n’a pas changé.`,
    );
  } catch {
    // Network error, 401/403, unreadable schema: the active version is untouched by construction.
    return fail("Replicate est injoignable ou a refusé la requête : la version active est inchangée.");
  }
}

async function getRow(version: string) {
  const [row] = await getServiceDb()
    .select()
    .from(replicateModelVersions)
    .where(eq(replicateModelVersions.version, version))
    .limit(1);
  return row ?? null;
}

/**
 * Free static checks, then (only with explicit owner consent) one short billable prediction on the candidate.
 * The probe is two-step because a prediction takes longer than a request: `runPaidProbe` starts it,
 * `finishProbe` reads the result.
 */
export async function validateVersion(
  version: string,
  actorId: string,
  options: { runPaidProbe: boolean },
): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  if (version === context.activeVersion) return fail("Cette version est déjà la version active.");
  try {
    const remote = await fetchVersion(context, version);
    if (!remote) return fail("Cette version n’existe pas sur Replicate.");
    await analyseAndStore(context, remote, actorId);
    const row = await getRow(version);
    if (!row) return fail("Version introuvable après analyse.");
    const database = getServiceDb();
    if (row.compatibility !== "compatible" || !row.mp3Validated) {
      await recordEvent({
        version,
        event: "tested",
        actorId,
        schemaHash: row.schemaHash,
        result: { passed: false, compatibility: row.compatibility },
      });
      return fail("Contrôles statiques non réussis : cette version exige une revue du code avant tout test payant.");
    }
    await database
      .update(replicateModelVersions)
      .set({ status: row.status === "approved" ? "approved" : "tested", testedAt: new Date(), updatedAt: new Date() })
      .where(eq(replicateModelVersions.version, version));
    await recordEvent({
      version,
      event: "tested",
      actorId,
      schemaHash: row.schemaHash,
      result: { passed: true, paidProbe: false },
    });
    if (!options.runPaidProbe) {
      return ok(
        "Contrôles gratuits réussis. Sans test réel (génération payante), la version ne peut pas être approuvée.",
      );
    }

    // Paid probe: one at a time, consented, no webhook (nothing is stored; the file is only inspected).
    const [running] = await database
      .select({ version: replicateModelVersions.version })
      .from(replicateModelVersions)
      .where(
        and(
          eq(replicateModelVersions.probeStatus, "running"),
          gte(replicateModelVersions.updatedAt, new Date(Date.now() - PROBE_STALE_MS)),
        ),
      )
      .limit(1);
    if (running) return fail("Un test réel est déjà en cours : attends son résultat avant d’en lancer un autre.");
    const claimed = await database
      .update(replicateModelVersions)
      .set({ probeStatus: "running", probeError: null, probePredictionId: null, updatedAt: new Date() })
      .where(
        and(
          eq(replicateModelVersions.version, version),
          sql`(${replicateModelVersions.probeStatus} <> 'running' or ${replicateModelVersions.updatedAt} < now() - interval '30 minutes')`,
        ),
      )
      .returning({ version: replicateModelVersions.version });
    if (!claimed.length) return fail("Un test réel est déjà en cours pour cette version.");
    try {
      const created = asRecord(
        await replicateRequest("/predictions", context.runtime, {
          method: "POST",
          body: JSON.stringify({ version: `${REPLICATE_MODEL}:${version}`, input: buildProbeInput() }),
        }),
      );
      const predictionId = created?.id;
      if (!isReplicatePredictionId(predictionId)) throw new Error("no_prediction_id");
      await database
        .update(replicateModelVersions)
        .set({ probePredictionId: predictionId, updatedAt: new Date() })
        .where(eq(replicateModelVersions.version, version));
      await recordEvent({
        version,
        event: "probe_started",
        actorId,
        schemaHash: row.schemaHash,
        result: { predictionId },
      });
      return ok(
        "Test réel lancé (une génération MP3 de 30 s, facturée par Replicate). Reviens vérifier le résultat dans quelques instants.",
      );
    } catch {
      // A POST that may have been accepted is not retried: the probe is marked failed, the owner decides.
      await database
        .update(replicateModelVersions)
        .set({ probeStatus: "failed", probeError: "probe_start_failed", updatedAt: new Date() })
        .where(eq(replicateModelVersions.version, version));
      return fail("Le test réel n’a pas pu démarrer (rien n’a été activé).");
    }
  } catch {
    return fail("Replicate est injoignable : la version active est inchangée.");
  }
}

async function downloadProbe(url: string, context: ReplicateContext): Promise<Uint8Array | null> {
  if (!isReplicateDeliveryUrl(url)) return null;
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(context.runtime.timeoutMs),
    cache: "no-store",
  });
  if (!response.ok || !response.body) return null;
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > PROBE_MAX_BYTES) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > PROBE_MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

/** Reads the probe prediction; marks it passed only if the delivered file really is an MP3 of a sane size. */
export async function finishProbe(version: string, actorId: string): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  const row = await getRow(version);
  if (!row || row.probeStatus !== "running" || !row.probePredictionId)
    return fail("Aucun test réel en cours pour cette version.");
  const database = getServiceDb();
  const settle = async (status: "passed" | "failed", reason: string | null) => {
    await database
      .update(replicateModelVersions)
      .set({ probeStatus: status, probeError: reason, testedAt: new Date(), updatedAt: new Date() })
      .where(eq(replicateModelVersions.version, version));
    await recordEvent({
      version,
      event: "probe_finished",
      actorId,
      schemaHash: row.schemaHash,
      result: { status, reason },
    });
  };
  try {
    const prediction = asRecord(await replicateRequest(`/predictions/${row.probePredictionId}`, context.runtime));
    const status = (asString(prediction?.status) ?? "").toLowerCase();
    if (status === "starting" || status === "processing")
      return ok("Le test réel est toujours en cours : réessaie dans un instant.");
    if (status !== "succeeded") {
      await settle("failed", `prediction_${status || "unknown"}`);
      return fail("Le test réel a échoué : la version ne peut pas être approuvée.");
    }
    if (asString(prediction?.version) !== version) {
      await settle("failed", "version_mismatch");
      return fail("Le test réel n’a pas été exécuté sur la version attendue.");
    }
    const url = pickReplicateOutputUrl(prediction?.output);
    const bytes = url ? await downloadProbe(url, context) : null;
    if (!bytes || bytes.length < 2_000 || !looksLikeMp3(bytes)) {
      await settle("failed", "output_not_mp3");
      return fail("Le fichier livré n’est pas un MP3 valide : la version est refusée.");
    }
    await settle("passed", null);
    return ok("Test réel réussi : un vrai MP3 a été livré. La version peut être approuvée.");
  } catch {
    return fail("Impossible de lire le résultat du test pour l’instant : réessaie.");
  }
}

export async function approveVersion(version: string, actorId: string): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  const row = await getRow(version);
  if (!row) return fail("Version inconnue : lance d’abord « Vérifier les mises à jour ».");
  try {
    const remote = await fetchVersion(context, version);
    const gate = canApprove(
      toGateRow(row),
      context.activeVersion,
      remote ? hashSchemas(extractSchemas(remote.openapi)) : null,
    );
    if (!gate.ok) return fail(gate.reason);
    const updated = await getServiceDb()
      .update(replicateModelVersions)
      .set({ status: "approved", approvedBy: actorId, approvedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(replicateModelVersions.version, version), eq(replicateModelVersions.schemaHash, row.schemaHash ?? "")),
      )
      .returning({ version: replicateModelVersions.version });
    if (!updated.length) return fail("La version a changé pendant l’opération : recharge la page.");
    await recordEvent({
      version,
      event: "approved",
      actorId,
      previousVersion: context.activeVersion,
      schemaHash: row.schemaHash,
    });
    return ok("Version approuvée. Elle n’est pas encore active : confirme l’activation pour l’utiliser.");
  } catch {
    return fail("Replicate est injoignable : la version n’a pas été approuvée.");
  }
}

/** Atomic swap of the active version: only succeeds if it is still `expected` (double click, concurrent admin). */
async function swapActiveVersion(expected: string, next: string): Promise<boolean> {
  const swapped = await getServiceDb()
    .update(audioProviderConfigs)
    .set({ defaultModel: next, updatedAt: new Date() })
    .where(and(eq(audioProviderConfigs.provider, "replicate"), eq(audioProviderConfigs.defaultModel, expected)))
    .returning({ id: audioProviderConfigs.id });
  return swapped.length > 0;
}

export async function activateVersion(
  version: string,
  expectedActive: string,
  actorId: string,
): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  const row = await getRow(version);
  if (!row) return fail("Version inconnue.");
  const gate = canActivate(toGateRow(row), context.activeVersion, expectedActive);
  if (!gate.ok) return fail(gate.reason);
  if (!context.stored) return fail("Enregistre d’abord la configuration Replicate.");
  try {
    const remote = await fetchVersion(context, version);
    if (!remote || hashSchemas(extractSchemas(remote.openapi)) !== row.schemaHash) {
      return fail("Le schéma a changé depuis l’approbation : relance la vérification.");
    }
  } catch {
    return fail("Replicate est injoignable : la version active est inchangée.");
  }
  if (!(await swapActiveVersion(expectedActive, version))) {
    return fail("La version active a changé entre-temps : aucune modification n’a été faite. Recharge la page.");
  }
  const now = new Date();
  const database = getServiceDb();
  // Bookkeeping after the atomic swap; the live "active" flag is derived from the configuration, so a failure
  // here can never leave two versions looking active.
  await database
    .insert(replicateModelVersions)
    .values({
      version: expectedActive,
      status: "superseded",
      activatedAt: new Date(0),
      compatibility: "compatible",
      mp3Validated: true,
    })
    .onConflictDoUpdate({
      target: replicateModelVersions.version,
      set: {
        status: "superseded",
        activatedAt: sql`coalesce(${replicateModelVersions.activatedAt}, 'epoch'::timestamp)`,
        updatedAt: now,
      },
    });
  await database
    .update(replicateModelVersions)
    .set({ status: "approved", activatedBy: actorId, activatedAt: now, updatedAt: now })
    .where(eq(replicateModelVersions.version, version));
  await recordEvent({
    version,
    event: "activated",
    actorId,
    previousVersion: expectedActive,
    schemaHash: row.schemaHash,
  });
  return ok(
    `Version ${version.slice(0, 8)}… activée pour les nouvelles générations. Les générations en cours gardent leur version.`,
  );
}

export async function rollbackVersion(expectedActive: string, actorId: string): Promise<VersionActionResult> {
  const context = await loadReplicate();
  if (!context) return fail("Enregistre d’abord la clé API Replicate.");
  if (expectedActive !== context.activeVersion)
    return fail("La version active a changé entre-temps : recharge la page.");
  const history = await getServiceDb()
    .select()
    .from(replicateModelVersions)
    .where(isNotNull(replicateModelVersions.activatedAt));
  const target = pickRollbackTarget(
    history.map((row) => ({ version: row.version, activatedAt: row.activatedAt, status: row.status as VersionStatus })),
    context.activeVersion,
  );
  if (!target) return fail("Aucune version précédente qualifiée vers laquelle revenir.");
  try {
    if (!(await fetchVersion(context, target))) throw new Error("gone");
  } catch {
    return fail(
      "La version précédente n’est plus disponible sur Replicate : retour arrière impossible, fournisseur à surveiller.",
    );
  }
  if (!(await swapActiveVersion(expectedActive, target))) {
    return fail("La version active a changé entre-temps : aucune modification n’a été faite. Recharge la page.");
  }
  const now = new Date();
  const database = getServiceDb();
  await database
    .update(replicateModelVersions)
    .set({ status: "rolled_back", updatedAt: now })
    .where(eq(replicateModelVersions.version, expectedActive));
  await database
    .update(replicateModelVersions)
    .set({ status: "approved", updatedAt: now })
    .where(eq(replicateModelVersions.version, target));
  await recordEvent({ version: target, event: "rolled_back", actorId, previousVersion: expectedActive });
  return ok(`Retour arrière effectué vers ${target.slice(0, 8)}…. Les chansons déjà générées sont conservées.`);
}

export type VersionOverview = {
  configured: boolean;
  activeVersion: string;
  activeSince: Date | null;
  latestKnown: string | null;
  lastCheckedAt: Date | null;
  rollbackTarget: string | null;
  /** "red" = the last jobs on the active version all failed since its activation. */
  health: "green" | "orange" | "red";
  versions: {
    version: string;
    status: VersionStatus;
    compatibility: Compatibility;
    mp3Validated: boolean;
    probeStatus: ProbeStatus;
    probeError: string | null;
    blockers: string[];
    diff: {
      addedFields: string[];
      removedFields: string[];
      newRequiredFields: string[];
      changedFields: { field: string; changes: string[] }[];
      outputChanged: boolean;
    } | null;
    detectedAt: Date;
    activatedAt: Date | null;
    sourceCreatedAt: Date | null;
  }[];
};

/** Read model of the owner panel. Never throws and never contains a secret. */
export async function getVersionOverview(): Promise<VersionOverview> {
  const empty: VersionOverview = {
    configured: false,
    activeVersion: resolveReplicateVersion(null),
    activeSince: null,
    latestKnown: null,
    lastCheckedAt: null,
    rollbackTarget: null,
    health: "orange",
    versions: [],
  };
  try {
    const database = getServiceDb();
    const [config] = await database
      .select()
      .from(audioProviderConfigs)
      .where(eq(audioProviderConfigs.provider, "replicate"))
      .limit(1);
    const activeVersion = resolveReplicateVersion(config?.defaultModel);
    const rows = await database
      .select()
      .from(replicateModelVersions)
      .orderBy(desc(replicateModelVersions.detectedAt))
      .limit(30);
    const activeRow = rows.find((row) => row.version === activeVersion);
    const activeSince = activeRow?.activatedAt && activeRow.activatedAt.getTime() > 0 ? activeRow.activatedAt : null;
    let health: VersionOverview["health"] = config?.apiKeyCiphertext ? "green" : "orange";
    if (activeSince) {
      const [recent] = await database
        .select({
          completed: sql<number>`count(*) filter (where ${musicGenerationJobs.status} = 'completed')::int`,
          failed: sql<number>`count(*) filter (where ${musicGenerationJobs.status} = 'failed')::int`,
        })
        .from(musicGenerationJobs)
        .where(
          and(
            eq(musicGenerationJobs.provider, "replicate"),
            gte(musicGenerationJobs.createdAt, activeSince),
            inArray(musicGenerationJobs.status, ["completed", "failed"]),
          ),
        );
      if (recent && recent.failed >= 3 && recent.completed === 0) health = "red";
    }
    const candidates = rows.filter((row) => row.version !== activeVersion && row.activatedAt === null);
    return {
      configured: Boolean(config?.apiKeyCiphertext),
      activeVersion,
      activeSince,
      latestKnown: candidates[0]?.version ?? (rows.length ? activeVersion : null),
      lastCheckedAt: rows.reduce<Date | null>(
        (latest, row) => (!latest || row.lastCheckedAt > latest ? row.lastCheckedAt : latest),
        null,
      ),
      rollbackTarget: pickRollbackTarget(
        rows
          .filter((row) => row.activatedAt)
          .map((row) => ({ version: row.version, activatedAt: row.activatedAt, status: row.status as VersionStatus })),
        activeVersion,
      ),
      health,
      versions: rows.map((row) => ({
        version: row.version,
        status: row.status as VersionStatus,
        compatibility: row.compatibility as Compatibility,
        mp3Validated: row.mp3Validated,
        probeStatus: row.probeStatus as ProbeStatus,
        probeError: row.probeError,
        blockers: Array.isArray(asRecord(row.checks)?.blockers) ? (asRecord(row.checks)!.blockers as string[]) : [],
        diff: asRecord(row.diff) as VersionOverview["versions"][number]["diff"],
        detectedAt: row.detectedAt,
        activatedAt: row.activatedAt,
        sourceCreatedAt: row.sourceCreatedAt,
      })),
    };
  } catch {
    return empty;
  }
}
