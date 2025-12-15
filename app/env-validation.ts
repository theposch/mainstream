/**
 * Server-only environment validation
 * 
 * This file is imported by the root layout (a server component).
 * The validation runs during server-side module evaluation, not client hydration.
 * The window check is a safeguard against any edge cases.
 */

import { validateEnvironment } from "@/lib/utils/env-validation";

// Only validate on server (window is undefined on server)
if (typeof window === 'undefined') {
  validateEnvironment();
}

