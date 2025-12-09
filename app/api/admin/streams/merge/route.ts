/**
 * Admin Stream Merge API Route
 * 
 * POST /api/admin/streams/merge - Merge source stream into target stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/streams/merge
 * 
 * Merges source stream into target stream:
 * - Moves all assets from source to target (avoiding duplicates)
 * - Moves all members from source to target (avoiding duplicates)
 * - Moves all resources from source to target
 * - Deletes the source stream
 * 
 * Body: { sourceId: string, targetId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sourceId, targetId } = body;

    if (!sourceId || !targetId) {
      return NextResponse.json(
        { error: 'sourceId and targetId are required' },
        { status: 400 }
      );
    }

    if (sourceId === targetId) {
      return NextResponse.json(
        { error: 'Cannot merge stream into itself' },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Verify both streams exist
    const { data: streams, error: fetchError } = await supabase
      .from('streams')
      .select('id, name')
      .in('id', [sourceId, targetId]);

    if (fetchError || !streams || streams.length !== 2) {
      return NextResponse.json(
        { error: 'One or both streams not found' },
        { status: 404 }
      );
    }

    const sourceStream = streams.find(s => s.id === sourceId);
    const targetStream = streams.find(s => s.id === targetId);

    // Step 1: Get assets already in target stream (to avoid duplicates)
    const { data: targetAssets } = await supabase
      .from('asset_streams')
      .select('asset_id')
      .eq('stream_id', targetId);

    const targetAssetIds = new Set((targetAssets || []).map(a => a.asset_id));

    // Step 2: Get assets in source stream
    const { data: sourceAssets } = await supabase
      .from('asset_streams')
      .select('asset_id')
      .eq('stream_id', sourceId);

    // Step 3: Move assets that aren't already in target
    const assetsToMove = (sourceAssets || [])
      .filter(a => !targetAssetIds.has(a.asset_id))
      .map(a => a.asset_id);

    if (assetsToMove.length > 0) {
      // Update stream_id for assets not in target
      const { error: moveAssetsError } = await supabase
        .from('asset_streams')
        .update({ stream_id: targetId })
        .eq('stream_id', sourceId)
        .in('asset_id', assetsToMove);

      if (moveAssetsError) {
        console.error('[POST /api/admin/streams/merge] Move assets error:', moveAssetsError);
        return NextResponse.json(
          { error: 'Failed to move assets' },
          { status: 500 }
        );
      }
    }

    // Delete remaining asset_streams entries for source (duplicates)
    const { error: deleteAssetStreamsError } = await supabase
      .from('asset_streams')
      .delete()
      .eq('stream_id', sourceId);

    if (deleteAssetStreamsError) {
      console.error('[POST /api/admin/streams/merge] Delete asset_streams error:', deleteAssetStreamsError);
      return NextResponse.json(
        { error: 'Failed to clean up source stream asset links' },
        { status: 500 }
      );
    }

    // Step 4: Get members already in target stream (to avoid duplicates)
    const { data: targetMembers } = await supabase
      .from('stream_members')
      .select('user_id')
      .eq('stream_id', targetId);

    const targetMemberIds = new Set((targetMembers || []).map(m => m.user_id));

    // Step 5: Get members in source stream
    const { data: sourceMembers } = await supabase
      .from('stream_members')
      .select('user_id, role')
      .eq('stream_id', sourceId);

    // Step 6: Add source members to target (if not already member)
    const membersToAdd = (sourceMembers || [])
      .filter(m => !targetMemberIds.has(m.user_id));

    if (membersToAdd.length > 0) {
      const { error: addMembersError } = await supabase
        .from('stream_members')
        .insert(membersToAdd.map(m => ({
          stream_id: targetId,
          user_id: m.user_id,
          role: m.role === 'owner' ? 'member' : m.role, // Demote owners to members
        })));

      if (addMembersError) {
        console.error('[POST /api/admin/streams/merge] Add members error:', addMembersError);
        // CRITICAL: Do NOT delete source members if we failed to add them to target
        // This would orphan them from the merge operation
        return NextResponse.json(
          { error: 'Failed to add members to target stream. Merge aborted to prevent data loss.' },
          { status: 500 }
        );
      }
    }

    // Delete source stream members (safe now - we've either added them to target or aborted)
    const { error: deleteMembersError } = await supabase
      .from('stream_members')
      .delete()
      .eq('stream_id', sourceId);

    if (deleteMembersError) {
      console.error('[POST /api/admin/streams/merge] Delete stream_members error:', deleteMembersError);
      return NextResponse.json(
        { error: 'Failed to clean up source stream members' },
        { status: 500 }
      );
    }

    // Step 7: Move resources from source to target
    const { error: moveResourcesError } = await supabase
      .from('stream_resources')
      .update({ stream_id: targetId })
      .eq('stream_id', sourceId);

    if (moveResourcesError) {
      console.error('[POST /api/admin/streams/merge] Move resources error:', moveResourcesError);
      // Non-fatal, continue with merge
    }

    // Step 8: Delete the source stream
    const { error: deleteError } = await supabase
      .from('streams')
      .delete()
      .eq('id', sourceId);

    if (deleteError) {
      console.error('[POST /api/admin/streams/merge] Delete source error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete source stream after merge' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      merged: {
        source: sourceStream,
        target: targetStream,
        assetsMoved: assetsToMove.length,
        membersAdded: membersToAdd.length,
      }
    });
  } catch (error) {
    console.error('[POST /api/admin/streams/merge] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

