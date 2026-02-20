/**
 * Sentry client-side configuration
 *
 * TODO: Enable once @sentry/nextjs adds Next.js 16 peer-dep support.
 * Steps to re-enable:
 *   1. npm install @sentry/nextjs
 *   2. Wrap next.config.ts export with withSentryConfig(nextConfig, { ... })
 *   3. Uncomment the Sentry.init() block below
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

// import * as Sentry from '@sentry/nextjs';
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   enabled: process.env.NODE_ENV === 'production',
//   tracesSampleRate: 0.1,
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1.0,
//   integrations: [
//     Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
//   ],
// });
export {};
