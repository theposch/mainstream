/**
 * Comment Like API Route
 * 
 * Handles liking and unliking comments
 * 
 * POST /api/comments/[id]/like - Like a comment
 * DELETE /api/comments/[id]/like - Unlike a comment
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
 * POST /api/comments/[id]/like
 * 
 * Likes a comment
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: commentId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Insert like (will fail if already exists due to primary key constraint)
    const { error: likeError } = await supabase
      .from('comment_likes')
      .insert({
        comment_id: commentId,
        user_id: user.id,
      });

    // If duplicate key error (23505), user already liked this
    if (likeError?.code === '23505') {
      return NextResponse.json(
        { message: 'Already liked' },
        { status: 200 }
      );
    }

    if (likeError) {
      console.error('[POST /api/comments/[id]/like] Error inserting like:', likeError);
      return NextResponse.json(
        { error: 'Failed to like comment', message: likeError.message },
        { status: 500 }
      );
    }

    // Get comment author to create notification
    const { data: comment, error: commentError } = await supabase
      .from('asset_comments')
      .select('user_id, asset_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      console.warn('[POST /api/comments/[id]/like] Comment not found for notification');
      return NextResponse.json({ success: true });
    }

    // Only create notification if user is not liking their own comment
    // and recipient has notifications enabled for likes
    if (comment.user_id !== user.id) {
      const shouldNotify = await shouldCreateNotification(supabase, comment.user_id, 'like_comment');
      
      if (shouldNotify) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'like_comment',
          recipient_id: comment.user_id,
          actor_id: user.id,
          resource_id: comment.asset_id,
          resource_type: 'asset',
          comment_id: commentId,
        });

      if (notificationError) {
        console.warn('[POST /api/comments/[id]/like] Failed to create notification:', notificationError);
        // Continue anyway - like was successful
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/comments/[id]/like] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id]/like
 * 
 * Unlikes a comment
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: commentId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete like
    const { error: unlikeError } = await supabase
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('user_id', user.id);

    if (unlikeError) {
      console.error('[DELETE /api/comments/[id]/like] Error deleting like:', unlikeError);
      return NextResponse.json(
        { error: 'Failed to unlike comment', message: unlikeError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/comments/[id]/like] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

