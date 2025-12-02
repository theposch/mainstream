/**
 * Stream Bookmarks API Route
 * 
 * Handles CRUD operations for stream bookmarks (external links)
 * 
 * GET /api/streams/[id]/bookmarks - Get all bookmarks for a stream
 * POST /api/streams/[id]/bookmarks - Add a bookmark to a stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/[id]/bookmarks
 * 
 * Returns all bookmarks for a stream, ordered by position
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();

    // Fetch bookmarks with creator info
    const { data: bookmarks, error } = await supabase
      .from('stream_bookmarks')
      .select(`
        *,
        creator:created_by (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('stream_id', streamId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[GET /api/streams/[id]/bookmarks] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmarks: bookmarks || [] });
  } catch (error) {
    console.error('[GET /api/streams/[id]/bookmarks] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams/[id]/bookmarks
 * 
 * Adds a new bookmark to a stream
 * Any authenticated user can add bookmarks (contributors)
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

    // Parse request body
    const body = await request.json();
    const { url, title } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Verify stream exists
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id')
      .eq('id', streamId)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Get the highest position for ordering
    const { data: maxPositionResult } = await supabase
      .from('stream_bookmarks')
      .select('position')
      .eq('stream_id', streamId)
      .order('position', { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPositionResult?.position ?? -1) + 1;

    // Insert bookmark
    const { data: bookmark, error: insertError } = await supabase
      .from('stream_bookmarks')
      .insert({
        stream_id: streamId,
        url,
        title: title || null,
        created_by: currentUser.id,
        position: nextPosition,
      })
      .select(`
        *,
        creator:created_by (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (insertError) {
      console.error('[POST /api/streams/[id]/bookmarks] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/streams/[id]/bookmarks] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

