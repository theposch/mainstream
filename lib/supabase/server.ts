/**
 * Supabase Server Client
 * 
 * Use this client in Server Components, Server Actions, and API Routes.
 * This provides proper cookie handling for server-side auth.
 * 
 * Usage in Server Component:
 * ```tsx
 * import { createClient } from "@/lib/supabase/server";
 * 
 * export default async function Page() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('users').select('*');
 *   return <div>...</div>;
 * }
 * ```
 * 
 * Usage in Route Handler:
 * ```tsx
 * import { createClient } from "@/lib/supabase/server";
 * import { NextResponse } from "next/server";
 * 
 * export async function GET(request: Request) {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('users').select('*');
 *   return NextResponse.json(data);
 * }
 * ```
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Create admin client with service role key
 * Use with caution - this bypasses Row Level Security
 * Only use in server-side code for admin operations
 */
export async function createAdminClient() {
  // Import directly to avoid SSR client issues with service role
  const { createClient } = await import('@supabase/supabase-js');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
