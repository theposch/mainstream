/**
 * Server-only environment validation
 * 
 * This file is imported in a server component to ensure
 * environment validation only runs on the server, avoiding
 * hydration mismatches.
 */

import { validateEnvironment } from "@/lib/utils/env-validation";

// Validate environment variables (server-side only)
// This runs during server-side rendering, not during client hydration
if (typeof window === 'undefined') {
  validateEnvironment();
}

