/**
 * Admin Slack Integration API
 *
 * GET    /api/admin/slack - Full integration status (credentials + workspace)
 * DELETE /api/admin/slack - Disconnect the Slack workspace
 */

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/slack
 *
 * Returns:
 *   credentials_configured  — true if app credentials exist (env or DB)
 *   credentials_from_env    — true if they come from environment variables (cannot be edited via UI)
 *   app_config              — { client_id } when stored in DB
 *   connected               — true if a workspace OAuth token is stored
 *   integration             — workspace info (no bot_token exposed)
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createAdminClient();

  // ── Credentials check ──────────────────────────────────────────────────────
  const fromEnv = !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
  let credentialsConfigured = fromEnv;
  let appConfig: { client_id: string; updated_at?: string } | null = null;

  if (!fromEnv) {
    const { data: dbConfig } = await supabase
      .from("slack_app_config")
      .select("client_id, updated_at")
      .limit(1)
      .maybeSingle();

    if (dbConfig) {
      credentialsConfigured = true;
      appConfig = dbConfig;
    }
  }

  // ── Workspace connection check ─────────────────────────────────────────────
  const { data: integration } = await supabase
    .from("slack_integration")
    .select("id, workspace_id, workspace_name, workspace_icon, bot_user_id, installed_by, created_at, updated_at")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    credentials_configured: credentialsConfigured,
    credentials_from_env: fromEnv,
    app_config: fromEnv ? null : appConfig,
    connected: !!integration,
    integration: integration ?? null,
  });
}

/**
 * DELETE /api/admin/slack
 * Disconnects the Slack workspace by deleting the integration record.
 */
export async function DELETE() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createAdminClient();
  const { error } = await supabase.from("slack_integration").delete().neq("id", "");

  if (error) {
    console.error("[DELETE /api/admin/slack] Error:", error);
    return NextResponse.json({ error: "Failed to disconnect Slack" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ─── Shared helper for connect + callback routes ───────────────────────────────

/**
 * Fetch stored app credentials from the database (returns null if not set).
 * Used by connect and callback routes when env vars are absent.
 */
export async function getDbSlackCredentials(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createAdminClient>>
) {
  const { data } = await supabase
    .from("slack_app_config")
    .select("client_id, client_secret")
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    clientId: data.client_id,
    clientSecret: decryptToken(data.client_secret),
  };
}
