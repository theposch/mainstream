/**
 * Slack OAuth — Callback handler
 *
 * GET /api/admin/slack/callback
 * Exchanges the authorization code for a bot token and stores it encrypted.
 * Uses env-var credentials first, falls back to DB-stored credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  exchangeCodeForToken,
  encryptToken,
  getBaseUrl,
  decryptToken,
  type SlackCredentials,
} from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

async function resolveDbCredentials(): Promise<SlackCredentials | null> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("slack_app_config")
    .select("client_id, client_secret")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { clientId: data.client_id, clientSecret: decryptToken(data.client_secret) };
}

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.redirect(new URL("/admin?slack_error=unauthorized", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const slackError = searchParams.get("error");

  if (slackError) {
    return NextResponse.redirect(
      new URL(`/admin?slack_error=${encodeURIComponent(slackError)}&tab=slack`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin?slack_error=missing_code&tab=slack", request.url));
  }

  const cookieState = request.cookies.get("slack_oauth_state")?.value;
  if (!cookieState || cookieState !== state) {
    return NextResponse.redirect(
      new URL("/admin?slack_error=invalid_state&tab=slack", request.url)
    );
  }

  try {
    // Resolve credentials
    let dbCreds: SlackCredentials | null = null;
    const hasEnvCreds = !!(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
    if (!hasEnvCreds) {
      dbCreds = await resolveDbCredentials();
      if (!dbCreds) {
        return NextResponse.redirect(
          new URL("/admin?slack_error=no_credentials&tab=slack", request.url)
        );
      }
    }

    const baseUrl = getBaseUrl(request);
    const redirectUri = `${baseUrl}/api/admin/slack/callback`;

    const oauthResult = await exchangeCodeForToken(code, redirectUri, dbCreds);
    const encryptedToken = encryptToken(oauthResult.access_token);

    const supabase = await createAdminClient();

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
      return NextResponse.redirect(
        new URL("/admin?slack_error=db_error&tab=slack", request.url)
      );
    }

    const response = NextResponse.redirect(
      new URL("/admin?slack_connected=1&tab=slack", request.url)
    );
    response.cookies.delete("slack_oauth_state");
    return response;
  } catch (err) {
    console.error("[Slack callback] Error:", err);
    const errCode = err instanceof Error ? encodeURIComponent(err.message) : "unknown";
    return NextResponse.redirect(
      new URL(`/admin?slack_error=${errCode}&tab=slack`, request.url)
    );
  }
}
