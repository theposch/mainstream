/**
 * Asset View API Route
 * 
 * Records that a user has viewed an asset (after 2+ second threshold on client).
 * Uses an atomic stored procedure to ensure consistency.
 * 
 * POST /api/assets/[id]/view - Record a view
 * 
 * Behavior:
 * - Owner views are not counted
 * - First view by a user increments view_count
 * - Subsequent views by same user are no-ops (idempotent)
 * - Returns 202 Accepted for fire-and-forget pattern
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

interface RecordViewResult {
  success: boolean;
  error?: string;
  is_owner?: boolean;
  is_new_view?: boolean;
  view_count?: number;
  counted?: boolean;
}

/**
 * POST /api/assets/[id]/view
 * 
 * Records a view for the current user on the specified asset.
 * Uses atomic RPC to ensure consistency between view record and count.
 */
export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { id: assetId } = await context.params;
    
    // Validate UUID format to fail fast
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assetId)) {
      return NextResponse.json(
        { error: 'Invalid asset ID' },
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

    // Call atomic stored procedure
    // This handles: asset existence check, owner check, view recording, count increment
    const { data, error } = await supabase.rpc('record_asset_view', {
      p_asset_id: assetId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('[POST /api/assets/[id]/view] RPC error:', error.message);
      return NextResponse.json(
        { error: 'Failed to record view' },
        { status: 500 }
      );
    }

    const result = data as RecordViewResult;

    // Handle RPC-level errors (e.g., asset not found)
    if (!result.success) {
      if (result.error === 'asset_not_found') {
        return NextResponse.json(
          { error: 'Asset not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: result.error || 'Unknown error' },
        { status: 500 }
      );
    }

    // 202 Accepted - view processed successfully
    return NextResponse.json(
      { 
        success: true,
        counted: result.is_new_view === true,
        view_count: result.view_count,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('[POST /api/assets/[id]/view] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
