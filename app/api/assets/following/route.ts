/**
 * Following Feed API Route
 * 
 * Fetches assets from users that the current user follows
 * 
 * GET /api/assets/following - Get assets from followed users with cursor pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assets/following
 * 
 * Query parameters:
 * - cursor: created_at timestamp for pagination (optional)
 * - limit: number of assets to fetch (default: 20, max: 50)
 * 
 * Returns assets from users that the current user follows,
 * ordered by created_at DESC with cursor-based pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get list of users that current user follows
    const { data: followingList, error: followingError } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', currentUser.id);

    if (followingError) {
      console.error('[GET /api/assets/following] Error fetching following list:', followingError);
      return NextResponse.json(
        { error: 'Failed to fetch following list' },
        { status: 500 }
      );
    }

    // If not following anyone, return empty array
    if (!followingList || followingList.length === 0) {
      return NextResponse.json({
        assets: [],
        hasMore: false
      });
    }

    // Extract following user IDs
    const followingIds = followingList.map(f => f.following_id);

    // Build query for assets from followed users (including streams + likes to prevent N+1)
    let query = supabase
      .from('assets')
      .select(`
        *,
        uploader:users!uploader_id(
          id,
          username,
          display_name,
          avatar_url,
          email
        ),
        asset_streams(
          streams(*)
        ),
        asset_likes(count)
      `)
      .in('uploader_id', followingIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Apply cursor pagination if provided
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: rawAssets, error: assetsError } = await query;

    if (assetsError) {
      console.error('[GET /api/assets/following] Error fetching assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }
    
    // Batch fetch which assets the user has liked
    let userLikedAssetIds: Set<string> = new Set();
    if (rawAssets && rawAssets.length > 0) {
      const assetIds = rawAssets.map((a: any) => a.id);
      const { data: userLikes } = await supabase
        .from('asset_likes')
        .select('asset_id')
        .eq('user_id', currentUser.id)
        .in('asset_id', assetIds);
      
      if (userLikes) {
        userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
      }
    }
    
    // Transform nested data to flat structure with like status
    const assets = (rawAssets || []).map((asset: any) => ({
      ...asset,
      streams: asset.asset_streams?.map((rel: any) => rel.streams).filter(Boolean) || [],
      asset_streams: undefined,
      likeCount: asset.asset_likes?.[0]?.count || 0,
      asset_likes: undefined,
      isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
    }));

    // Determine if there are more assets
    const hasMore = assets && assets.length === limit;

    return NextResponse.json({
      assets: assets || [],
      hasMore,
      cursor: assets && assets.length > 0 ? assets[assets.length - 1].created_at : null
    });
  } catch (error) {
    console.error('[GET /api/assets/following] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

