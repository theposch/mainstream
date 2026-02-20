import { describe, it, expect } from 'vitest';

// We test the rate-limit logic in isolation by importing the module
// (the setInterval cleanup is benign in test environment)
import { checkRateLimit, RATE_LIMITS } from '../lib/middleware/rate-limit';
import type { NextRequest } from 'next/server';

function makeRequest(ip = '1.2.3.4'): NextRequest {
  return {
    headers: {
      get: (key: string) => {
        if (key === 'x-forwarded-for') return ip;
        return null;
      },
    },
  } as unknown as NextRequest;
}

describe('checkRateLimit', () => {
  const config = { limit: 3, windowMs: 60_000 };

  it('allows requests within the limit', () => {
    const req = makeRequest('10.0.0.1');
    const r1 = checkRateLimit(req, config);
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(req, config);
    expect(r2.success).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(req, config);
    expect(r3.success).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it('blocks requests after limit is reached', () => {
    const req = makeRequest('10.0.0.2');
    checkRateLimit(req, config);
    checkRateLimit(req, config);
    checkRateLimit(req, config);

    const r4 = checkRateLimit(req, config);
    expect(r4.success).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('tracks separate buckets per IP', () => {
    const req1 = makeRequest('10.0.0.3');
    const req2 = makeRequest('10.0.0.4');

    checkRateLimit(req1, config);
    checkRateLimit(req1, config);
    checkRateLimit(req1, config);

    // req2 should still be allowed
    const r = checkRateLimit(req2, config);
    expect(r.success).toBe(true);
  });

  it('returns correct limit value', () => {
    const req = makeRequest('10.0.0.5');
    const result = checkRateLimit(req, config);
    expect(result.limit).toBe(3);
  });

  it('returns a reset timestamp in the future', () => {
    const req = makeRequest('10.0.0.6');
    const result = checkRateLimit(req, config);
    expect(result.reset).toBeGreaterThan(Math.floor(Date.now() / 1_000));
  });

  it('uses custom keyFn when provided', () => {
    const customConfig = { ...config, keyFn: () => 'shared-key' };
    const req1 = makeRequest('10.0.0.7');
    const req2 = makeRequest('10.0.0.8'); // different IP, same custom key

    checkRateLimit(req1, customConfig);
    checkRateLimit(req1, customConfig);
    checkRateLimit(req1, customConfig);

    const r = checkRateLimit(req2, customConfig);
    expect(r.success).toBe(false); // shared key is exhausted
  });
});

describe('RATE_LIMITS constants', () => {
  it('upload limit is 20 per minute', () => {
    expect(RATE_LIMITS.upload.limit).toBe(20);
    expect(RATE_LIMITS.upload.windowMs).toBe(60_000);
  });

  it('aiGenerate limit is lower than upload', () => {
    expect(RATE_LIMITS.aiGenerate.limit).toBeLessThan(RATE_LIMITS.upload.limit);
  });

  it('all configs have required fields', () => {
    for (const [name, cfg] of Object.entries(RATE_LIMITS)) {
      expect(typeof cfg.limit, `${name}.limit`).toBe('number');
      expect(typeof cfg.windowMs, `${name}.windowMs`).toBe('number');
      expect(cfg.limit, `${name}.limit > 0`).toBeGreaterThan(0);
      expect(cfg.windowMs, `${name}.windowMs > 0`).toBeGreaterThan(0);
    }
  });
});
