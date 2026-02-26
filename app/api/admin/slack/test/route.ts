/**
 * Slack Test Message API
 *
 * POST /api/admin/slack/test
 * Sends a test message to the specified channel to verify the integration works.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptToken, postMessage } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { channel_id } = body as { channel_id?: string };

  if (!channel_id?.trim()) {
    return NextResponse.json({ error: "channel_id is required" }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const { data: integration } = await supabase
    .from("slack_integration")
    .select("bot_token, workspace_name")
    .limit(1)
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Slack workspace is not connected" }, { status: 404 });
  }

  try {
    const botToken = decryptToken(integration.bot_token);
    await postMessage(botToken, channel_id.trim(), {
      text: `✅ Mainstream is connected to *${integration.workspace_name}*! Notifications are working correctly.`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `✅ *Mainstream* is connected to *${integration.workspace_name}*!\n\nThis test message confirms that Slack notifications are configured correctly.`,
          },
        },
      ],
      unfurl_links: false,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[POST /api/admin/slack/test] Error:", err);
    return NextResponse.json(
      { error: `Failed to send test message: ${message}` },
      { status: 500 }
    );
  }
}
