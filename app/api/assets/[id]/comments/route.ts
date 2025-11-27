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

    // Enhance comments with like counts and user's like status
    const enhancedComments = await Promise.all(
      (comments || []).map(async (comment) => {
        // Get total like count for this comment
        const { count: likeCount } = await supabase
          .from('comment_likes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id);

        // Check if current user has liked this comment
        let hasLiked = false;
        if (currentUser) {
          const { data: userLike } = await supabase
            .from('comment_likes')
            .select('*')
            .eq('comment_id', comment.id)
            .eq('user_id', currentUser.id)
            .single();

          hasLiked = !!userLike;
        }

        return {
          ...comment,
          likes: likeCount || 0,
          has_liked: hasLiked,
        };
      })
    );

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

    // Get asset owner for notification
    const { data: asset } = await supabase
      .from('assets')
      .select('uploader_id')
      .eq('id', assetId)
      .single();

    // Create notification if commenting on someone else's asset
    if (asset && asset.uploader_id !== user.id) {
      await supabase.from('notifications').insert({
        type: parent_id ? 'reply_comment' : 'like_comment',
        recipient_id: asset.uploader_id,
        actor_id: user.id,
        resource_id: comment.id,
        resource_type: 'comment',
      });
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



