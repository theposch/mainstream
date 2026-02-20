/**
 * Logger — structured, production-ready
 *
 * - Development: human-readable output
 * - Production:  JSON lines to stdout (parseable by Datadog, Splunk, CloudWatch, Loki, etc.)
 * - Test:        silent by default
 *
 * Usage:
 * ```ts
 * import { logger, createScopedLogger } from '@/lib/logger';
 *
 * logger.info('UploadRoute', 'Asset created', { assetId, userId });
 * logger.error('UploadRoute', 'Sharp processing failed', error);
 *
 * // Scoped (preferred for files with many log calls):
 * const log = createScopedLogger('UploadRoute');
 * log.info('Processing image');
 * log.error('Sharp failed', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
}

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
  data?: unknown;
  error?: SerializedError;
  durationMs?: number;
  http?: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
  };
}

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

function serializeError(err: unknown): SerializedError | undefined {
  if (err === undefined || err === null) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      // In production keep stacks short; in dev show everything
      stack: isDev ? err.stack : err.stack?.split('\n').slice(0, 5).join('\n'),
      code: (err as NodeJS.ErrnoException).code,
    };
  }
  if (typeof err === 'object') {
    return { name: 'UnknownError', message: JSON.stringify(err) };
  }
  return { name: 'UnknownError', message: String(err) };
}

function emit(entry: LogEntry): void {
  if (isTest) return;

  if (isDev) {
    const time = entry.timestamp.split('T')[1].split('.')[0];
    const prefix = `[${time}] [${entry.level.toUpperCase().padEnd(5)}] [${entry.context}]`;
    const fn =
      entry.level === 'error' ? console.error
      : entry.level === 'warn'  ? console.warn
      : entry.level === 'debug' ? console.debug
      : console.info;

    if (entry.http) {
      fn(prefix, `${entry.http.method} ${entry.http.path} → ${entry.http.status} (${entry.http.durationMs}ms)`);
    } else if (entry.error) {
      fn(prefix, entry.message, entry.error);
    } else if (entry.data !== undefined) {
      fn(prefix, entry.message, entry.data);
    } else {
      fn(prefix, entry.message);
    }
  } else {
    // One JSON object per line — compatible with all major log aggregators
    process.stdout.write(JSON.stringify(entry) + '\n');
  }
}

function makeEntry(level: LogLevel, context: string, message: string): LogEntry {
  return { level, context, message, timestamp: new Date().toISOString() };
}

export const logger = {
  /** Verbose — suppressed in production */
  debug(context: string, message: string, data?: unknown): void {
    if (!isDev) return;
    emit({ ...makeEntry('debug', context, message), data });
  },

  /** General operational events */
  info(context: string, message: string, data?: unknown): void {
    emit({ ...makeEntry('info', context, message), data });
  },

  /** Recoverable issues that need attention */
  warn(context: string, message: string, data?: unknown): void {
    emit({ ...makeEntry('warn', context, message), data });
  },

  /** Errors — always emitted with full stack trace */
  error(context: string, message: string, error?: unknown): void {
    emit({ ...makeEntry('error', context, message), error: serializeError(error) });
  },

  /**
   * HTTP request completion. Level is inferred from status code.
   * Call once per API route handler, at the end.
   */
  request(
    context: string,
    method: string,
    path: string,
    status: number,
    durationMs: number,
    data?: unknown,
  ): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    emit({
      ...makeEntry(level, context, `${method} ${path} ${status}`),
      data,
      http: { method, path, status, durationMs },
    });
  },

  /** Performance timing — always emitted (useful for SLA tracking) */
  perf(context: string, operation: string, durationMs: number): void {
    emit({ ...makeEntry('info', context, `${operation} completed`), durationMs });
  },
};

/**
 * Create a logger scoped to a specific context (route, service, hook, etc.)
 * Preferred when a module makes many log calls.
 */
export function createScopedLogger(context: string) {
  return {
    debug:   (message: string, data?: unknown)   => logger.debug(context, message, data),
    info:    (message: string, data?: unknown)   => logger.info(context, message, data),
    warn:    (message: string, data?: unknown)   => logger.warn(context, message, data),
    error:   (message: string, error?: unknown)  => logger.error(context, message, error),
    perf:    (operation: string, ms: number)     => logger.perf(context, operation, ms),
    request: (method: string, path: string, status: number, ms: number, data?: unknown) =>
      logger.request(context, method, path, status, ms, data),
  };
}
