/**
 * Stream Assets API Route
 * 
 * Handles adding/removing assets to/from streams
 * 
 * GET /api/streams/[id]/assets - Get all assets in a stream
 * POST /api/streams/[id]/assets - Add asset to stream
 * DELETE /api/streams/[id]/assets?asset_id=xxx - Remove asset from stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/streams/[id]/assets
 * 
 * Fetches all assets in a stream
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();

    // Get assets via junction table
    const { data, error } = await supabase
      .from('asset_streams')
      .select(`
        asset_id,
        added_at,
        assets (
          *,
          uploader:users!uploader_id(*)
        )
      `)
      .eq('stream_id', streamId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[GET /api/streams/[id]/assets] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch stream assets' },
        { status: 500 }
      );
    }

    // Extract assets from junction table results
    const assets = data?.map(item => item.assets).filter(Boolean) || [];

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('[GET /api/streams/[id]/assets] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams/[id]/assets
 * 
 * Adds an asset to a stream
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
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
    const { asset_id } = body;

    if (!asset_id) {
      return NextResponse.json(
        { error: 'asset_id is required' },
        { status: 400 }
      );
    }

    // Add asset to stream
    const { error: insertError } = await supabase
      .from('asset_streams')
      .insert({
        asset_id,
        stream_id: streamId,
        added_by: user.id,
      });

    // If already exists, return success
    if (insertError?.code === '23505') {
      return NextResponse.json({ message: 'Asset already in stream' });
    }

    if (insertError) {
      console.error('[POST /api/streams/[id]/assets] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add asset to stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/streams/[id]/assets] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/[id]/assets?asset_id=xxx
 * 
 * Removes an asset from a stream
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const assetId = request.nextUrl.searchParams.get('asset_id');

    if (!assetId) {
      return NextResponse.json(
        { error: 'asset_id query parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Remove asset from stream
    const { error: deleteError } = await supabase
      .from('asset_streams')
      .delete()
      .eq('asset_id', assetId)
      .eq('stream_id', streamId);

    if (deleteError) {
      console.error('[DELETE /api/streams/[id]/assets] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove asset from stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/streams/[id]/assets] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
