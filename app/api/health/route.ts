/**
 * GET /api/health
 *
 * Liveness + readiness probe for load balancers, container orchestrators,
 * and uptime monitors.
 *
 * Returns 200 when the app is healthy, 503 when the database is unreachable.
 *
 * Response shape:
 * ```json
 * {
 *   "status": "ok",
 *   "timestamp": "2025-01-01T00:00:00.000Z",
 *   "version": "0.1.0",
 *   "checks": {
 *     "database": { "status": "ok", "latencyMs": 12 }
 *   }
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VERSION = process.env.npm_package_version ?? 'unknown';

interface CheckResult {
  status: 'ok' | 'error';
  latencyMs?: number;
  error?: string;
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = await createClient();
    // Lightweight ping — count returns immediately without a full table scan
    const { error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;
    return { status: 'ok', latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown database error',
    };
  }
}

export async function GET() {
  const [database] = await Promise.all([checkDatabase()]);

  const allOk = database.status === 'ok';

  const body = {
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: VERSION,
    checks: { database },
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
