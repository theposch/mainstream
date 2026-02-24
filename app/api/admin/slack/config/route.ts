/**
 * Slack App Configuration API
 *
 * GET  /api/admin/slack/config — return saved app config (client_id, has_secret, from_env)
 * PUT  /api/admin/slack/config — save / update app credentials (client_id + client_secret)
 * DELETE /api/admin/slack/config — remove saved credentials
 *
 * This lets admins configure their Slack OAuth App credentials via the UI instead of
 * requiring SLACK_CLIENT_ID / SLACK_CLIENT_SECRET environment variables.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { encryptToken } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

/** GET /api/admin/slack/config */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // If env vars are set they always win — no need to check DB
  const fromEnv = !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
  if (fromEnv) {
    return NextResponse.json({
      configured: true,
      from_env: true,
      client_id: process.env.SLACK_CLIENT_ID,
      has_secret: true,
    });
  }

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("slack_app_config")
    .select("id, client_id, updated_at")
    .limit(1)
    .maybeSingle();

  if (!data) {
    return NextResponse.json({ configured: false, from_env: false });
  }

  return NextResponse.json({
    configured: true,
    from_env: false,
    client_id: data.client_id,
    has_secret: true,
    updated_at: data.updated_at,
  });
}

/** PUT /api/admin/slack/config */
export async function PUT(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Refuse if credentials are locked to env vars
  if (process.env.SLACK_CLIENT_ID || process.env.SLACK_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Credentials are managed via environment variables and cannot be overridden here." },
      { status: 409 }
    );
  }

  if (!process.env.ENCRYPTION_KEY) {
    return NextResponse.json(
      { error: "ENCRYPTION_KEY is not set. Set it in your environment to enable encrypted storage." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { client_id, client_secret } = body as { client_id?: string; client_secret?: string };

  if (!client_id?.trim()) {
    return NextResponse.json({ error: "client_id is required" }, { status: 400 });
  }
  if (!client_secret?.trim()) {
    return NextResponse.json({ error: "client_secret is required" }, { status: 400 });
  }

  const encryptedSecret = encryptToken(client_secret.trim());

  const supabase = await createAdminClient();

  // Delete any existing row, then insert fresh (simpler than upsert without a known PK)
  await supabase.from("slack_app_config").delete().neq("id", "");
  const { error } = await supabase.from("slack_app_config").insert({
    client_id: client_id.trim(),
    client_secret: encryptedSecret,
  });

  if (error) {
    console.error("[PUT /api/admin/slack/config] DB error:", error);
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** DELETE /api/admin/slack/config */
export async function DELETE() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (process.env.SLACK_CLIENT_ID || process.env.SLACK_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Credentials are managed via environment variables." },
      { status: 409 }
    );
  }

  const supabase = await createAdminClient();
  await supabase.from("slack_app_config").delete().neq("id", "");

  return NextResponse.json({ success: true });
}
