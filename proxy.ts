import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-musikpro-demo-route");
  if (pathname === "/demo" || pathname.startsWith("/demo/")) {
    requestHeaders.set("x-musikpro-demo-route", "1");
    const destination = request.nextUrl.clone();
    destination.pathname = pathname.replace(/^\/demo/, "/dashboard") || "/dashboard";
    return NextResponse.rewrite(destination, { request: { headers: requestHeaders } });
  }
  const protectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!protectedPath) return NextResponse.next({ request: { headers: requestHeaders } });
  const cookie = getSessionCookie(request);
  if (!cookie) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/demo/:path*", "/dashboard/:path*", "/admin/:path*"] };
