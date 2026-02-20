/**
 * Sentry server-side configuration (Node.js runtime)
 *
 * Set SENTRY_DSN in your environment to enable error reporting.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  // Sample 10% of performance traces — adjust based on volume
  tracesSampleRate: 0.1,

  // Log Sentry SDK debug info in development (set SENTRY_DEBUG=true)
  debug: process.env.SENTRY_DEBUG === 'true',
});
