import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This middleware will be used for auth protection once Supabase auth is implemented
// For now, it's a placeholder that allows all requests

export function middleware(request: NextRequest) {
  // TODO: Implement Supabase auth check
  // TODO: Redirect to /login if not authenticated and accessing protected routes
  // TODO: Redirect to /dashboard if authenticated and accessing /login

  return NextResponse.next();
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
