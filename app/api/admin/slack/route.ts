/**
 * Admin Slack Integration API
 *
 * GET  /api/admin/slack - Get integration status (workspace info, no token)
 * DELETE /api/admin/slack - Disconnect Slack workspace
 */

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { isSlackConfigured } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/slack
 * Returns whether Slack is configured and, if connected, the workspace info.
 */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const appConfigured = isSlackConfigured();

  if (!appConfigured) {
    return NextResponse.json({ app_configured: false, connected: false });
  }

  const supabase = await createAdminClient();
  const { data: integration } = await supabase
    .from("slack_integration")
    .select("id, workspace_id, workspace_name, workspace_icon, bot_user_id, installed_by, created_at, updated_at")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    app_configured: true,
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
