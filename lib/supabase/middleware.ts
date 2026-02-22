/**
 * Supabase Middleware
 * 
 * This middleware refreshes the user's session and must be run on every request.
 * Place this in your root middleware.ts file.
 * 
 * Usage in middleware.ts:
 * ```tsx
 * import { updateSession } from "@/lib/supabase/middleware";
 * 
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request);
 * }
 * 
 * export const config = {
 *   matcher: [
 *     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
 *   ],
 * };
 * ```
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * CSRF protection for API mutation requests.
 *
 * Verifies that the Origin header matches the application's own origin so that
 * cross-site requests using the user's cookies are rejected.
 * Requests without an Origin header (e.g. server-to-server, curl) are allowed
 * through — they cannot carry browser cookies.
 */
function checkCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  if (!isMutation) return true;

  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith('/api/')) return true;

  // Server-to-server requests won't have an Origin header — allow them through.
  const origin = request.headers.get('origin');
  if (!origin) return true;

  // Compare origin to the application URL.
  const appUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? request.nextUrl.origin
    : null;

  // Build the expected origin from the request itself — this handles any
  // port/domain configuration without requiring an extra env var.
  const expectedOrigin = request.nextUrl.origin;

  return origin === expectedOrigin || (appUrl !== null && origin === appUrl);
}

export async function updateSession(request: NextRequest) {
  // Reject cross-origin mutation requests early
  if (!checkCsrf(request)) {
    return NextResponse.json(
      { error: 'Forbidden: cross-site request rejected' },
      { status: 403 }
    );
  }

  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",              // Landing page
    "/auth/login",    // Login page
    "/auth/signup",   // Signup page
    "/auth/callback", // Auth callback
  ];
  
  const isPublicRoute = publicRoutes.some((route) => pathname === route);
  const isAuthRoute = pathname.startsWith("/auth/");
  const isApiRoute = pathname.startsWith("/api/");

  // Handle API routes - return 401 for unauthorized requests
  if (!user && isApiRoute) {
    const publicApiRoutes = ["/api/auth"];
    const isViewersRoute = /^\/api\/assets\/[^/]+\/viewers/.test(pathname);
    const isPublicApiRoute = isViewersRoute || publicApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (!isPublicApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // Redirect unauthenticated users to login for protected pages
  if (!user && !isPublicRoute && !isAuthRoute && !isApiRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages to home
  if (user && isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

