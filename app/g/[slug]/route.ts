import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { FUNNEL_EVENT, writeFunnelEvent } from "@/lib/analytics/funnel";
import {
  GUEST_COOKIE,
  GUEST_COOKIE_MAX_AGE_SECONDS,
  buildGuestCookieValue,
  guestEntryPath,
  parseGuestCookie,
} from "@/lib/guest/access";
import { extractGuestTracking } from "@/lib/guest/tracking";
import { getPublicGuestLinkBySlug } from "@/lib/guest-links/server";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { guestLinkSlugSchema } from "@/lib/validation/guest-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENTRIES_PER_MINUTE_PER_IP = 120;

const NO_STORE = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } as const;

function notFound() {
  return new NextResponse("Lien introuvable.", {
    status: 404,
    headers: { ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" },
  });
}

/**
 * Entrée publique du mode invité (publicités) : `/g/<slug>`. Si le lien existe, est actif et n'est pas en corbeille,
 * pose le cookie invité (identifiant aléatoire, aucune donnée personnelle) et redirige vers la destination choisie par le
 * propriétaire (formulaire de création ou accueil invité), lue en base à chaque visite. Sinon : 404 identique pour un lien
 * inconnu, désactivé ou supprimé. Aucune session ni donnée de compte n'est créée.
 */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const slug = guestLinkSlugSchema.safeParse((await context.params).slug);
  if (!slug.success) return notFound();

  const limit = await rateLimit(`guest-entry:${clientIp(request)}`, ENTRIES_PER_MINUTE_PER_IP);
  if (limit.backend === "unavailable") {
    return new NextResponse("Service momentanément indisponible.", { status: 503, headers: NO_STORE });
  }
  if (!limit.success) return new NextResponse("Trop de requêtes.", { status: 429, headers: NO_STORE });

  const link = await getPublicGuestLinkBySlug(slug.data);
  if (!link) return notFound();

  const url = new URL(request.url);
  const previous = parseGuestCookie(request.headers.get("cookie")?.match(new RegExp(`${GUEST_COOKIE}=([^;]+)`))?.[1]);
  const visitorId = previous?.visitorId ?? randomUUID();

  await writeFunnelEvent({
    event: FUNNEL_EVENT.GUEST_ENTRY,
    metadata: {
      linkId: link.id,
      slug: link.slug,
      destination: link.destination,
      returning: Boolean(previous),
      ...extractGuestTracking(url.searchParams, request.headers.get("referer")),
    },
  });

  const response = NextResponse.redirect(new URL(guestEntryPath(link.destination), request.url), 302);
  response.cookies.set(GUEST_COOKIE, buildGuestCookieValue(link.id, visitorId), {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
