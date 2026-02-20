/**
 * In-memory sliding-window rate limiter
 *
 * Correct for single-instance deployments (Docker Compose, single PM2 process).
 * For multi-instance: replace the `store` Map with an Upstash Redis or Vercel KV
 * implementation that shares state across instances.
 *
 * Usage in an API route:
 * ```ts
 * import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit';
 *
 * export async function POST(request: NextRequest) {
 *   const rl = checkRateLimit(request, RATE_LIMITS.upload);
 *   if (!rl.success) return rateLimitResponse(rl);
 *   // ...
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface BucketEntry {
  /** Timestamps (ms) of requests inside the current window */
  requests: number[];
}

const store = new Map<string, BucketEntry>();

// Prune stale buckets every 5 minutes to prevent unbounded memory growth
const PRUNE_INTERVAL_MS = 5 * 60 * 1_000;
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 60_000; // 1 minute grace
    for (const [key, entry] of store) {
      if (entry.requests.length === 0 || entry.requests[entry.requests.length - 1] < cutoff) {
        store.delete(key);
      }
    }
  }, PRUNE_INTERVAL_MS).unref?.(); // .unref() so it doesn't keep Node alive
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Maximum requests allowed in `windowMs` */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** How to derive the bucket key from the request. Defaults to IP address. */
  keyFn?: (req: NextRequest) => string;
}

export interface RateLimitResult {
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (seconds) when the oldest request leaves the window */
  reset: number;
  limit: number;
}

// ─── Core ─────────────────────────────────────────────────────────────────────

export function checkRateLimit(req: NextRequest, config: RateLimitConfig): RateLimitResult {
  const { limit, windowMs, keyFn } = config;
  const key = keyFn ? keyFn(req) : getClientIp(req);
  const now = Date.now();
  const windowStart = now - windowMs;

  const entry = store.get(key) ?? { requests: [] };

  // Slide the window — drop requests older than `windowMs`
  entry.requests = entry.requests.filter(ts => ts > windowStart);

  const count = entry.requests.length;
  const remaining = Math.max(0, limit - count - 1);
  const oldestInWindow = entry.requests[0] ?? now;
  const reset = Math.ceil((oldestInWindow + windowMs) / 1_000);

  if (count >= limit) {
    store.set(key, entry);
    return { success: false, remaining: 0, reset, limit };
  }

  entry.requests.push(now);
  store.set(key, entry);
  return { success: true, remaining, reset, limit };
}

// ─── Response helpers ─────────────────────────────────────────────────────────

/** Return a 429 response with standard rate-limit headers */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1_000));
  return NextResponse.json(
    { error: 'Too many requests', retryAfter },
    {
      status: 429,
      headers: buildRateLimitHeaders(result, retryAfter),
    },
  );
}

/** Attach standard rate-limit headers to any NextResponse */
export function withRateLimitHeaders(response: NextResponse, result: RateLimitResult): NextResponse {
  const retryAfter = Math.max(0, result.reset - Math.floor(Date.now() / 1_000));
  const headers = buildRateLimitHeaders(result, retryAfter);
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

function buildRateLimitHeaders(result: RateLimitResult, retryAfter: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
    ...(retryAfter > 0 ? { 'Retry-After': String(retryAfter) } : {}),
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Key function that combines IP + authenticated user ID (requires auth check before calling) */
export function userOrIpKey(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  return `ip:${getClientIp(req)}`;
}

// ─── Pre-configured limits ────────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** File/embed uploads — 20 per minute per IP */
  upload:     { limit: 20,  windowMs: 60_000 } satisfies RateLimitConfig,
  /** AI drop generation — 10 per minute (expensive LLM calls) */
  aiGenerate: { limit: 10,  windowMs: 60_000 } satisfies RateLimitConfig,
  /** Search — 60 per minute */
  search:     { limit: 60,  windowMs: 60_000 } satisfies RateLimitConfig,
  /** General API reads — 120 per minute */
  api:        { limit: 120, windowMs: 60_000 } satisfies RateLimitConfig,
  /** Auth endpoints — 10 per minute (brute-force protection) */
  auth:       { limit: 10,  windowMs: 60_000 } satisfies RateLimitConfig,
} as const;
