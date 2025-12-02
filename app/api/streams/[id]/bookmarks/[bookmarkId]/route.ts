/**
 * Stream Bookmark API Route (Individual)
 * 
 * Handles operations on individual bookmarks
 * 
 * DELETE /api/streams/[id]/bookmarks/[bookmarkId] - Delete a bookmark
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
    bookmarkId: string;
  }>;
}

/**
 * DELETE /api/streams/[id]/bookmarks/[bookmarkId]
 * 
 * Deletes a bookmark
 * Only the creator or stream owner can delete
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId, bookmarkId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch bookmark to check ownership
    const { data: bookmark, error: bookmarkError } = await supabase
      .from('stream_bookmarks')
      .select('id, stream_id, created_by')
      .eq('id', bookmarkId)
      .eq('stream_id', streamId)
      .single();

    if (bookmarkError || !bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Check if user can delete (creator or stream owner)
    const { data: stream } = await supabase
      .from('streams')
      .select('owner_id, owner_type')
      .eq('id', streamId)
      .single();

    const isCreator = bookmark.created_by === currentUser.id;
    const isStreamOwner = stream?.owner_type === 'user' && stream?.owner_id === currentUser.id;

    if (!isCreator && !isStreamOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this bookmark' },
        { status: 403 }
      );
    }

    // Delete bookmark
    const { error: deleteError } = await supabase
      .from('stream_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (deleteError) {
      console.error('[DELETE /api/streams/[id]/bookmarks/[bookmarkId]] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/streams/[id]/bookmarks/[bookmarkId]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

