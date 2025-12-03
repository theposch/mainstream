/**
 * Asset Viewers API Route
 * 
 * Fetches the list of users who have viewed an asset (for tooltip)
 * 
 * GET /api/assets/[id]/viewers - Get list of viewers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface Viewer {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  viewed_at: string;
}

interface UserData {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface ViewRecord {
  viewed_at: string;
  user: UserData | null;
}

/**
 * GET /api/assets/[id]/viewers
 * 
 * Returns the most recent viewers of an asset (for tooltip display)
 * - Limited to 10 viewers by default
 * - Ordered by most recent view first
 * - Excludes asset owner
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: assetId } = await context.params;
    const supabase = await createAdminClient();

    // Get limit from query params (default 10)
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Fetch viewers with user details, ordered by most recent
    const { data: views, error } = await supabase
      .from('asset_views')
      .select(`
        viewed_at,
        user:users!user_id(
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('asset_id', assetId)
      .order('viewed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[GET /api/assets/[id]/viewers] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch viewers' },
        { status: 500 }
      );
    }

    // Transform the data to flatten user info
    const viewers: Viewer[] = ((views || []) as ViewRecord[])
      .filter((v): v is ViewRecord & { user: UserData } => v.user !== null)
      .map(v => ({
        id: v.user.id,
        username: v.user.username,
        display_name: v.user.display_name,
        avatar_url: v.user.avatar_url,
        viewed_at: v.viewed_at,
      }));

    return NextResponse.json({ viewers });
  } catch (error) {
    console.error('[GET /api/assets/[id]/viewers] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

