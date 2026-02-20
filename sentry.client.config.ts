/**
 * Sentry client-side configuration
 *
 * Set NEXT_PUBLIC_SENTRY_DSN in your environment to enable error reporting.
 * Without it, Sentry initializes but all calls are no-ops.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Reduce noise: only report errors in production
  enabled: process.env.NODE_ENV === 'production',

  // Sample 100% of errors, 10% of performance traces
  tracesSampleRate: 0.1,

  // Replay 10% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // Mask all text and input by default — important for internal tools
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
