/**
 * Asset View API Route
 * 
 * Records that a user has viewed an asset (after 2+ second threshold on client)
 * Uses UPSERT to handle duplicate views efficiently
 * 
 * POST /api/assets/[id]/view - Record a view
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST /api/assets/[id]/view
 * 
 * Records a view for the current user on the specified asset.
 * - Excludes asset owner (owners viewing their own assets don't count)
 * - Uses UPSERT: new viewers increment count, repeat viewers update timestamp
 * - Returns 202 Accepted (fire-and-forget pattern)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: assetId } = await context.params;
    console.log('[POST /api/assets/[id]/view] Recording view for asset:', assetId);
    
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[POST /api/assets/[id]/view] Auth failed:', authError?.message || 'No user');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('[POST /api/assets/[id]/view] User authenticated:', user.id);

    // Get asset to check ownership
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('uploader_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      console.log('[POST /api/assets/[id]/view] Asset not found:', assetError?.message);
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Don't count owner's own views
    if (asset.uploader_id === user.id) {
      console.log('[POST /api/assets/[id]/view] Owner viewing own asset, not counting');
      return NextResponse.json(
        { message: 'Owner view not counted' },
        { status: 202 }
      );
    }

    // Use admin client for insert to bypass RLS
    // (We've already validated auth and ownership above)
    const adminSupabase = await createAdminClient();

    // Check if view already exists
    const { data: existingView } = await adminSupabase
      .from('asset_views')
      .select('asset_id')
      .eq('asset_id', assetId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingView) {
      // View already exists - just update timestamp (no count increment)
      const { error: updateError } = await adminSupabase
        .from('asset_views')
        .update({ viewed_at: new Date().toISOString() })
        .eq('asset_id', assetId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[POST /api/assets/[id]/view] Error updating view timestamp:', updateError);
      }
      console.log('[POST /api/assets/[id]/view] Repeat view - timestamp updated');
    } else {
      // New view - INSERT the view record
      const { error: insertError } = await adminSupabase
        .from('asset_views')
        .insert({
          asset_id: assetId,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[POST /api/assets/[id]/view] Error recording view:', insertError);
        return NextResponse.json(
          { error: 'Failed to record view' },
          { status: 500 }
        );
      }

      // Manually increment view_count (trigger isn't reliable via Supabase client)
      const { error: incrementError } = await adminSupabase.rpc('increment_view_count', {
        asset_id: assetId
      });

      if (incrementError) {
        console.error('[POST /api/assets/[id]/view] Error incrementing count:', incrementError);
        // Don't fail the request - view was recorded, count will be eventually consistent
      }

      console.log('[POST /api/assets/[id]/view] New view recorded and count incremented');
    }

    // 202 Accepted - view recorded (or updated)
    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    console.error('[POST /api/assets/[id]/view] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

