/**
 * Asset Comments API Route
 * 
 * Handles CRUD operations for asset comments
 * 
 * GET /api/assets/[id]/comments - Fetch all comments for an asset
 * POST /api/assets/[id]/comments - Create a new comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shouldCreateNotification } from '@/lib/notifications/check-preferences';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/assets/[id]/comments
 * 
 * Fetches all comments for an asset with nested replies, like counts, and user's like status
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: assetId } = await context.params;
    const supabase = await createClient();

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Fetch all comments with user information
    const { data: comments, error } = await supabase
      .from('asset_comments')
      .select(`
        *,
        user:users!user_id(*)
      `)
      .eq('asset_id', assetId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/assets/[id]/comments] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch comments', message: error.message },
        { status: 500 }
      );
    }

    // Early return if no comments
    if (!comments || comments.length === 0) {
      return NextResponse.json({ comments: [] });
    }

    const commentIds = comments.map(c => c.id);

    // Batch fetch: Get all like counts in one query
    const { data: likeCounts } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .in('comment_id', commentIds);

    // Count likes per comment
    const likeCountMap: Record<string, number> = {};
    (likeCounts || []).forEach(like => {
      likeCountMap[like.comment_id] = (likeCountMap[like.comment_id] || 0) + 1;
    });

    // Batch fetch: Get current user's likes in one query
    let userLikedCommentIds = new Set<string>();
    if (currentUser) {
      const { data: userLikes } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .in('comment_id', commentIds)
        .eq('user_id', currentUser.id);

      userLikedCommentIds = new Set((userLikes || []).map(l => l.comment_id));
    }

    // Enhance comments with batch-fetched data
    const enhancedComments = comments.map(comment => ({
      ...comment,
      likes: likeCountMap[comment.id] || 0,
      has_liked: userLikedCommentIds.has(comment.id),
    }));

    return NextResponse.json({ comments: enhancedComments });
  } catch (error) {
    console.error('[GET /api/assets/[id]/comments] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/[id]/comments
 * 
 * Creates a new comment on an asset
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: assetId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, parent_id } = body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from('asset_comments')
      .insert({
        asset_id: assetId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(`
        *,
        user:users!user_id(*)
      `)
      .single();

    if (insertError) {
      console.error('[POST /api/assets/[id]/comments] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create comment', message: insertError.message },
        { status: 500 }
      );
    }

    // Truncate comment for preview (max 100 chars)
    const commentPreview = content.trim().length > 100 
      ? content.trim().substring(0, 100) + '...' 
      : content.trim();

    // Get asset owner for notification
    const { data: asset } = await supabase
      .from('assets')
      .select('uploader_id')
      .eq('id', assetId)
      .single();

    // Track who we've already attempted to notify to avoid duplicate attempts
    // Add users BEFORE attempting notification to prevent retries on failure
    const attemptedUsers = new Set<string>();

    // 1. Notify asset owner if commenting on someone else's asset
    if (asset && asset.uploader_id !== user.id) {
      // Mark as attempted before trying (prevents duplicate attempts if same user is parent author)
      attemptedUsers.add(asset.uploader_id);
      
      const notificationType = parent_id ? 'reply_comment' : 'comment';
      const shouldNotify = await shouldCreateNotification(supabase, asset.uploader_id, notificationType);
      
      if (shouldNotify) {
        const { error: notificationError } = await supabase.from('notifications').insert({
          type: notificationType,
          recipient_id: asset.uploader_id,
          actor_id: user.id,
          resource_id: assetId,
          resource_type: 'asset',
          content: commentPreview,
          comment_id: comment.id,
        });

        if (notificationError) {
          console.warn('[POST /api/assets/[id]/comments] Failed to create asset owner notification:', notificationError);
        }
      }
    }

    // 2. If this is a reply, also notify the original comment author
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('asset_comments')
        .select('user_id')
        .eq('id', parent_id)
        .single();

      // Only notify if:
      // - Parent comment exists
      // - Parent author is not the current user (don't notify yourself)
      // - Parent author wasn't already attempted (e.g., if they're also the asset owner)
      if (parentComment && 
          parentComment.user_id !== user.id && 
          !attemptedUsers.has(parentComment.user_id)) {
        const shouldNotify = await shouldCreateNotification(supabase, parentComment.user_id, 'reply_comment');
        
        if (shouldNotify) {
          const { error: replyNotificationError } = await supabase.from('notifications').insert({
            type: 'reply_comment',
            recipient_id: parentComment.user_id,
            actor_id: user.id,
            resource_id: assetId,
            resource_type: 'asset',
            content: commentPreview,
            comment_id: comment.id,
          });

          if (replyNotificationError) {
            console.warn('[POST /api/assets/[id]/comments] Failed to create reply notification:', replyNotificationError);
          }
        }
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/assets/[id]/comments] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



