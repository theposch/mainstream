/**
 * Logger Abstraction
 * 
 * Centralized logging utility that provides:
 * - Consistent log formatting across the application
 * - Environment-aware logging (debug only in development)
 * - Structured log entries with context
 * - Extensible for future error tracking integration
 * 
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('ComponentName', 'Rendering with props', { prop1: value1 });
 * logger.info('API', 'Request completed', { duration: 150 });
 * logger.warn('Hook', 'Deprecated usage detected');
 * logger.error('Service', 'Operation failed', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  timestamp: string;
}

const isDev = process.env.NODE_ENV === 'development';
const isServer = typeof window === 'undefined';

/**
 * Format a log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const prefix = `[${entry.context}]`;
  return prefix;
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel, 
  context: string, 
  message: string, 
  data?: unknown
): LogEntry {
  return {
    level,
    context,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Logger interface for consistent logging across the application
 */
export const logger = {
  /**
   * Debug level - only outputs in development
   * Use for detailed debugging information
   */
  debug(context: string, message: string, data?: unknown) {
    if (isDev) {
      const entry = createLogEntry('debug', context, message, data);
      console.debug(formatLogEntry(entry), message, data ?? '');
    }
  },
  
  /**
   * Info level - general information
   * Use for tracking normal operations
   */
  info(context: string, message: string, data?: unknown) {
    const entry = createLogEntry('info', context, message, data);
    console.info(formatLogEntry(entry), message, data ?? '');
  },
  
  /**
   * Warn level - warning messages
   * Use for potentially problematic situations
   */
  warn(context: string, message: string, data?: unknown) {
    const entry = createLogEntry('warn', context, message, data);
    console.warn(formatLogEntry(entry), message, data ?? '');
  },
  
  /**
   * Error level - error messages
   * Use for errors that need attention
   */
  error(context: string, message: string, error?: unknown) {
    const entry = createLogEntry('error', context, message, error);
    console.error(formatLogEntry(entry), message, error ?? '');
    
    // Future: Send to error tracking service in production
    // if (!isDev && !isServer) {
    //   sendToErrorTracker(entry);
    // }
  },
  
  /**
   * Log API request (info level in production, debug in development)
   * Use for tracking API calls and their results
   */
  api(context: string, method: string, url: string, data?: unknown) {
    if (isDev) {
      const entry = createLogEntry('debug', context, `${method} ${url}`, data);
      console.debug(formatLogEntry(entry), `${method} ${url}`, data ?? '');
    }
  },
  
  /**
   * Log performance timing
   * Use for tracking operation durations
   */
  perf(context: string, operation: string, durationMs: number) {
    if (isDev) {
      const entry = createLogEntry('debug', context, `${operation} completed`, { durationMs });
      console.debug(formatLogEntry(entry), `${operation} completed in ${durationMs}ms`);
    }
  },
};

/**
 * Create a scoped logger for a specific context
 * Useful when a component/hook makes many log calls
 * 
 * Usage:
 * ```ts
 * const log = createScopedLogger('useMyHook');
 * log.debug('Initializing');
 * log.error('Operation failed', error);
 * ```
 */
export function createScopedLogger(context: string) {
  return {
    debug: (message: string, data?: unknown) => logger.debug(context, message, data),
    info: (message: string, data?: unknown) => logger.info(context, message, data),
    warn: (message: string, data?: unknown) => logger.warn(context, message, data),
    error: (message: string, error?: unknown) => logger.error(context, message, error),
    api: (method: string, url: string, data?: unknown) => logger.api(context, method, url, data),
    perf: (operation: string, durationMs: number) => logger.perf(context, operation, durationMs),
  };
}

