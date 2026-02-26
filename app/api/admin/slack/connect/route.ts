/**
 * Slack OAuth — Initiate connection
 *
 * GET /api/admin/slack/connect
 * Redirects the admin browser to the Slack authorization page.
 * Uses env-var credentials first, falls back to DB-stored credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminUser } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/server";
import {
  buildOAuthUrl,
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

  // Resolve credentials: env vars take precedence, fall back to DB
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

  // Generate a random CSRF state token
  const state = crypto.randomBytes(16).toString("hex");

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/admin/slack/callback`;
  const oauthUrl = buildOAuthUrl(redirectUri, state, dbCreds);

  // Store state in a short-lived cookie (5 min) for CSRF verification
  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return response;
}
