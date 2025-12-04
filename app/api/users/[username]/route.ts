/**
 * User Profile API Route
 * 
 * Handles fetching user profile data by username
 * 
 * GET /api/users/[username] - Get user profile with stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    username: string;
  }>;
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/[username]
 * 
 * Fetches user profile with aggregated stats (followers, following, assets count)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const supabase = await createClient();

    // Get user by username
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get follower count
    const { count: followersCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    // Get following count
    const { count: followingCount } = await supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    // Get assets count (only public assets, not unlisted drop-only images)
    const { count: assetsCount } = await supabase
      .from('assets')
      .select('*', { count: 'exact', head: true })
      .eq('uploader_id', user.id)
      .or('visibility.is.null,visibility.eq.public');

    // Check if current user follows this profile
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    let isFollowing = false;

    if (currentUser && currentUser.id !== user.id) {
      const { data: followData } = await supabase
        .from('user_follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', user.id)
        .single();

      isFollowing = !!followData;
    }

    return NextResponse.json({
      user,
      stats: {
        followers: followersCount || 0,
        following: followingCount || 0,
        assets: assetsCount || 0,
      },
      isFollowing,
    });
  } catch (error) {
    console.error('[GET /api/users/[username]] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}



