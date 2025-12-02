/**
 * Streams API Route
 * 
 * Handles CRUD operations for streams
 * 
 * GET /api/streams - List all public streams (or user's private streams if authenticated)
 * POST /api/streams - Create a new stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/streams
 * 
 * Query parameters:
 * - owner_id: Filter by owner (UUID)
 * - owner_type: Filter by owner type ('user' | 'team')
 * - status: Filter by status ('active' | 'archived')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('owner_id');
    const ownerType = searchParams.get('owner_type');
    const status = searchParams.get('status') || 'active';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('streams')
      .select('*')
      .eq('status', status);

    // Filter by owner if provided
    if (ownerId && ownerType) {
      query = query.eq('owner_id', ownerId).eq('owner_type', ownerType);
    }

    // If not authenticated, only show public streams
    if (!user) {
      query = query.eq('is_private', false);
    } else {
      // If authenticated, show public streams + user's private streams
      query = query.or(`is_private.eq.false,owner_id.eq.${user.id}`);
    }

    const { data: streams, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/streams] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch streams' },
        { status: 500 }
      );
    }

    return NextResponse.json({ streams: streams || [] });
  } catch (error) {
    console.error('[GET /api/streams] Error:', error);
      return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
      );
    }
}

/**
 * POST /api/streams
 * 
 * Creates a new stream
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, owner_type, owner_id, is_private, cover_image_url } = body;

    // Validate name (slug format)
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      return NextResponse.json(
        { error: 'Invalid stream name. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }

    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: 'Stream name must be between 2 and 50 characters' },
        { status: 400 }
      );
    }

    // Check if stream name already exists
    const { data: existing } = await supabase
      .from('streams')
      .select('*')
      .eq('name', name)
      .single();

    if (existing) {
      // Return existing stream instead of error (idempotent API)
      return NextResponse.json({ stream: existing }, { status: 200 });
    }

    // Create stream
    const { data: stream, error: createError } = await supabase
      .from('streams')
      .insert({
        name,
        description: description || null,
        owner_type: owner_type || 'user',
        owner_id: owner_id || user.id,
        is_private: is_private || false,
        cover_image_url: cover_image_url || null,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('[POST /api/streams] Error:', createError);
      return NextResponse.json(
        { error: 'Failed to create stream', message: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ stream }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/streams] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
