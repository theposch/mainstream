import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     * - api/assets/upload (large file uploads - bypass body limit)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/assets/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

