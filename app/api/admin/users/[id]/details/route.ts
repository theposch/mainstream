/**
 * Admin User Details API Route
 * 
 * GET /api/admin/users/[id]/details - Get detailed user information
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ActivityItem {
  type: 'upload' | 'like' | 'comment' | 'view' | 'stream_created';
  timestamp: string;
  details: {
    assetId?: string;
    assetName?: string;
    streamId?: string;
    streamName?: string;
    commentText?: string;
  };
}

/**
 * GET /api/admin/users/[id]/details
 * 
 * Returns detailed information about a user including:
 * - Full profile data
 * - Stats (uploads, likes received, comments, views)
 * - Last active timestamp
 * - Recent assets
 * - Streams they own
 * - Activity timeline
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: userId } = await params;
    
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createAdminClient();

    // Fetch user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch auth user data for last sign in
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    const lastSignIn = authData?.user?.last_sign_in_at || null;

    // Fetch stats in parallel
    const [
      { count: totalUploads },
      { data: userAssets },
      { count: totalComments },
      { data: likesReceived },
    ] = await Promise.all([
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('uploader_id', userId),
      supabase.from('assets').select('id, view_count').eq('uploader_id', userId),
      supabase.from('asset_comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('asset_likes').select('asset_id, assets!inner(uploader_id)').eq('assets.uploader_id', userId),
    ]);

    // Calculate total views on user's content
    const totalViews = (userAssets || []).reduce((sum, asset) => sum + (asset.view_count || 0), 0);
    const totalLikesReceived = likesReceived?.length || 0;

    // Fetch recent assets (last 12)
    const { data: recentAssets } = await supabase
      .from('assets')
      .select(`
        id,
        name,
        file_type,
        thumbnail_url,
        preview_url,
        view_count,
        created_at,
        stream:streams(id, name)
      `)
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false })
      .limit(12);

    // Fetch streams owned by user
    const { data: streams } = await supabase
      .from('streams')
      .select(`
        id,
        name,
        description,
        visibility,
        cover_image,
        created_at,
        assets:assets(count)
      `)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    // Build activity timeline (last 20 activities)
    const activities: ActivityItem[] = [];

    // Get recent uploads
    const { data: recentUploads } = await supabase
      .from('assets')
      .select('id, name, created_at, stream:streams(id, name)')
      .eq('uploader_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    (recentUploads || []).forEach(asset => {
      activities.push({
        type: 'upload',
        timestamp: asset.created_at,
        details: {
          assetId: asset.id,
          assetName: asset.name,
          streamId: (asset.stream as any)?.id,
          streamName: (asset.stream as any)?.name,
        },
      });
    });

    // Get recent likes given
    const { data: recentLikes } = await supabase
      .from('asset_likes')
      .select('created_at, asset:assets(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    (recentLikes || []).forEach(like => {
      activities.push({
        type: 'like',
        timestamp: like.created_at,
        details: {
          assetId: (like.asset as any)?.id,
          assetName: (like.asset as any)?.name,
        },
      });
    });

    // Get recent comments
    const { data: recentComments } = await supabase
      .from('asset_comments')
      .select('created_at, content, asset:assets(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    (recentComments || []).forEach(comment => {
      activities.push({
        type: 'comment',
        timestamp: comment.created_at,
        details: {
          assetId: (comment.asset as any)?.id,
          assetName: (comment.asset as any)?.name,
          commentText: comment.content?.substring(0, 100),
        },
      });
    });

    // Get recent stream creations
    const { data: recentStreams } = await supabase
      .from('streams')
      .select('id, name, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    (recentStreams || []).forEach(stream => {
      activities.push({
        type: 'stream_created',
        timestamp: stream.created_at,
        details: {
          streamId: stream.id,
          streamName: stream.name,
        },
      });
    });

    // Sort activities by timestamp and take last 20
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const activityTimeline = activities.slice(0, 20);

    // Calculate last active (most recent activity)
    const lastActive = activityTimeline.length > 0 ? activityTimeline[0].timestamp : user.created_at;

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        platform_role: user.platform_role || 'user',
        created_at: user.created_at,
        bio: user.bio,
        location: user.location,
        job_title: user.job_title,
      },
      stats: {
        totalUploads: totalUploads || 0,
        totalLikesReceived,
        totalComments: totalComments || 0,
        totalViews,
        streamsOwned: streams?.length || 0,
      },
      lastActive,
      lastSignIn,
      recentAssets: recentAssets || [],
      streams: (streams || []).map(stream => ({
        ...stream,
        assetCount: (stream.assets as any)?.[0]?.count || 0,
      })),
      activityTimeline,
    });
  } catch (error) {
    console.error('[GET /api/admin/users/[id]/details] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

