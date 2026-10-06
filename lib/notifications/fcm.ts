import "server-only";

import { createSign } from "node:crypto";
import { z } from "zod";
import { createLogger } from "@/lib/observability/logger";

const logger = createLogger("fcm");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TIMEOUT_MS = 8_000;

const serviceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().min(1),
});
type ServiceAccount = z.infer<typeof serviceAccountSchema>;

export type PushMessage = { title: string; body: string; href?: string | null };
export type PushOutcome = { sent: number; invalidTokens: string[] };

let cachedAccount: ServiceAccount | null | undefined;
let cachedToken: { value: string; expiresAt: number } | null = null;

/** Compte de service Firebase (variable serveur `FIREBASE_SERVICE_ACCOUNT_JSON`), ou null si non configuré. */
function serviceAccount(): ServiceAccount | null {
  if (cachedAccount !== undefined) return cachedAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return (cachedAccount = null);
  try {
    const parsed = serviceAccountSchema.safeParse(JSON.parse(raw));
    cachedAccount = parsed.success
      ? { ...parsed.data, private_key: parsed.data.private_key.replace(/\\n/g, "\n") }
      : null;
  } catch {
    cachedAccount = null;
  }
  if (!cachedAccount) logger.error("FIREBASE_SERVICE_ACCOUNT_JSON invalide : notifications push désactivées");
  return cachedAccount;
}

export function isPushConfigured(): boolean {
  return serviceAccount() !== null;
}

const base64Url = (value: Buffer | string) => Buffer.from(value).toString("base64url");

function signAssertion(account: ServiceAccount, nowSeconds: number): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key);
  return `${header}.${claims}.${base64Url(signature)}`;
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.value;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signAssertion(account, Math.floor(now / 1000)),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`oauth_${response.status}`);
  const data = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await response.json());
  cachedToken = { value: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

/** Erreurs FCM signifiant que le jeton ne servira plus jamais (appareil désinstallé, jeton périmé). */
function isDeadToken(status: number, body: unknown): boolean {
  if (status === 404) return true;
  const text = JSON.stringify(body ?? {});
  return (
    text.includes("UNREGISTERED") ||
    (status === 400 && text.includes("INVALID_ARGUMENT") && text.includes("registration token"))
  );
}

/**
 * Envoie une notification à des jetons Firebase (API HTTP v1). Ne lève jamais : renvoie le nombre d'envois réussis et
 * les jetons à supprimer. Sans compte de service configuré, ne fait rien.
 */
export async function sendPush(tokens: string[], message: PushMessage): Promise<PushOutcome> {
  const outcome: PushOutcome = { sent: 0, invalidTokens: [] };
  const account = serviceAccount();
  if (!account || tokens.length === 0) return outcome;
  try {
    const bearer = await accessToken(account);
    await Promise.all(
      tokens.map(async (token) => {
        try {
          const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
            method: "POST",
            headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              message: {
                token,
                notification: { title: message.title, body: message.body },
                data: message.href ? { href: message.href } : {},
                android: { priority: "HIGH", notification: { channel_id: "default" } },
              },
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS),
          });
          if (response.ok) outcome.sent += 1;
          else if (isDeadToken(response.status, await response.json().catch(() => null)))
            outcome.invalidTokens.push(token);
          else logger.error("fcm send refused", { status: response.status });
        } catch (error) {
          logger.error("fcm send failed", { error: error instanceof Error ? error.message : String(error) });
        }
      }),
    );
  } catch (error) {
    cachedToken = null;
    logger.error("fcm auth failed", { error: error instanceof Error ? error.message : String(error) });
  }
  return outcome;
}

/** Réinitialise le cache (tests). */
export function resetFcmCache(): void {
  cachedAccount = undefined;
  cachedToken = null;
}
