/**
 * Asset Detail API Route
 * 
 * Handles individual asset operations
 * 
 * PATCH /api/assets/:id - Update asset metadata (title, description, streams)
 * DELETE /api/assets/:id - Delete an asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteUploadedFiles } from '@/lib/utils/file-storage';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * PATCH /api/assets/:id
 * 
 * Updates asset metadata (owner only)
 * 
 * Request body:
 * {
 *   title?: string
 *   description?: string
 *   streamIds?: string[]  // Full replacement of stream associations
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Authorization: only uploader can edit
    if (asset.uploader_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only the asset owner can edit it'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { title, description, streamIds } = body;

    // Build update object (only include fields that were provided)
    const updates: Record<string, unknown> = {};
    
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Title must be a non-empty string' },
          { status: 400 }
        );
      }
      updates.title = title.trim();
    }
    
    if (description !== undefined) {
      // Description can be empty string or null
      updates.description = description?.trim() || null;
    }

    // Update asset if there are changes
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('[PATCH /api/assets/:id] Error updating asset:', updateError);
        return NextResponse.json(
          { error: 'Failed to update asset' },
          { status: 500 }
        );
      }
    }

    // Handle stream associations if provided
    if (streamIds !== undefined) {
      if (!Array.isArray(streamIds)) {
        return NextResponse.json(
          { error: 'streamIds must be an array' },
          { status: 400 }
        );
      }

      // Validate stream IDs if any provided
      if (streamIds.length > 0) {
        const { data: streams, error: streamError } = await supabase
          .from('streams')
          .select('id')
          .eq('status', 'active')
          .in('id', streamIds);
        
        if (streamError) {
          console.error('[PATCH /api/assets/:id] Error validating streams:', streamError);
          return NextResponse.json(
            { error: 'Failed to validate streams' },
            { status: 500 }
          );
        }
        
        const validStreamIds = streams?.map(s => s.id) || [];
        const invalidStreamIds = streamIds.filter(id => !validStreamIds.includes(id));
        
        if (invalidStreamIds.length > 0) {
          return NextResponse.json(
            { error: `Invalid stream IDs: ${invalidStreamIds.join(', ')}` },
            { status: 404 }
          );
        }
      }

      // Remove all existing stream associations
      const { error: deleteStreamsError } = await supabase
        .from('asset_streams')
        .delete()
        .eq('asset_id', id);

      if (deleteStreamsError) {
        console.error('[PATCH /api/assets/:id] Error deleting stream associations:', deleteStreamsError);
        return NextResponse.json(
          { error: 'Failed to update stream associations' },
          { status: 500 }
        );
      }

      // Add new stream associations
      if (streamIds.length > 0) {
        const streamAssociations = streamIds.map(streamId => ({
          asset_id: id,
          stream_id: streamId,
          added_by: user.id,
        }));

        const { error: insertStreamsError } = await supabase
          .from('asset_streams')
          .insert(streamAssociations);

        if (insertStreamsError) {
          console.error('[PATCH /api/assets/:id] Error creating stream associations:', insertStreamsError);
          return NextResponse.json(
            { error: 'Failed to update stream associations' },
            { status: 500 }
          );
        }
      }
    }

    // Fetch updated asset with streams
    const { data: updatedAsset, error: refetchError } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:users!assets_uploader_id_fkey(*)
      `)
      .eq('id', id)
      .single();

    if (refetchError) {
      console.error('[PATCH /api/assets/:id] Error fetching updated asset:', refetchError);
    }

    // Fetch streams separately
    const { data: assetStreams } = await supabase
      .from('asset_streams')
      .select('streams(*)')
      .eq('asset_id', id);

    const streams = assetStreams?.map(rel => rel.streams).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      asset: {
        ...updatedAsset,
        streams
      }
    });
  } catch (error) {
    console.error('[PATCH /api/assets/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/:id
 * 
 * Deletes an asset (owner only)
 * Also deletes associated files from storage
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Authorization: only uploader can delete
    if (asset.uploader_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only the asset owner can delete it'
        },
        { status: 403 }
      );
    }

    // Delete from database first (CASCADE will handle asset_likes, asset_comments, asset_streams)
    const { error: deleteError } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/assets/:id] Error deleting asset:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete asset' },
        { status: 500 }
      );
    }

    // Delete physical files from storage
    // Extract filename from URL (e.g., /uploads/full/1234567890-abc123.jpg)
    try {
      const filename = asset.url.split('/').pop();
      if (filename) {
        await deleteUploadedFiles(filename);
      }
    } catch (fileError) {
      // Log but don't fail the request if file deletion fails
      console.error('[DELETE /api/assets/:id] Error deleting files:', fileError);
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Asset deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DELETE /api/assets/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

