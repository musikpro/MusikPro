import "server-only";

import { META_GRAPH_VERSION, type MetaServerEvent } from "./event";

const GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`;
const TIMEOUT_MS = 5000;

export type CapiResult<T = object> = ({ ok: true } & T) | { ok: false; message: string };

type MetaError = { error?: { message?: string; code?: number; error_user_msg?: string } };

function failure(status: number, body: unknown): { ok: false; message: string } {
  const meta = (body as MetaError | null)?.error;
  const detail = meta?.error_user_msg || meta?.message;
  return {
    ok: false,
    message: detail
      ? `Meta a refusé la requête : ${detail}${meta?.code ? ` (code ${meta.code})` : ""}`
      : `Meta a répondu avec une erreur HTTP ${status}.`,
  };
}

/**
 * Envoie des événements à l'API Conversions. Le token passe dans le corps de la requête (jamais dans l'URL, qui
 * apparaîtrait dans les traces) et n'est jamais repris dans un message d'erreur.
 */
export async function sendCapiEvents(input: {
  pixelId: string;
  token: string;
  events: MetaServerEvent[];
  testEventCode?: string | null;
}): Promise<CapiResult<{ eventsReceived: number; fbtraceId: string | null }>> {
  try {
    const response = await fetch(`${GRAPH}/${encodeURIComponent(input.pixelId)}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: input.events,
        access_token: input.token,
        ...(input.testEventCode ? { test_event_code: input.testEventCode } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as {
      events_received?: number;
      fbtrace_id?: string;
    } | null;
    if (!response.ok) return failure(response.status, body);
    return { ok: true, eventsReceived: body?.events_received ?? 0, fbtraceId: body?.fbtrace_id ?? null };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, message: timeout ? "Meta n'a pas répondu à temps." : "Impossible de joindre Meta." };
  }
}

/** Vérifie l'ID et le token sans créer d'événement : lit le nom du jeu de données. */
export async function verifyCapiConnection(input: {
  pixelId: string;
  token: string;
}): Promise<CapiResult<{ datasetName: string | null }>> {
  try {
    const response = await fetch(`${GRAPH}/${encodeURIComponent(input.pixelId)}?fields=id,name`, {
      headers: { Authorization: `OAuth ${input.token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as { name?: string } | null;
    if (!response.ok) return failure(response.status, body);
    return { ok: true, datasetName: body?.name ?? null };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return { ok: false, message: timeout ? "Meta n'a pas répondu à temps." : "Impossible de joindre Meta." };
  }
}
