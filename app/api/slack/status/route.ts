/**
 * Slack Status API (public, authenticated)
 *
 * GET /api/slack/status
 * Returns whether a Slack workspace is connected. Safe for any authenticated user.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("slack_integration")
    .select("id")
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ connected: !!data });
}
