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
    } = {};

    // Search assets (with like counts)
    if (type === 'all' || type === 'assets') {
      const { data: assets } = await supabase
        .from('assets')
        .select(`
          *,
          uploader:users!uploader_id(*),
          asset_likes(count)
        `)
        .or(`title.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

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

      results.users = users || [];
    }

    // Search streams
    if (type === 'all' || type === 'streams') {
      const { data: streams } = await supabase
        .from('streams')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .eq('status', 'active')
        .limit(limit);

      results.streams = streams || [];
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[GET /api/search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



