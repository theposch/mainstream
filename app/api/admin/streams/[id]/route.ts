/**
 * Admin Stream Management API Route
 * 
 * PATCH /api/admin/streams/[id] - Rename stream
 * DELETE /api/admin/streams/[id] - Delete stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/streams/[id]
 * 
 * Rename a stream. Returns conflict if name already exists.
 * 
 * Body: { name: string }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: streamId } = await params;
    
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Normalize name to slug format (lowercase, hyphens)
    const normalizedName = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalizedName.length < 2 || normalizedName.length > 50) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Check if stream exists
    const { data: currentStream, error: fetchError } = await supabase
      .from('streams')
      .select('id, name')
      .eq('id', streamId)
      .single();

    if (fetchError || !currentStream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // If name hasn't changed, return success
    if (currentStream.name === normalizedName) {
      return NextResponse.json({ success: true, stream: currentStream });
    }

    // Check if another stream with this name exists
    const { data: existingStream } = await supabase
      .from('streams')
      .select('id, name')
      .eq('name', normalizedName)
      .neq('id', streamId)
      .single();

    if (existingStream) {
      // Name conflict - client should show merge dialog
      return NextResponse.json(
        { 
          error: 'Name already exists',
          code: 'NAME_CONFLICT',
          existingStream: {
            id: existingStream.id,
            name: existingStream.name,
          }
        },
        { status: 409 }
      );
    }

    // Update the stream name
    const { data: updatedStream, error: updateError } = await supabase
      .from('streams')
      .update({ name: normalizedName, updated_at: new Date().toISOString() })
      .eq('id', streamId)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH /api/admin/streams/[id]] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to rename stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, stream: updatedStream });
  } catch (error) {
    console.error('[PATCH /api/admin/streams/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/streams/[id]
 * 
 * Delete a stream.
 * 
 * Query params:
 * - deleteAssets: 'true' | 'false' (default: false)
 *   If true, also deletes all assets in the stream
 *   If false, assets are just unlinked from the stream
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: streamId } = await params;
    
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deleteAssets = searchParams.get('deleteAssets') === 'true';

    const supabase = await createAdminClient();

    // Check if stream exists
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('id, name')
      .eq('id', streamId)
      .single();

    if (fetchError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    if (deleteAssets) {
      // Get all asset IDs in this stream
      const { data: assetLinks } = await supabase
        .from('asset_streams')
        .select('asset_id')
        .eq('stream_id', streamId);

      const assetIds = (assetLinks || []).map(link => link.asset_id);

      if (assetIds.length > 0) {
        // Delete assets (this will cascade to asset_streams, asset_likes, asset_comments)
        const { error: deleteAssetsError } = await supabase
          .from('assets')
          .delete()
          .in('id', assetIds);

        if (deleteAssetsError) {
          console.error('[DELETE /api/admin/streams/[id]] Delete assets error:', deleteAssetsError);
          return NextResponse.json(
            { error: 'Failed to delete assets' },
            { status: 500 }
          );
        }
      }
    }

    // Delete the stream (cascades to asset_streams, stream_members, stream_resources)
    const { error: deleteError } = await supabase
      .from('streams')
      .delete()
      .eq('id', streamId);

    if (deleteError) {
      console.error('[DELETE /api/admin/streams/[id]] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete stream' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/streams/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

