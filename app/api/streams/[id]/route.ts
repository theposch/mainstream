/**
 * Stream Detail API Route
 * 
 * Handles individual stream operations
 * 
 * GET /api/streams/:id - Get stream details
 * PUT /api/streams/:id - Update stream
 * DELETE /api/streams/:id - Delete stream
 * PATCH /api/streams/:id - Archive/unarchive stream
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/:id
 * 
 * Fetches a single stream by ID with its resources and members
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch stream by ID or name (slug)
    let query = supabase
      .from('streams')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();

    const { data: stream, error } = await query;

    if (error || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check access permissions for private streams
    if (stream.is_private) {
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user is owner or a member
      let hasAccess = stream.owner_id === user.id;

      if (!hasAccess) {
        // Check stream_members table
        const { data: membership } = await supabase
          .from('stream_members')
          .select('role')
          .eq('stream_id', stream.id)
          .eq('user_id', user.id)
          .single();

        hasAccess = !!membership;
      }

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have access to this stream' },
          { status: 403 }
        );
      }
    }

    // Fetch assets count
    const { count: assetsCount } = await supabase
      .from('asset_streams')
      .select('*', { count: 'exact', head: true })
      .eq('stream_id', stream.id);

    return NextResponse.json(
      {
        stream,
        assetsCount: assetsCount || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/streams/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/streams/:id
 * 
 * Updates a stream
 */
export async function PUT(request: NextRequest, context: RouteContext) {
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

    // Fetch stream
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    
    if (fetchError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Authorization: user must be owner
    if (stream.owner_type === 'user' && stream.owner_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to modify this stream'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, is_private, cover_image_url } = body;
    
    const updates: any = {};

    // Validation for name
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Stream name must be a string' },
          { status: 400 }
        );
      }

      const trimmedName = name.trim();

      if (trimmedName.length < 2) {
        return NextResponse.json(
          { error: 'Stream name must be at least 2 characters' },
          { status: 400 }
        );
      }

      if (trimmedName.length > 50) {
        return NextResponse.json(
          { error: 'Stream name must be less than 50 characters' },
          { status: 400 }
        );
      }

      // Validate slug format
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedName)) {
        return NextResponse.json(
          { error: 'Stream name must use lowercase letters, numbers, and hyphens only' },
          { status: 400 }
        );
      }

      // Check for duplicate stream name
      const { data: duplicateStream } = await supabase
        .from('streams')
        .select('id')
        .eq('name', trimmedName)
        .neq('id', stream.id)
        .single();

      if (duplicateStream) {
        return NextResponse.json(
          { error: 'A stream with this name already exists' },
          { status: 409 }
        );
      }

      updates.name = trimmedName;
    }

    // Validation for description
    if (description !== undefined) {
      if (description && typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Description must be a string' },
          { status: 400 }
        );
      }

      if (description && description.length > 500) {
        return NextResponse.json(
          { error: 'Description must be less than 500 characters' },
          { status: 400 }
        );
      }

      updates.description = description || null;
    }

    if (is_private !== undefined) {
      updates.is_private = Boolean(is_private);
    }

    if (cover_image_url !== undefined) {
      updates.cover_image_url = cover_image_url || null;
    }

    updates.updated_at = new Date().toISOString();

    // Update stream
    const { data: updatedStream, error: updateError } = await supabase
      .from('streams')
      .update(updates)
      .eq('id', stream.id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT /api/streams/:id] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stream' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { stream: updatedStream },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PUT /api/streams/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/:id
 * 
 * Deletes a stream (owner only)
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

    // Fetch stream
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    
    if (fetchError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Authorization: only owner can delete
    if (stream.owner_type === 'user' && stream.owner_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only the stream owner can delete it'
        },
        { status: 403 }
      );
    }

    // Delete the stream (CASCADE will handle asset_streams)
    // Assets will remain in the database and show up in feeds, just without this stream
    const { error: deleteError } = await supabase
      .from('streams')
      .delete()
      .eq('id', stream.id);

    if (deleteError) {
      console.error('[DELETE /api/streams/:id] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete stream' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Stream deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DELETE /api/streams/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/streams/:id
 * 
 * Archives or unarchives a stream
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

    // Fetch stream
    const { data: stream, error: fetchError } = await supabase
      .from('streams')
      .select('*')
      .or(`id.eq.${id},name.eq.${id}`)
      .single();
    
    if (fetchError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Authorization: user must be owner
    if (stream.owner_type === 'user' && stream.owner_id !== user.id) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to modify this stream'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validation
    if (!status || (status !== 'active' && status !== 'archived')) {
      return NextResponse.json(
        { error: 'Status must be "active" or "archived"' },
        { status: 400 }
      );
    }

    // Update status
    const { data: updatedStream, error: updateError } = await supabase
      .from('streams')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', stream.id)
      .select()
      .single();

    if (updateError) {
      console.error('[PATCH /api/streams/:id] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update stream status' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { stream: updatedStream },
      { status: 200 }
    );
  } catch (error) {
    console.error('[PATCH /api/streams/:id] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update stream status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
