/**
 * Next.js Instrumentation Hook
 *
 * This file is loaded once by Next.js when the server starts (both in
 * development and production). Use it to register global server-side
 * observability hooks — error reporters, APM agents, etc.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * ── Adding Sentry (when you have a DSN) ────────────────────────────────────
 * 1. npm install @sentry/nextjs
 * 2. Set SENTRY_DSN in your environment / .env
 * 3. Uncomment the Sentry block below and delete the console reporter.
 * ───────────────────────────────────────────────────────────────────────────
 */

export async function register() {
  // Only wire up server-side reporters in the Node.js runtime.
  // The Edge runtime runs this file too, so we guard with the runtime check.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setErrorReporter } = await import("@/lib/logger");

    // ── Sentry (uncomment when DSN is available) ──────────────────────────
    // if (process.env.SENTRY_DSN) {
    //   const Sentry = await import("@sentry/nextjs");
    //   Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 });
    //   setErrorReporter((ctx, msg, err) =>
    //     Sentry.captureException(err ?? new Error(msg), { extra: { ctx } })
    //   );
    //   return;
    // }

    // ── Fallback: structured console error reporter ───────────────────────
    // Until a proper APM tool is configured, emit a structured JSON error
    // line to stdout so log aggregators (Datadog, CloudWatch, etc.) can
    // parse and alert on it.
    setErrorReporter((context, message, error) => {
      const entry = {
        level: "error",
        context,
        message,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error,
        timestamp: new Date().toISOString(),
      };
      // Write to stderr so it's separate from request logs on stdout.
      process.stderr.write(JSON.stringify(entry) + "\n");
    });
  }
}
