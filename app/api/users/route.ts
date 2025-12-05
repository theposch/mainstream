/**
 * Users API Route
 * 
 * Fetches all users with their recent work and stream contributions
 * 
 * GET /api/users - List all users with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * 
 * Fetch users with their recent public assets and stream contributions
 * 
 * Query params:
 * - limit: number of users per page (default: 20)
 * - offset: pagination offset (default: 0)
 * - search: optional search query for username/display_name
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    // Build base query for users
    let usersQuery = supabase
      .from('users')
      .select('id, username, display_name, avatar_url, bio, job_title, location, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Add search filter if provided
    if (search) {
      usersQuery = usersQuery.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    // Apply pagination
    usersQuery = usersQuery.range(offset, offset + limit - 1);

    const { data: users, error: usersError, count } = await usersQuery;

    if (usersError) {
      console.error('[GET /api/users] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json({
        users: [],
        total: count || 0,
        hasMore: false,
      });
    }

    const userIds = users.map(u => u.id);

    // Batch fetch recent public assets for all users (5 per user)
    const { data: allAssets } = await supabase
      .from('assets')
      .select('id, title, thumbnail_url, url, uploader_id, created_at')
      .in('uploader_id', userIds)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    // Group assets by user, keeping only 5 most recent per user
    const assetsByUser = new Map<string, typeof allAssets>();
    (allAssets || []).forEach(asset => {
      const userAssets = assetsByUser.get(asset.uploader_id) || [];
      if (userAssets.length < 5) {
        userAssets.push(asset);
        assetsByUser.set(asset.uploader_id, userAssets);
      }
    });

    // Batch fetch streams each user has contributed to
    // A user "contributes" to a stream if they have assets in that stream
    const { data: assetStreams } = await supabase
      .from('asset_streams')
      .select(`
        stream_id,
        assets!inner (
          uploader_id
        ),
        streams!inner (
          id,
          name,
          is_private
        )
      `)
      .in('assets.uploader_id', userIds)
      .eq('streams.status', 'active')
      .eq('streams.is_private', false);

    // Group streams by user, keeping only 4 unique streams per user
    // Note: Supabase returns nested relations as arrays, so we unwrap them
    const streamsByUser = new Map<string, Set<string>>();
    const streamDataMap = new Map<string, { id: string; name: string; is_private: boolean }>();
    
    (assetStreams || []).forEach((rel: any) => {
      // Supabase returns assets as an array, unwrap to get uploader_id
      const asset = Array.isArray(rel.assets) ? rel.assets[0] : rel.assets;
      const userId = asset?.uploader_id;
      const stream = rel.streams;
      
      if (userId && stream) {
        streamDataMap.set(stream.id, stream);
        
        if (!streamsByUser.has(userId)) {
          streamsByUser.set(userId, new Set());
        }
        streamsByUser.get(userId)!.add(stream.id);
      }
    });

    // Get follower counts for all users in one query
    const { data: followerCounts } = await supabase
      .from('user_follows')
      .select('following_id')
      .in('following_id', userIds);

    const followerCountMap = new Map<string, number>();
    (followerCounts || []).forEach(f => {
      const current = followerCountMap.get(f.following_id) || 0;
      followerCountMap.set(f.following_id, current + 1);
    });

    // Build enriched user objects
    const enrichedUsers = users.map(user => {
      const userStreamsSet = streamsByUser.get(user.id) || new Set();
      const userStreamsArray = Array.from(userStreamsSet).slice(0, 4);
      const totalStreams = userStreamsSet.size;
      
      return {
        ...user,
        recentAssets: assetsByUser.get(user.id) || [],
        streams: userStreamsArray.map(streamId => streamDataMap.get(streamId)),
        totalStreams,
        followerCount: followerCountMap.get(user.id) || 0,
      };
    });

    return NextResponse.json({
      users: enrichedUsers,
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    });
  } catch (error) {
    console.error('[GET /api/users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

