/**
 * Stream Follow API Route
 * 
 * Handles following/unfollowing streams
 * 
 * POST /api/streams/[id]/follow - Follow a stream
 * DELETE /api/streams/[id]/follow - Unfollow a stream
 * GET /api/streams/[id]/follow - Get follow status and follower count
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/[id]/follow
 * 
 * Returns follow status and follower count for a stream
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication (optional for this endpoint)
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Execute all queries in parallel for better performance
    const [countResult, followersResult, userFollowResult, contributorsResult, assetCountResult] = await Promise.all([
      // Get follower count
      supabase
        .from('stream_follows')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId),
      
      // Get followers with user details (limit to recent 10 for avatar display)
      supabase
        .from('stream_follows')
        .select(`
          user_id,
          created_at,
          users:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(10),
      
      // Check if current user is following (only if authenticated)
      currentUser
        ? supabase
            .from('stream_follows')
            .select('stream_id')
            .eq('stream_id', streamId)
            .eq('user_id', currentUser.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      
      // Get contributors (unique users who have added assets to this stream)
      supabase
        .from('asset_streams')
        .select(`
          assets!inner(
            uploader_id,
            uploader:users!uploader_id(
              id,
              username,
              display_name,
              avatar_url
            )
          )
        `)
        .eq('stream_id', streamId),
      
      // Get asset count (number of shots in this stream)
      supabase
        .from('asset_streams')
        .select('*', { count: 'exact', head: true })
        .eq('stream_id', streamId),
    ]);

    if (countResult.error) {
      console.error('[GET /api/streams/[id]/follow] Error getting count:', countResult.error);
      return NextResponse.json(
        { error: 'Failed to get follower count' },
        { status: 500 }
      );
    }

    // Log errors for followers, contributors, and asset count queries (non-blocking)
    if (followersResult.error) {
      console.error('[GET /api/streams/[id]/follow] Error getting followers:', followersResult.error);
    }
    if (contributorsResult.error) {
      console.error('[GET /api/streams/[id]/follow] Error getting contributors:', contributorsResult.error);
    }
    if (assetCountResult.error) {
      console.error('[GET /api/streams/[id]/follow] Error getting asset count:', assetCountResult.error);
    }

    // Extract unique contributors with their details
    interface ContributorItem {
      assets?: {
        uploader_id: string;
        uploader?: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string;
        };
      };
    }
    const contributorMap = new Map<string, ContributorItem['assets']['uploader']>();
    (contributorsResult.data as ContributorItem[] | null)?.forEach((item) => {
      const uploader = item.assets?.uploader;
      if (uploader && !contributorMap.has(uploader.id)) {
        contributorMap.set(uploader.id, uploader);
      }
    });
    const contributors = Array.from(contributorMap.values());
    const contributorCount = contributors.length;

    return NextResponse.json({
      isFollowing: !!userFollowResult.data,
      followerCount: countResult.count || 0,
      followers: followersResult.data?.map(f => f.users).filter(Boolean) || [],
      contributorCount,
      contributors: contributors.slice(0, 10), // Limit to 10 for tooltip display
      assetCount: assetCountResult.count || 0,
    });
  } catch (error) {
    console.error('[GET /api/streams/[id]/follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams/[id]/follow
 * 
 * Follows a stream
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify stream exists
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, owner_id, owner_type')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Insert follow relationship
    const { error: followError } = await supabase
      .from('stream_follows')
      .insert({
        stream_id: streamId,
        user_id: currentUser.id,
      });

    // If already following, return success (idempotent)
    if (followError?.code === '23505') {
      return NextResponse.json({ message: 'Already following' });
    }

    if (followError) {
      console.error('[POST /api/streams/[id]/follow] Error:', followError);
      return NextResponse.json(
        { error: 'Failed to follow stream' },
        { status: 500 }
      );
    }

    // Optionally notify stream owner (only if owner is a user, not a team)
    if (stream.owner_type === 'user' && stream.owner_id !== currentUser.id) {
      await supabase.from('notifications').insert({
        type: 'follow',
        recipient_id: stream.owner_id,
        actor_id: currentUser.id,
        resource_id: streamId,
        resource_type: 'stream',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/streams/[id]/follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/[id]/follow
 * 
 * Unfollows a stream
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete follow relationship
    const { error: unfollowError } = await supabase
      .from('stream_follows')
      .delete()
      .eq('stream_id', streamId)
      .eq('user_id', currentUser.id);

    if (unfollowError) {
      console.error('[DELETE /api/streams/[id]/follow] Error:', unfollowError);
      return NextResponse.json(
        { error: 'Failed to unfollow stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/streams/[id]/follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

