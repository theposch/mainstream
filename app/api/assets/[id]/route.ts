/**
 * Asset Detail API Route
 * 
 * Handles individual asset operations
 * 
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
        console.log(`[DELETE /api/assets/:id] Deleted files for: ${filename}`);
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

