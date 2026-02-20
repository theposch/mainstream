/**
 * Sentry server-side configuration (Node.js runtime)
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
//   dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
//   enabled: process.env.NODE_ENV === 'production',
//   tracesSampleRate: 0.1,
//   debug: process.env.SENTRY_DEBUG === 'true',
// });
export {};
