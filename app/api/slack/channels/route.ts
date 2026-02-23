/**
 * Slack Channels API (public, authenticated)
 *
 * GET /api/slack/channels
 * Returns Slack channels for channel picker UIs. Safe for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken, listChannels } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
    console.error("[GET /api/slack/channels] Error:", err);
    return NextResponse.json({ error: "Failed to fetch Slack channels" }, { status: 500 });
  }
}
