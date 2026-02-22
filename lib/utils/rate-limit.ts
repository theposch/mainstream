/**
 * In-memory rate limiter for API routes.
 *
 * Suitable for single-server deployments. For multi-instance setups,
 * replace the store with a Redis-backed implementation (e.g. Upstash).
 *
 * Usage:
 * ```ts
 * const result = rateLimit(request, { windowMs: 60_000, max: 10 });
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */

import type { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Sweep expired entries every 5 minutes to prevent unbounded memory growth
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS);
}

export interface RateLimitConfig {
  /** Length of the sliding window in milliseconds */
  windowMs: number;
  /** Maximum number of requests allowed per window */
  max: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request in a new window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.max - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.max) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract the best-effort client IP from a Next.js request.
 * Prefers X-Forwarded-For (set by reverse proxies) over X-Real-IP.
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Convenience wrapper: checks rate limit for a request using the client IP
 * combined with an optional route identifier.
 */
export function rateLimit(
  request: NextRequest,
  config: RateLimitConfig,
  routeKey = '',
): RateLimitResult {
  const ip = getClientIp(request);
  const key = routeKey ? `${routeKey}:${ip}` : ip;
  return checkRateLimit(key, config);
}

// Pre-defined configs for common use cases
export const RATE_LIMITS = {
  /** Heavy operations: uploads, embed creation */
  upload: { windowMs: 60_000, max: 20 },
  /** Write actions: likes, comments, follows */
  write: { windowMs: 60_000, max: 60 },
  /** View/tracking endpoints */
  view: { windowMs: 60_000, max: 120 },
  /** Auth endpoints */
  auth: { windowMs: 15 * 60_000, max: 10 },
  /** Search */
  search: { windowMs: 60_000, max: 60 },
} as const satisfies Record<string, RateLimitConfig>;
