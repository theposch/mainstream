/**
 * Admin User Activity API Route
 * 
 * GET /api/admin/users/[id]/activity - Get all user activity
 * 
 * Note: This fetches all activity types and returns them sorted.
 * Client-side pagination is handled by the UI component.
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

interface ActivityResponse {
  activities: UserActivity[];
  total: number;
}

// Max activities to fetch per type (200 each = up to 800 total activities)
const MAX_PER_TYPE = 200;

/**
 * GET /api/admin/users/[id]/activity
 * 
 * Returns all activity for a user (up to MAX_PER_TYPE per activity type).
 * Activities are sorted by timestamp (newest first).
 * Client handles progressive display ("Load More").
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

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch all activity types in parallel
    // We fetch a generous amount of each type to provide comprehensive history
    const [
      uploadsResult,
      likesResult,
      commentsResult,
      streamsResult,
    ] = await Promise.all([
      // Uploads with streams
      supabase
        .from('assets')
        .select(`
          id,
          title,
          thumbnail_url,
          created_at,
          asset_streams (
            stream:streams (
              id,
              name
            )
          )
        `)
        .eq('uploader_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_PER_TYPE),
      
      // Likes
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
        .limit(MAX_PER_TYPE),
      
      // Comments
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
        .limit(MAX_PER_TYPE),
      
      // Streams created
      supabase
        .from('streams')
        .select('id, name, cover_image_url, created_at')
        .eq('owner_id', userId)
        .eq('owner_type', 'user')
        .order('created_at', { ascending: false })
        .limit(MAX_PER_TYPE),
    ]);

    // Build combined activity list
    const activities: UserActivity[] = [];

    // Add uploads
    (uploadsResult.data || []).forEach((upload: any) => {
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

    // Add likes
    (likesResult.data || []).forEach((like: any) => {
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

    // Add comments
    (commentsResult.data || []).forEach((comment: any) => {
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

    // Add stream creations
    (streamsResult.data || []).forEach((stream: any) => {
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

    // Sort by timestamp (newest first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const response: ActivityResponse = {
      activities,
      total: activities.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/admin/users/[id]/activity] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

