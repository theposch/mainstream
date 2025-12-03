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
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get asset to check ownership
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('uploader_id')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Don't count owner's own views
    if (asset.uploader_id === user.id) {
      return NextResponse.json(
        { message: 'Owner view not counted' },
        { status: 202 }
      );
    }

    // Use admin client for insert to bypass RLS
    // (We've already validated auth and ownership above)
    const adminSupabase = await createAdminClient();

    // UPSERT: Insert new view or update timestamp for existing
    // The trigger only fires on INSERT, so repeat views won't increment count
    const { error: viewError } = await adminSupabase
      .from('asset_views')
      .upsert(
        {
          asset_id: assetId,
          user_id: user.id,
          viewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'asset_id,user_id',
        }
      );

    if (viewError) {
      console.error('[POST /api/assets/[id]/view] Error recording view:', viewError);
      return NextResponse.json(
        { error: 'Failed to record view' },
        { status: 500 }
      );
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

