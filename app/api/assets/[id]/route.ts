/**
 * Asset Detail API Route
 * 
 * Handles individual asset operations
 * 
 * GET /api/assets/:id - Fetch a single asset with enriched data
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
 * GET /api/assets/:id
 * 
 * Fetches a single asset with enriched data including:
 * - Uploader info
 * - Associated streams
 * - Like count and current user's like status
 * - View count
 * 
 * This endpoint supports deep linking for modal overlays.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Validate UUID format to prevent invalid queries
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid asset ID format' },
        { status: 400 }
      );
    }

    // Get current user for like status check (optional - unauthenticated users can still view)
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch asset with uploader info and like count
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:users!uploader_id(
          id,
          username,
          display_name,
          avatar_url,
          email,
          job_title
        ),
        asset_likes(count)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Fetch associated streams
    const { data: assetStreams } = await supabase
      .from('asset_streams')
      .select('streams(*)')
      .eq('asset_id', id);

    const streams = assetStreams?.map(rel => rel.streams).filter(Boolean) || [];

    // Check if current user has liked this asset
    let isLikedByCurrentUser = false;
    if (user) {
      const { data: userLike } = await supabase
        .from('asset_likes')
        .select('asset_id')
        .eq('asset_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      isLikedByCurrentUser = !!userLike;
    }

    // Get view count
    const { count: viewCount } = await supabase
      .from('asset_views')
      .select('*', { count: 'exact', head: true })
      .eq('asset_id', id);

    // Transform asset with enriched data
    const enrichedAsset = {
      ...asset,
      streams,
      likeCount: asset.asset_likes?.[0]?.count || 0,
      asset_likes: undefined, // Remove raw likes data
      isLikedByCurrentUser,
      view_count: viewCount || 0,
    };

    return NextResponse.json({
      asset: enrichedAsset,
    });
  } catch (error) {
    console.error('[GET /api/assets/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch asset',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
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

    if (refetchError || !updatedAsset) {
      console.error('[PATCH /api/assets/:id] Error fetching updated asset:', refetchError);
      // Update succeeded but refetch failed - return partial success
      // This lets client know the update worked but they may need to refresh
      return NextResponse.json({
        success: true,
        partial: true,
        message: 'Asset updated successfully but could not fetch updated data',
        asset: {
          id,
          ...updates,
        }
      });
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

