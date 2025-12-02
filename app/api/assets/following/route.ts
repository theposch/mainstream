/**
 * Following Feed API Route
 * 
 * Fetches assets from users AND streams that the current user follows
 * 
 * GET /api/assets/following - Get assets from followed users and streams with cursor pagination
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
 * Returns assets from:
 * 1. Users that the current user follows
 * 2. Streams that the current user follows
 * 
 * Results are deduplicated and ordered by created_at DESC with cursor-based pagination
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

    // Fetch both user follows and stream follows in parallel
    const [userFollowsResult, streamFollowsResult] = await Promise.all([
      supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', currentUser.id),
      supabase
        .from('stream_follows')
        .select('stream_id')
        .eq('user_id', currentUser.id),
    ]);

    if (userFollowsResult.error) {
      console.error('[GET /api/assets/following] Error fetching user follows:', userFollowsResult.error);
    }
    if (streamFollowsResult.error) {
      console.error('[GET /api/assets/following] Error fetching stream follows:', streamFollowsResult.error);
    }

    const followingUserIds = userFollowsResult.data?.map(f => f.following_id) || [];
    const followingStreamIds = streamFollowsResult.data?.map(f => f.stream_id) || [];

    // If not following anyone or any streams, return empty array
    if (followingUserIds.length === 0 && followingStreamIds.length === 0) {
      return NextResponse.json({
        assets: [],
        hasMore: false
      });
    }

    // Get asset IDs from followed streams
    let streamAssetIds: string[] = [];
    if (followingStreamIds.length > 0) {
      const { data: streamAssets } = await supabase
        .from('asset_streams')
        .select('asset_id')
        .in('stream_id', followingStreamIds);
      
      streamAssetIds = streamAssets?.map(sa => sa.asset_id) || [];
    }

    // Build the query based on what we're following
    // We need assets where:
    // - uploader_id is in followingUserIds, OR
    // - asset id is in streamAssetIds
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
      .order('created_at', { ascending: false })
      .limit(limit);

    // Build filter based on what we're following
    if (followingUserIds.length > 0 && streamAssetIds.length > 0) {
      // Following both users and streams - use OR filter
      query = query.or(`uploader_id.in.(${followingUserIds.join(',')}),id.in.(${streamAssetIds.join(',')})`);
    } else if (followingUserIds.length > 0) {
      // Only following users
      query = query.in('uploader_id', followingUserIds);
    } else if (streamAssetIds.length > 0) {
      // Only following streams
      query = query.in('id', streamAssetIds);
    }

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
