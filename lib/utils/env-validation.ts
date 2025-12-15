/**
 * Environment Variable Validation
 * 
 * Validates that all required environment variables are set at startup.
 * Throws an error in development or logs a warning in production.
 * 
 * Usage:
 * Import this module early in the application lifecycle (e.g., in layout.tsx)
 * to catch missing environment variables before they cause runtime errors.
 */

interface EnvConfig {
  name: string;
  required: boolean;
  description: string;
}

/**
 * Required environment variables for the application to function
 */
const REQUIRED_ENV_VARS: EnvConfig[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous/public key',
  },
];

/**
 * Server-only environment variables (checked only on server)
 */
const SERVER_ONLY_ENV_VARS: EnvConfig[] = [
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key for admin operations',
  },
];

/**
 * Optional environment variables (logged as warning if missing)
 */
const OPTIONAL_ENV_VARS: EnvConfig[] = [
  {
    name: 'ENCRYPTION_KEY',
    required: false,
    description: 'AES-256 encryption key for sensitive data (64 hex chars)',
  },
  {
    name: 'RESEND_API_KEY',
    required: false,
    description: 'Resend API key for email notifications',
  },
  {
    name: 'LITELLM_BASE_URL',
    required: false,
    description: 'LiteLLM API base URL for AI features',
  },
  {
    name: 'LITELLM_API_KEY',
    required: false,
    description: 'LiteLLM API key for AI features',
  },
];

/**
 * Validates environment variables and returns validation results
 */
function validateEnvVars(): { 
  missing: EnvConfig[]; 
  warnings: EnvConfig[];
  valid: boolean;
} {
  const isServer = typeof window === 'undefined';
  const missing: EnvConfig[] = [];
  const warnings: EnvConfig[] = [];

  // Check required public env vars
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar.name]) {
      missing.push(envVar);
    }
  }

  // Check server-only env vars (only on server)
  if (isServer) {
    for (const envVar of SERVER_ONLY_ENV_VARS) {
      if (!process.env[envVar.name]) {
        missing.push(envVar);
      }
    }
  }

  // Check optional env vars for warnings
  for (const envVar of OPTIONAL_ENV_VARS) {
    if (!process.env[envVar.name]) {
      warnings.push(envVar);
    }
  }

  return {
    missing,
    warnings,
    valid: missing.length === 0,
  };
}

/**
 * Validates environment variables and logs/throws errors as appropriate.
 * Call this function early in the application lifecycle.
 * 
 * In development: throws an error if required vars are missing
 * In production: logs an error but continues (to avoid crash loops)
 */
export function validateEnvironment(): void {
  const { missing, warnings, valid } = validateEnvVars();
  const isDev = process.env.NODE_ENV === 'development';
  const isServer = typeof window === 'undefined';

  // Only run validation on server to avoid hydration mismatches
  if (!isServer) return;

  // Log warnings for optional env vars
  if (warnings.length > 0) {
    console.warn(
      '[env] Optional environment variables not set:',
      warnings.map(v => `\n  - ${v.name}: ${v.description}`).join('')
    );
  }

  // Handle missing required env vars
  if (!valid) {
    const errorMessage = 
      `Missing required environment variables:` +
      missing.map(v => `\n  - ${v.name}: ${v.description}`).join('');

    if (isDev) {
      // In development, throw to make the issue obvious
      throw new Error(errorMessage);
    } else {
      // In production, log error but don't crash
      console.error('[env] CRITICAL:', errorMessage);
    }
  }
}

// Auto-validate on import (server-side only)
if (typeof window === 'undefined') {
  validateEnvironment();
}

