/**
 * Asset Like API Route
 * 
 * Handles liking and unliking assets with real-time notifications.
 * 
 * POST /api/assets/[id]/like - Like an asset
 * DELETE /api/assets/[id]/like - Unlike an asset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/assets/[id]/like
 * 
 * Likes an asset and creates a notification for the asset owner
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

    // Insert like (will fail if already exists due to primary key constraint)
    const { error: likeError } = await supabase
      .from('asset_likes')
      .insert({
        asset_id: assetId,
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
      console.error('[POST /api/assets/[id]/like] Error inserting like:', likeError);
      return NextResponse.json(
        { error: 'Failed to like asset', message: likeError.message },
        { status: 500 }
      );
    }

    // Get asset owner to create notification
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('uploader_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      console.warn('[POST /api/assets/[id]/like] Asset not found for notification');
      return NextResponse.json({ success: true });
    }

    // Only create notification if user is not liking their own asset
    if (asset.uploader_id !== user.id) {
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          type: 'like_asset',
          recipient_id: asset.uploader_id,
          actor_id: user.id,
          resource_id: assetId,
          resource_type: 'asset',
        });

      if (notificationError) {
        console.warn('[POST /api/assets/[id]/like] Failed to create notification:', notificationError);
        // Continue anyway - like was successful
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/assets/[id]/like] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/[id]/like
 * 
 * Unlikes an asset
 */
export async function DELETE(
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

    // Delete like
    const { error: deleteError } = await supabase
      .from('asset_likes')
      .delete()
      .eq('asset_id', assetId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[DELETE /api/assets/[id]/like] Error deleting like:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlike asset', message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/assets/[id]/like] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



