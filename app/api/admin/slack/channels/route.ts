/**
 * Slack Channels API
 *
 * GET /api/admin/slack/channels
 * Returns the list of channels the bot has access to.
 */

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken, listChannels } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const supabase = await createAdminClient();
  const { data: integration } = await supabase
    .from("slack_integration")
    .select("bot_token")
    .limit(1)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Slack is not connected" }, { status: 404 });
  }

  try {
    const botToken = decryptToken(integration.bot_token);
    const channels = await listChannels(botToken);
    return NextResponse.json({ channels });
  } catch (err) {
    console.error("[GET /api/admin/slack/channels] Error:", err);
    return NextResponse.json({ error: "Failed to fetch Slack channels" }, { status: 500 });
  }
}
