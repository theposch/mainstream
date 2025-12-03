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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
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

  // Protect auth routes - redirect to login if not authenticated
  if (!user && request.nextUrl.pathname.startsWith("/api/")) {
    // Allow public API routes
    const publicRoutes = ["/api/auth"];
    // Also allow viewers endpoint (public data)
    const isViewersRoute = /^\/api\/assets\/[^/]+\/viewers/.test(request.nextUrl.pathname);
    const isPublicRoute = isViewersRoute || publicRoutes.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    );

    if (!isPublicRoute) {
      // Return 401 for API routes
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // Optional: Protect dashboard/profile routes
  // const protectedRoutes = ['/dashboard', '/settings', '/profile'];
  // if (!user && protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))) {
  //   const redirectUrl = request.nextUrl.clone();
  //   redirectUrl.pathname = '/login';
  //   redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
  //   return NextResponse.redirect(redirectUrl);
  // }

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

