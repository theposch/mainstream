/**
 * Following Feed API Route
 * 
 * Fetches assets from users AND streams that the current user follows
 * 
 * GET /api/assets/following - Get assets from followed users and streams with cursor pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseAndValidateCursor } from '@/lib/api/assets';

export const dynamic = 'force-dynamic';

/**
 * GET /api/assets/following
 * 
 * Query parameters:
 * - cursor: composite cursor "timestamp::id" for pagination (optional)
 *   Using double colon separator to avoid conflicts with ISO timestamp colons.
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
    const cursorParam = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    
    // Parse and validate cursor to prevent SQL injection
    // Returns null for invalid/malicious cursors
    const validatedCursor = parseAndValidateCursor(cursorParam);
    const cursorTimestamp = validatedCursor?.timestamp ?? null;
    const cursorId = validatedCursor?.id ?? null;

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

    // Return error if both queries fail (can't proceed without any follow data)
    if (userFollowsResult.error && streamFollowsResult.error) {
      console.error('[GET /api/assets/following] Error fetching follows:', {
        userFollowsError: userFollowsResult.error,
        streamFollowsError: streamFollowsResult.error,
      });
      return NextResponse.json(
        { error: 'Failed to fetch following data' },
        { status: 500 }
      );
    }

    // Log individual errors but continue with partial data (graceful degradation)
    if (userFollowsResult.error) {
      console.error('[GET /api/assets/following] Error fetching user follows (continuing with stream follows):', userFollowsResult.error);
    }
    if (streamFollowsResult.error) {
      console.error('[GET /api/assets/following] Error fetching stream follows (continuing with user follows):', streamFollowsResult.error);
    }

    // Filter out self-follows - don't show your own posts in the Following feed
    // (your own posts appear in Recent/profile instead)
    const followingUserIds = (userFollowsResult.data?.map(f => f.following_id) || [])
      .filter(id => id !== currentUser.id);
    const followingStreamIds = streamFollowsResult.data?.map(f => f.stream_id) || [];

    // If not following anyone or any streams, return empty array
    // Maintain consistent response structure with cursor field
    if (followingUserIds.length === 0 && followingStreamIds.length === 0) {
      return NextResponse.json({
        assets: [],
        hasMore: false,
        cursor: null
      });
    }

    // Get asset IDs from followed streams
    let streamAssetIds: string[] = [];
    if (followingStreamIds.length > 0) {
      const { data: streamAssets, error: streamAssetsError } = await supabase
        .from('asset_streams')
        .select('asset_id')
        .in('stream_id', followingStreamIds);
      
      if (streamAssetsError) {
        console.error('[GET /api/assets/following] Error fetching stream assets:', streamAssetsError);
      }
      
      streamAssetIds = streamAssets?.map(sa => sa.asset_id) || [];
    }

    // Build the base select query for assets
    const baseSelect = `
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
    `;

    // Fetch assets using separate queries to avoid complex OR filter issues with UUIDs
    // Then merge and deduplicate the results
    // Request limit + 1 to accurately detect if more data exists
    const fetchLimit = limit + 1;
    const assetQueries: PromiseLike<any>[] = [];
    
    // Query for assets from followed users
    // Filter by visibility (exclude unlisted drop-only images)
    // Use compound OR to ensure AND semantics with IN filter
    if (followingUserIds.length > 0) {
      // Build visibility filter for each uploader_id
      // Format: (uploader_id = X AND (visibility IS NULL OR visibility = public))
      const userVisibilityFilter = followingUserIds
        .map(id => `and(uploader_id.eq.${id},or(visibility.is.null,visibility.eq.public))`)
        .join(',');
      
      let userAssetsQuery = supabase
        .from('assets')
        .select(baseSelect)
        .or(userVisibilityFilter)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      
      // Apply composite cursor pagination if provided
      if (cursorTimestamp) {
        if (cursorId) {
          userAssetsQuery = userAssetsQuery.or(
            `created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursorId})`
          );
        } else {
          userAssetsQuery = userAssetsQuery.lt('created_at', cursorTimestamp);
        }
      }
      
      userAssetsQuery = userAssetsQuery.limit(fetchLimit);
      
      assetQueries.push(userAssetsQuery);
    }
    
    // Query for assets from followed streams
    // Filter by visibility (exclude unlisted drop-only images)
    if (streamAssetIds.length > 0) {
      // Build visibility filter for each asset_id
      // Format: (id = X AND (visibility IS NULL OR visibility = public))
      const streamVisibilityFilter = streamAssetIds
        .map(id => `and(id.eq.${id},or(visibility.is.null,visibility.eq.public))`)
        .join(',');
      
      let streamAssetsQuery = supabase
        .from('assets')
        .select(baseSelect)
        .or(streamVisibilityFilter)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      
      // Apply composite cursor pagination if provided
      if (cursorTimestamp) {
        if (cursorId) {
          streamAssetsQuery = streamAssetsQuery.or(
            `created_at.lt.${cursorTimestamp},and(created_at.eq.${cursorTimestamp},id.lt.${cursorId})`
          );
        } else {
          streamAssetsQuery = streamAssetsQuery.lt('created_at', cursorTimestamp);
        }
      }

      streamAssetsQuery = streamAssetsQuery.limit(fetchLimit);
      
      assetQueries.push(streamAssetsQuery);
    }

    // Execute queries in parallel
    const queryResults = await Promise.all(assetQueries);
    
    // Check for errors
    const assetsError = queryResults.find(r => r.error)?.error;
    if (assetsError) {
      console.error('[GET /api/assets/following] Error fetching assets:', assetsError);
      return NextResponse.json(
        { error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }

    // Check if ANY individual query returned fetchLimit items (indicates that source has more data)
    // This is more reliable than checking merged count, which can be reduced by deduplication
    const anyQueryHasMore = queryResults.some(result => 
      result.data && result.data.length >= fetchLimit
    );

    // Merge and deduplicate results by asset ID
    const assetMap = new Map<string, any>();
    queryResults.forEach(result => {
      result.data?.forEach((asset: any) => {
        if (!assetMap.has(asset.id)) {
          assetMap.set(asset.id, asset);
        }
      });
    });
    
    // Sort by created_at DESC, then by id DESC for stable ordering
    const allMergedAssets = Array.from(assetMap.values())
      .sort((a, b) => {
        const timeCompare = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (timeCompare !== 0) return timeCompare;
        // If timestamps are equal, sort by id DESC for stable ordering
        // localeCompare returns positive when first > second, so negate for DESC
        return -a.id.localeCompare(b.id);
      });
    
    // hasMore is true if:
    // 1. Any individual query returned fetchLimit items (indicating more in that source), OR
    // 2. The merged result has more than limit items (after deduplication)
    const hasMore = anyQueryHasMore || allMergedAssets.length > limit;
    
    // Apply limit after checking hasMore
    const rawAssets = allMergedAssets.slice(0, limit);
    
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

    // Build composite cursor: "timestamp::id" (double colon to avoid ISO timestamp conflicts)
    const lastAsset = assets[assets.length - 1];
    const nextCursor = lastAsset ? `${lastAsset.created_at}::${lastAsset.id}` : null;
    
    return NextResponse.json({
      assets: assets || [],
      hasMore,
      cursor: nextCursor
    });
  } catch (error) {
    console.error('[GET /api/assets/following] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
