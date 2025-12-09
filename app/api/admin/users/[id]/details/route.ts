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

interface UserActivity {
  type: 'upload' | 'like' | 'comment' | 'stream';
  timestamp: string;
  details: {
    assetId?: string;
    assetTitle?: string;
    assetThumbnail?: string;
    commentContent?: string;
    streamId?: string;
    streamName?: string;
    streamCoverUrl?: string;
    // Streams the asset was uploaded to (for upload activities)
    streams?: Array<{ id: string; name: string }>;
  };
}

interface UserUpload {
  id: string;
  title: string;
  type: string;
  url: string;
  thumbnail_url: string | null;
  file_size: number | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  view_count: number;
}

interface UserDetailsResponse {
  user: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url: string | null;
    bio: string | null;
    job_title: string | null;
    location: string | null;
    platform_role: string;
    created_at: string;
    updated_at: string;
  };
  stats: {
    totalUploads: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    storageUsed: number;
    storageFormatted: string;
    streamsOwned: number;
    streamsMember: number;
  };
  recentActivity: UserActivity[];
  recentUploads: UserUpload[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return 'Invalid size';
  // Handle fractional bytes (0 < bytes < 1) - Math.log would return negative index
  if (bytes < 1) return '< 1 Byte';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /api/admin/users/[id]/details
 * 
 * Returns detailed information about a specific user including:
 * - Profile information
 * - Activity statistics
 * - Recent activity timeline
 * - Recent uploads
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

    // Fetch all stats in parallel
    const [
      uploadsResult,
      likesResult,
      commentsResult,
      storageResult,
      totalViewsResult,
      streamsOwnedResult,
      streamsMemberResult,
      recentUploadsResult,
      recentLikesResult,
      recentCommentsResult,
      recentStreamsResult,
    ] = await Promise.all([
      // Total uploads count
      supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('uploader_id', userId),
      
      // Total likes given
      supabase
        .from('asset_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Total comments made
      supabase
        .from('asset_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Storage used (sum of file sizes)
      supabase
        .from('assets')
        .select('file_size')
        .eq('uploader_id', userId),
      
      // Total views across ALL uploads (not just recent)
      supabase
        .from('assets')
        .select('view_count')
        .eq('uploader_id', userId),
      
      // Streams owned
      supabase
        .from('streams')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('owner_type', 'user'),
      
      // Streams member of
      supabase
        .from('stream_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      // Recent uploads with engagement and streams
      supabase
        .from('assets')
        .select(`
          id,
          title,
          type,
          url,
          thumbnail_url,
          file_size,
          created_at,
          view_count,
          asset_streams (
            stream:streams (
              id,
              name
            )
          )
        `)
        .eq('uploader_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Recent likes (for activity timeline)
      supabase
        .from('asset_likes')
        .select(`
          created_at,
          asset:assets (
            id,
            title,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Recent comments (for activity timeline)
      supabase
        .from('asset_comments')
        .select(`
          created_at,
          content,
          asset:assets (
            id,
            title,
            thumbnail_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      
      // Recent streams created (for activity timeline)
      supabase
        .from('streams')
        .select(`
          id,
          name,
          cover_image_url,
          created_at
        `)
        .eq('owner_id', userId)
        .eq('owner_type', 'user')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    // Calculate storage
    const storageUsed = (storageResult.data || []).reduce(
      (sum, asset) => sum + (asset.file_size || 0),
      0
    );

    // Get like and comment counts for recent uploads
    const uploadIds = (recentUploadsResult.data || []).map(u => u.id);
    
    let likeCounts: Record<string, number> = {};
    let commentCounts: Record<string, number> = {};
    
    if (uploadIds.length > 0) {
      const [likeCountsResult, commentCountsResult] = await Promise.all([
        supabase
          .from('asset_likes')
          .select('asset_id')
          .in('asset_id', uploadIds),
        supabase
          .from('asset_comments')
          .select('asset_id')
          .in('asset_id', uploadIds),
      ]);

      // Count likes per asset
      (likeCountsResult.data || []).forEach(like => {
        likeCounts[like.asset_id] = (likeCounts[like.asset_id] || 0) + 1;
      });

      // Count comments per asset
      (commentCountsResult.data || []).forEach(comment => {
        commentCounts[comment.asset_id] = (commentCounts[comment.asset_id] || 0) + 1;
      });
    }

    // Calculate total views from ALL user's uploads (not just recent 20)
    const totalViews = (totalViewsResult.data || []).reduce(
      (sum, asset) => sum + (asset.view_count || 0),
      0
    );

    // Build recent uploads with counts
    const recentUploads: UserUpload[] = (recentUploadsResult.data || []).map(upload => ({
      id: upload.id,
      title: upload.title,
      type: upload.type,
      url: upload.url,
      thumbnail_url: upload.thumbnail_url,
      file_size: upload.file_size,
      created_at: upload.created_at,
      like_count: likeCounts[upload.id] || 0,
      comment_count: commentCounts[upload.id] || 0,
      view_count: upload.view_count || 0,
    }));

    // Build activity timeline
    const activities: UserActivity[] = [];

    // Add uploads to timeline
    (recentUploadsResult.data || []).forEach((upload: any) => {
      // Extract streams from nested asset_streams relation
      const streams = (upload.asset_streams || [])
        .map((as: any) => as.stream)
        .filter((s: any) => s !== null)
        .map((s: any) => ({ id: s.id, name: s.name }));

      activities.push({
        type: 'upload',
        timestamp: upload.created_at,
        details: {
          assetId: upload.id,
          assetTitle: upload.title,
          assetThumbnail: upload.thumbnail_url || undefined,
          streams: streams.length > 0 ? streams : undefined,
        },
      });
    });

    // Add likes to timeline
    (recentLikesResult.data || []).forEach((like: any) => {
      if (like.asset) {
        activities.push({
          type: 'like',
          timestamp: like.created_at,
          details: {
            assetId: like.asset.id,
            assetTitle: like.asset.title,
            assetThumbnail: like.asset.thumbnail_url || undefined,
          },
        });
      }
    });

    // Add comments to timeline
    (recentCommentsResult.data || []).forEach((comment: any) => {
      if (comment.asset) {
        activities.push({
          type: 'comment',
          timestamp: comment.created_at,
          details: {
            assetId: comment.asset.id,
            assetTitle: comment.asset.title,
            assetThumbnail: comment.asset.thumbnail_url || undefined,
            commentContent: comment.content,
          },
        });
      }
    });

    // Add stream creations to timeline
    (recentStreamsResult.data || []).forEach((stream: any) => {
      activities.push({
        type: 'stream',
        timestamp: stream.created_at,
        details: {
          streamId: stream.id,
          streamName: stream.name,
          streamCoverUrl: stream.cover_image_url || undefined,
        },
      });
    });

    // Sort activities by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Build response
    const response: UserDetailsResponse = {
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        email: user.email,
        avatar_url: user.avatar_url,
        bio: user.bio,
        job_title: user.job_title,
        location: user.location,
        platform_role: user.platform_role || 'user',
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
      stats: {
        totalUploads: uploadsResult.count || 0,
        totalLikes: likesResult.count || 0,
        totalComments: commentsResult.count || 0,
        totalViews,
        storageUsed,
        storageFormatted: formatBytes(storageUsed),
        streamsOwned: streamsOwnedResult.count || 0,
        streamsMember: streamsMemberResult.count || 0,
      },
      recentActivity: activities.slice(0, 30),
      recentUploads,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/admin/users/[id]/details] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

