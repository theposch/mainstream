/**
 * Admin Streams API Route
 * 
 * GET /api/admin/streams - List all streams with stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

interface StreamWithStats {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_private: boolean;
  status: string;
  created_at: string;
  owner: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
  asset_count: number;
  member_count: number;
}

/**
 * GET /api/admin/streams
 * 
 * Query params:
 * - search: string (optional) - filter by name
 * - status: 'all' | 'active' | 'archived' (default: 'all')
 * - page: number (default: 1)
 * - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const supabase = await createAdminClient();

    // Build query for streams
    let query = supabase
      .from('streams')
      .select(`
        id,
        name,
        description,
        cover_image_url,
        is_private,
        status,
        created_at,
        owner_id,
        owner_type
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: streams, error: streamsError, count } = await query;

    if (streamsError) {
      console.error('[GET /api/admin/streams] Error fetching streams:', streamsError);
      return NextResponse.json(
        { error: 'Failed to fetch streams' },
        { status: 500 }
      );
    }

    if (!streams || streams.length === 0) {
      return NextResponse.json({
        streams: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      });
    }

    // Get owner details for user-owned streams
    const userOwnerIds = streams
      .filter(s => s.owner_type === 'user')
      .map(s => s.owner_id);

    const { data: owners } = userOwnerIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', userOwnerIds)
      : { data: [] };

    const ownerMap = new Map((owners || []).map(o => [o.id, o]));

    // Get asset counts for all streams
    const streamIds = streams.map(s => s.id);
    
    const { data: assetCounts } = await supabase
      .from('asset_streams')
      .select('stream_id')
      .in('stream_id', streamIds);

    const assetCountMap = new Map<string, number>();
    (assetCounts || []).forEach(ac => {
      assetCountMap.set(ac.stream_id, (assetCountMap.get(ac.stream_id) || 0) + 1);
    });

    // Get member counts for all streams
    const { data: memberCounts } = await supabase
      .from('stream_members')
      .select('stream_id')
      .in('stream_id', streamIds);

    const memberCountMap = new Map<string, number>();
    (memberCounts || []).forEach(mc => {
      memberCountMap.set(mc.stream_id, (memberCountMap.get(mc.stream_id) || 0) + 1);
    });

    // Build response
    const streamsWithStats: StreamWithStats[] = streams.map(stream => ({
      id: stream.id,
      name: stream.name,
      description: stream.description,
      cover_image_url: stream.cover_image_url,
      is_private: stream.is_private,
      status: stream.status,
      created_at: stream.created_at,
      owner: stream.owner_type === 'user' ? ownerMap.get(stream.owner_id) || null : null,
      asset_count: assetCountMap.get(stream.id) || 0,
      member_count: memberCountMap.get(stream.id) || 0,
    }));

    return NextResponse.json({
      streams: streamsWithStats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('[GET /api/admin/streams] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

