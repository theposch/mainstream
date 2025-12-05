/**
 * Search API Route
 * 
 * Provides full-text search across assets, users, and streams
 * using PostgreSQL's built-in text search capabilities
 * 
 * GET /api/search?q=query&type=all&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search
 * 
 * Query parameters:
 * - q: Search query (required)
 * - type: Search type - 'all' | 'assets' | 'users' | 'streams' (default: 'all')
 * - limit: Max results per type (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const searchTerm = query.trim();
    
    // Get current user for like status check
    const { data: { user } } = await supabase.auth.getUser();
    
    const results: {
      assets?: any[];
      users?: any[];
      streams?: any[];
      totalAssets?: number;
      totalUsers?: number;
      totalStreams?: number;
      total?: number;
    } = {};

    // Search assets (with like counts)
    // Exclude unlisted assets (drop-only images) if visibility column exists
    if (type === 'all' || type === 'assets') {
      // Get limited results for display - try with visibility filter first
      // Use compound OR to ensure AND semantics with visibility filter
      let { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select(`
          *,
          uploader:users!uploader_id(*),
          asset_likes(count)
        `)
        .or(`and(title.ilike.%${searchTerm}%,visibility.is.null),and(title.ilike.%${searchTerm}%,visibility.eq.public)`)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Only fallback if error is specifically "column not found" (code 42703)
      // Other errors (network, permissions) should not expose unlisted assets
      const isColumnNotFoundError = (err: any) => err?.code === '42703' || err?.message?.includes('visibility');
      if (assetsError && isColumnNotFoundError(assetsError)) {
        const fallback = await supabase
          .from('assets')
          .select(`
            *,
            uploader:users!uploader_id(*),
            asset_likes(count)
          `)
          .ilike('title', `%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(limit);
        assets = fallback.data;
      }

      // Get total count (without limit) - must include same visibility filter as results query
      let totalAssets = 0;
      const { count: filteredCount, error: countError } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .or(`and(title.ilike.%${searchTerm}%,visibility.is.null),and(title.ilike.%${searchTerm}%,visibility.eq.public)`);
      
      // Handle count query results
      if (countError) {
        // Only fallback if error is specifically "column not found" (code 42703)
        if (isColumnNotFoundError(countError)) {
          const { count: fallbackCount } = await supabase
            .from('assets')
            .select('*', { count: 'exact', head: true })
            .ilike('title', `%${searchTerm}%`);
          totalAssets = fallbackCount || 0;
        }
        // For other errors (network, permissions), leave totalAssets as 0
        // but log the error for debugging
        else {
          console.error('[Search API] Error getting asset count:', countError);
        }
      } else {
        totalAssets = filteredCount || 0;
      }

      results.totalAssets = totalAssets;

      // Batch fetch which assets the user has liked
      let userLikedAssetIds: Set<string> = new Set();
      if (user && assets && assets.length > 0) {
        const assetIds = assets.map((a: any) => a.id);
        const { data: userLikes } = await supabase
          .from('asset_likes')
          .select('asset_id')
          .eq('user_id', user.id)
          .in('asset_id', assetIds);
        
        if (userLikes) {
          userLikedAssetIds = new Set(userLikes.map(l => l.asset_id));
        }
      }

      // Transform assets with like count and status
      results.assets = (assets || []).map((asset: any) => ({
        ...asset,
        likeCount: asset.asset_likes?.[0]?.count || 0,
        asset_likes: undefined,
        isLikedByCurrentUser: userLikedAssetIds.has(asset.id),
      }));
    }

    // Search users
    if (type === 'all' || type === 'users') {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
        .limit(limit);

      // Get total count (without limit)
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`);

      results.users = users || [];
      results.totalUsers = totalUsers || 0;
    }

    // Search streams
    if (type === 'all' || type === 'streams') {
      const { data: streams } = await supabase
        .from('streams')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .limit(limit);

      // Get total count (without limit)
      const { count: totalStreams } = await supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('status', 'active');

      results.streams = streams || [];
      results.totalStreams = totalStreams || 0;
    }

    // Calculate grand total
    results.total = (results.totalAssets || 0) + (results.totalUsers || 0) + (results.totalStreams || 0);

    return NextResponse.json(results);
  } catch (error) {
    console.error('[GET /api/search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
