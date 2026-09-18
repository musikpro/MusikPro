import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const protectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (!protectedPath) return NextResponse.next();
  const cookie = getSessionCookie(request);
  if (!cookie) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
