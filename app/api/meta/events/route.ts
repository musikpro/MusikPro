import { after, NextResponse } from "next/server";
import { sendCapiEvents } from "@/lib/meta-capi/client";
import { buildPageViewEvent, isBotUserAgent, pageUrl } from "@/lib/meta-capi/event";
import { getMetaCapiCredentialsForEvents } from "@/lib/meta-capi/settings";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { rejectCrossSiteMutation, rejectOversizedRequest, requireContentType } from "@/lib/security/request-guards";
import { metaBeaconSchema } from "@/lib/validation/meta-capi";

export const runtime = "nodejs";

const NO_CONTENT = { status: 204, headers: { "Cache-Control": "no-store" } } as const;

function cookieValue(request: Request, name: string): string | null {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Relais « API Conversions » : la balise du navigateur annonce une page vue, le serveur l'envoie à Meta avec l'adresse
 * IP, le user-agent et les cookies _fbp/_fbc (le token ne quitte jamais le serveur). Public mais borné : même origine,
 * JSON validé par Zod, limite par adresse IP, aucune donnée de compte, jamais pour l'administration ni les robots.
 * Répond toujours 204 : un échec de suivi ne doit rien changer pour le visiteur.
 */
export async function POST(request: Request) {
  const originFailure = rejectCrossSiteMutation(request);
  if (originFailure) return originFailure;
  const sizeFailure = rejectOversizedRequest(request, 2 * 1024);
  if (sizeFailure) return sizeFailure;
  const typeFailure = requireContentType(request, "application/json");
  if (typeFailure) return typeFailure;

  const limit = await rateLimit(`meta-capi:${clientIp(request)}`, 60, 60);
  if (!limit.success) return new NextResponse(null, NO_CONTENT);

  const parsed = metaBeaconSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const userAgent = request.headers.get("user-agent");
  if (isBotUserAgent(userAgent)) return new NextResponse(null, NO_CONTENT);

  const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || new URL(request.url).origin;
  const url = pageUrl(origin, parsed.data.path);
  if (!url) return new NextResponse(null, NO_CONTENT);

  const event = buildPageViewEvent({
    eventId: parsed.data.eventId,
    url,
    ip: clientIp(request),
    userAgent,
    fbp: cookieValue(request, "_fbp"),
    fbc: cookieValue(request, "_fbc"),
  });
  after(async () => {
    const credentials = await getMetaCapiCredentialsForEvents().catch(() => undefined);
    if (!credentials) return;
    await sendCapiEvents({
      pixelId: credentials.pixelId,
      token: credentials.token,
      events: [event],
      testEventCode: credentials.testEventCode,
    });
  });
  return new NextResponse(null, NO_CONTENT);
}
