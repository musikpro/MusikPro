/**
 * Small request-level guards for first-party mutating endpoints.
 * They complement authentication and Zod validation; they do not replace either.
 */
export function rejectCrossSiteMutation(request: Request): Response | null {
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();
  if (fetchSite === "cross-site") {
    return Response.json({ error: "Cross-site request rejected" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      return Response.json({ error: "Application origin is not configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    return null;
  }

  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(configured).origin;
  } catch {
    return Response.json({ error: "Application origin is invalid" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (origin !== expectedOrigin) {
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}

export function rejectOversizedRequest(request: Request, maxBytes: number): Response | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const length = Number(raw);
  if (!Number.isFinite(length) || length < 0) {
    return Response.json({ error: "Invalid Content-Length" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (length > maxBytes) {
    return Response.json({ error: "Payload too large" }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}

export function requireContentType(request: Request, allowedPrefix: string): Response | null {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith(allowedPrefix.toLowerCase())) {
    return Response.json({ error: "Unsupported media type" }, { status: 415, headers: { "Cache-Control": "no-store" } });
  }
  return null;
}
