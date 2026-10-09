import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure helpers of the Replicate integration (skill: .claude/skills/Replicate-MusikPro-MP3-SKILL.md).
 * No network, no secret, no `server-only`: everything here is unit-tested. The HTTP side lives in replicate.ts.
 */
export const REPLICATE_API_BASE = "https://api.replicate.com/v1";
export const REPLICATE_MODEL = "fishaudio/ace-step-1.5";
/** Version validated against the official schema on 2026-10-09. Changing it is an explicit admin decision. */
export const REPLICATE_DEFAULT_VERSION = "74e3a7d383b18815e277de5223f5fe9d53d38832de15aa567fe729fa129d0d85";

const VERSION_PATTERN = /^[a-f0-9]{64}$/;
const PREDICTION_ID_PATTERN = /^[A-Za-z0-9]{1,64}$/;

/** The admin's "model" field holds the version hash; anything that is not a hash falls back to the validated one. */
export function resolveReplicateVersion(configured: string | null | undefined): string {
  const value = (configured ?? "").trim().toLowerCase();
  return VERSION_PATTERN.test(value) ? value : REPLICATE_DEFAULT_VERSION;
}

export function isReplicatePredictionId(value: unknown): value is string {
  return typeof value === "string" && PREDICTION_ID_PATTERN.test(value);
}

const MAX_PROMPT_CHARS = 512;
const MAX_LYRICS_CHARS = 4_096;
const INSTRUMENTAL_LYRICS = "[Instrumental]";

/** Cuts at a word boundary so a long style prompt never exceeds the model's field limits. */
function clip(value: string | null | undefined, max: number) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), Math.floor(max * 0.6))).trim();
}

export type ReplicateSongInput = {
  lyrics: string | null;
  style: string | null;
  instrumental: boolean;
};

/**
 * Model input. `audio_format` is set here and nowhere else: no caller-provided value can reach the
 * request (a forged "mp4"/"wav" is simply not part of ReplicateSongInput), and older model versions
 * default to another format, so it is never left implicit. `duration: -1` lets the model size the song
 * from the lyrics instead of padding short lyrics up to a fixed length.
 */
export function buildReplicateInput(input: ReplicateSongInput): Record<string, unknown> {
  const lyrics = input.instrumental ? INSTRUMENTAL_LYRICS : (input.lyrics ?? "").trim().slice(0, MAX_LYRICS_CHARS);
  return {
    prompt: clip(input.style, MAX_PROMPT_CHARS) || "song",
    lyrics: lyrics || INSTRUMENTAL_LYRICS,
    duration: -1,
    time_signature: "auto",
    inference_steps: 8,
    guidance_scale: 7,
    shift: 3,
    seed: -1,
    thinking: true,
    batch_size: 1,
    audio_format: "mp3",
  };
}

/**
 * Only Replicate's own delivery hosts are ever fetched or stored: exact `replicate.delivery` or a real
 * subdomain of it (a lookalike such as `replicate.delivery.evil.example` or `evilreplicate.delivery` fails).
 */
export function isReplicateDeliveryUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return host === "replicate.delivery" || host.endsWith(".replicate.delivery");
  } catch {
    return false;
  }
}

/** First valid delivery URL of a prediction's `output` (an array of files, or a single URL string). */
export function pickReplicateOutputUrl(output: unknown): string | null {
  const candidates = Array.isArray(output) ? output : [output];
  return candidates.find(isReplicateDeliveryUrl) ?? null;
}

const SIGNATURE_TOLERANCE_SECONDS = 300;

/**
 * Standard Webhooks signature used by Replicate: HMAC-SHA256 (base64) of `${id}.${timestamp}.${rawBody}`
 * with the key behind the `whsec_` secret, compared in constant time, inside a 5-minute replay window.
 */
export function verifyReplicateWebhookSignature(args: {
  rawBody: string;
  headers: Headers;
  webhookSecret: string;
  nowSeconds?: number;
}): boolean {
  const id = args.headers.get("webhook-id");
  const timestamp = args.headers.get("webhook-timestamp");
  const signatureHeader = args.headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader || !/^\d{1,12}$/.test(timestamp)) return false;
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;
  if (!args.webhookSecret.startsWith("whsec_")) return false;
  const key = Buffer.from(args.webhookSecret.slice("whsec_".length), "base64");
  if (!key.length) return false;
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${args.rawBody}`, "utf8").digest();
  return signatureHeader.split(" ").some((part) => {
    if (!part.startsWith("v1,")) return false;
    const actual = Buffer.from(part.slice(3), "base64");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
