import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthenticatedFromRequest } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

// Static assets to ignore
const IGNORED_PREFIXES = ["/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (IGNORED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  // Check authentication
  const authenticated = isAuthenticatedFromRequest(request);

  if (!authenticated) {
    // For API routes, return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For pages, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
