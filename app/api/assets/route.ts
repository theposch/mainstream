/**
 * Assets API Route
 * 
 * Provides endpoints for fetching assets from Supabase database.
 * 
 * @see /docs/IMAGE_UPLOAD.md for implementation details
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/assets
 * 
 * Fetches all assets from Supabase database, sorted by creation date
 * (newest first). Returns complete asset objects including all image
 * URLs, metadata, and color information.
 * 
 * Query parameters:
 * - cursor: created_at timestamp for pagination (optional)
 * - limit: number of assets to fetch (default: 20, max: 50)
 * 
 * Response:
 * {
 *   "assets": [...],
 *   "hasMore": true,
 *   "cursor": "2025-01-01T00:00:00Z"
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const fetchLimit = limit + 1; // Fetch one extra to determine hasMore
    
    const supabase = await createClient();
    
    // Get current user for like status (optional - won't fail if not authenticated)
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Build base query with all relations
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
    
    // Build query with visibility filter
    let query = supabase
      .from('assets')
      .select(baseSelect)
      .or('visibility.is.null,visibility.eq.public')
      .order('created_at', { ascending: false });
    
    // Apply cursor pagination if provided
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    
    query = query.limit(fetchLimit);
    
    let { data: assets, error } = await query;
    
    // Only fallback if error is specifically "column not found" (code 42703)
    const isColumnNotFoundError = error?.code === '42703' || error?.message?.includes('visibility');
    if (error && isColumnNotFoundError) {
      let fallbackQuery = supabase
        .from('assets')
        .select(baseSelect)
        .order('created_at', { ascending: false });
      
      if (cursor) {
        fallbackQuery = fallbackQuery.lt('created_at', cursor);
      }
      
      const fallback = await fallbackQuery.limit(fetchLimit);
      assets = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('[GET /api/assets] Database error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch assets from database',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    // Determine hasMore before slicing
    const hasMore = (assets?.length || 0) > limit;
    const rawAssets = (assets || []).slice(0, limit);
    
    // Batch fetch which assets the user has liked
    let userLikedAssetIds: Set<string> = new Set();
    if (currentUser && rawAssets.length > 0) {
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
    const transformedAssets = rawAssets.map((asset: any) => ({
      ...asset,
      streams: asset.asset_streams?.map((rel: any) => rel.streams).filter(Boolean) || [],
      asset_streams: undefined,
      likeCount: asset.asset_likes?.[0]?.count || 0,
      asset_likes: undefined,
      isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
    }));
    
    return NextResponse.json(
      { 
        assets: transformedAssets,
        hasMore,
        cursor: transformedAssets.length > 0 ? transformedAssets[transformedAssets.length - 1].created_at : null
      },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('[GET /api/assets] Error fetching assets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

