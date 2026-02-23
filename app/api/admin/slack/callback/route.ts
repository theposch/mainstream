/**
 * Slack OAuth — Callback handler
 *
 * GET /api/admin/slack/callback
 * Exchanges the authorization code for a bot token and stores it encrypted.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  encryptToken,
  getBaseUrl,
} from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin?slack_error=unauthorized", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const slackError = searchParams.get("error");

  // Handle user-denied
  if (slackError) {
    return NextResponse.redirect(
      new URL(`/admin?slack_error=${encodeURIComponent(slackError)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin?slack_error=missing_code", request.url));
  }

  // Verify CSRF state
  const cookieState = request.cookies.get("slack_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(new URL("/admin?slack_error=invalid_state", request.url));
  }

  try {
    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/admin/slack/callback`;

    const oauthResult = await exchangeCodeForToken(code, redirectUri);
    const encryptedToken = encryptToken(oauthResult.access_token);

    const supabase = await createAdminClient();

    // Upsert the integration (only one row allowed per workspace_id)
    const { error: upsertError } = await supabase.from("slack_integration").upsert(
      {
        workspace_id: oauthResult.team.id,
        workspace_name: oauthResult.team.name,
        workspace_icon: oauthResult.team.icon?.image_68 ?? null,
        bot_token: encryptedToken,
        bot_user_id: oauthResult.bot_user_id,
        installed_by: admin.id,
      },
      { onConflict: "workspace_id" }
    );

    if (upsertError) {
      console.error("[Slack callback] Upsert error:", upsertError);
      return NextResponse.redirect(new URL("/admin?slack_error=db_error", request.url));
    }

    // Clear the CSRF cookie and redirect to admin panel
    const response = NextResponse.redirect(new URL("/admin?slack_connected=1", request.url));
    response.cookies.delete("slack_oauth_state");
    return response;
  } catch (err) {
    console.error("[Slack callback] Error:", err);
    const errCode = err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return NextResponse.redirect(new URL(`/admin?slack_error=${errCode}`, request.url));
  }
}
