/**
 * Supabase Browser Client
 * 
 * Use this client in Client Components (components with "use client" directive)
 * This client uses the anon key which is safe to expose in the browser.
 * 
 * Usage:
 * ```tsx
 * "use client";
 * import { createClient } from "@/lib/supabase/client";
 * 
 * export function MyComponent() {
 *   const supabase = createClient();
 *   // Use supabase client...
 * }
 * ```
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

