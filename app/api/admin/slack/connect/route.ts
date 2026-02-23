/**
 * Slack OAuth — Initiate connection
 *
 * GET /api/admin/slack/connect
 * Redirects the admin browser to the Slack authorization page.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminUser } from "@/lib/auth/require-admin";
import { buildOAuthUrl, getBaseUrl, isSlackConfigured } from "@/lib/utils/slack";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  if (!isSlackConfigured()) {
    return NextResponse.json(
      { error: "Slack OAuth credentials are not configured" },
      { status: 503 }
    );
  }

  // Generate a random CSRF state token
  const state = crypto.randomBytes(16).toString("hex");

  const baseUrl = getBaseUrl(request);
  const redirectUri = `${baseUrl}/api/admin/slack/callback`;
  const oauthUrl = buildOAuthUrl(redirectUri, state);

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
