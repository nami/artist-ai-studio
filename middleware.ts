import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Allow webhook routes to be accessed without authentication
  if (request.nextUrl.pathname.startsWith("/api/generate/webhook")) {
    return NextResponse.next();
  }

  // Allow other API routes to be accessed without authentication
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
