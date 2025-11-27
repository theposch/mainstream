/**
 * Comment Management API Route
 * 
 * Handles update and delete operations for individual comments
 * 
 * PATCH /api/comments/[id] - Update a comment
 * DELETE /api/comments/[id] - Delete a comment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/comments/[id]
 * 
 * Updates a comment (user must be the author)
 */
export async function PATCH(
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

    const body = await request.json();
    const { content } = body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Check if user owns the comment
    const { data: existingComment } = await supabase
      .from('asset_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!existingComment || existingComment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only edit your own comments' },
        { status: 403 }
      );
    }

    // Update comment
    const { data: comment, error: updateError } = await supabase
      .from('asset_comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .select(`
        *,
        user:users!user_id(*)
      `)
      .single();

    if (updateError) {
      console.error('[PATCH /api/comments/[id]] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update comment', message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[PATCH /api/comments/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/comments/[id]
 * 
 * Deletes a comment (user must be the author)
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

    // Check if user owns the comment
    const { data: existingComment } = await supabase
      .from('asset_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (!existingComment || existingComment.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - you can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete comment (CASCADE will delete replies)
    const { error: deleteError } = await supabase
      .from('asset_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      console.error('[DELETE /api/comments/[id]] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete comment', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/comments/[id]] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



