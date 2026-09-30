import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { buildContentSecurityPolicy } from "./lib/security/headers";
import { LOCALE_HEADER, REQUEST_PATH_HEADER, splitLocalePrefix } from "./lib/languages/locale-path";

export function proxy(request: NextRequest) {
  // `/en/dashboard/songs` → locale "en" + route `/dashboard/songs` (same idea as the `/demo` prefix
  // below). Everything after this point reasons on the un-prefixed route, so the dashboard guard,
  // the demo rewrite and the CSP behave exactly as before. The code itself is validated against the
  // admin language catalog by the page (lib/languages/preference.ts); an unknown code is a 404.
  const { locale, path: pathname } = splitLocalePrefix(request.nextUrl.pathname);

  // A fresh nonce per request, authorizing this request's script-src (see
  // lib/security/headers.ts). Every page under the matcher below must render dynamically for
  // this to exist — Next.js has no per-request context at build time to nonce against.
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-musikpro-demo-route");
  // Never trust client-sent values for these: they are set here from the URL only.
  requestHeaders.delete(LOCALE_HEADER);
  requestHeaders.set(REQUEST_PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  if (locale) requestHeaders.set(LOCALE_HEADER, locale);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the CSP from the *request* header (not just the response) to nonce its own
  // hydration/RSC inline scripts while rendering — both must carry the same value.
  requestHeaders.set("Content-Security-Policy", csp);

  let response: NextResponse;

  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    requestHeaders.set("x-musikpro-demo-route", "1");
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.replace(/^\/demo/, "/dashboard") || "/dashboard";
    response = NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  } else if (locale) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname;
    if (pathname.startsWith("/dashboard") && !getSessionCookie(request)) {
      response = NextResponse.redirect(new URL("/login", request.url));
    } else {
      response = NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
    }
  } else {
    const protectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
    if (protectedPath && !getSessionCookie(request)) {
      response = NextResponse.redirect(new URL("/login", request.url));
    } else {
      response = NextResponse.next({ request: { headers: requestHeaders } });
    }
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Everything except static assets and the Next.js image optimizer — including API routes
  // and prefetch requests, so no request is ever left without a Content-Security-Policy
  // header. Next's own docs suggest skipping prefetch requests as a perf optimization, but
  // this repo's /demo/* rewrite above only exists *because* this middleware runs on every
  // request to it — skipping prefetches 404s the app's own <Link prefetch> navigation.
  // The PWA static files (service worker with its own CSP, offline page, icons) are served as-is.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-192.png|icon-512.png|icon-512-maskable.png|sw.js|offline.html).*)",
  ],
};
