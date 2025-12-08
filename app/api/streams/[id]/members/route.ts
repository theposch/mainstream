/**
 * Stream Members API Route
 * 
 * Manages members of private streams
 * 
 * GET /api/streams/[id]/members - List all members
 * POST /api/streams/[id]/members - Add a member (owner/admin only)
 * DELETE /api/streams/[id]/members?user_id=xxx - Remove a member (owner/admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/[id]/members
 * 
 * Returns all members of a stream with their user details
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Fetch stream to check if it exists and get owner info
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, owner_id, owner_type, is_private')
      .or(`id.eq.${streamId},name.eq.${streamId}`)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // For private streams, check if user has access
    if (stream.is_private) {
      if (!currentUser) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Check if user is owner or member
      const isOwner = stream.owner_id === currentUser.id;
      
      if (!isOwner) {
        const { data: membership } = await supabase
          .from('stream_members')
          .select('role')
          .eq('stream_id', stream.id)
          .eq('user_id', currentUser.id)
          .single();

        if (!membership) {
          return NextResponse.json(
            { error: 'You do not have access to this stream' },
            { status: 403 }
          );
        }
      }
    }

    // Fetch members with user details
    const { data: members, error: membersError } = await supabase
      .from('stream_members')
      .select(`
        user_id,
        role,
        joined_at,
        user:users!user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('stream_id', stream.id)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('[GET /api/streams/[id]/members] Error:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      );
    }

    // Determine current user's role
    let currentUserRole: string | null = null;
    if (currentUser) {
      if (stream.owner_id === currentUser.id) {
        currentUserRole = 'owner';
      } else {
        const userMembership = members?.find(m => m.user_id === currentUser.id);
        currentUserRole = userMembership?.role || null;
      }
    }

    return NextResponse.json({
      members: members || [],
      memberCount: members?.length || 0,
      currentUserRole,
      streamId: stream.id,
    });
  } catch (error) {
    console.error('[GET /api/streams/[id]/members] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/streams/[id]/members
 * 
 * Adds a user as a member to the stream (owner/admin only)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { user_id, role = 'member' } = body;

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'member'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "admin" or "member"' },
        { status: 400 }
      );
    }

    // Fetch stream
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, owner_id, owner_type, is_private')
      .or(`id.eq.${streamId},name.eq.${streamId}`)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check if current user is owner or admin
    const isOwner = stream.owner_id === currentUser.id;
    
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('stream_members')
        .select('role')
        .eq('stream_id', stream.id)
        .eq('user_id', currentUser.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only stream owners and admins can add members' },
          { status: 403 }
        );
      }
    }

    // Cannot add the owner as a member (they already have full access)
    if (user_id === stream.owner_id) {
      return NextResponse.json(
        { error: 'Cannot add stream owner as a member' },
        { status: 400 }
      );
    }

    // Verify user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .eq('id', user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Add member
    const { error: insertError } = await supabase
      .from('stream_members')
      .insert({
        stream_id: stream.id,
        user_id,
        role,
      });

    // If already a member, return success (idempotent)
    if (insertError?.code === '23505') {
      return NextResponse.json({ 
        message: 'User is already a member',
        member: { user_id, role, user: targetUser }
      });
    }

    if (insertError) {
      console.error('[POST /api/streams/[id]/members] Error:', insertError);
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      member: {
        user_id,
        role,
        joined_at: new Date().toISOString(),
        user: targetUser
      }
    }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/streams/[id]/members] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/[id]/members?user_id=xxx
 * 
 * Removes a member from the stream (owner/admin only, or user removing themselves)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: streamId } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = request.nextUrl.searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch stream
    const { data: stream, error: streamError } = await supabase
      .from('streams')
      .select('id, owner_id, owner_type')
      .or(`id.eq.${streamId},name.eq.${streamId}`)
      .single();

    if (streamError || !stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const isOwner = stream.owner_id === currentUser.id;
    const isRemovingSelf = userId === currentUser.id;

    // Check permissions
    if (!isOwner && !isRemovingSelf) {
      // Check if current user is admin
      const { data: membership } = await supabase
        .from('stream_members')
        .select('role')
        .eq('stream_id', stream.id)
        .eq('user_id', currentUser.id)
        .single();

      if (!membership || membership.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only stream owners and admins can remove members' },
          { status: 403 }
        );
      }

      // Admins cannot remove other admins (only owner can)
      const { data: targetMembership } = await supabase
        .from('stream_members')
        .select('role')
        .eq('stream_id', stream.id)
        .eq('user_id', userId)
        .single();

      if (targetMembership?.role === 'admin') {
        return NextResponse.json(
          { error: 'Only the stream owner can remove admins' },
          { status: 403 }
        );
      }
    }

    // Delete member
    const { error: deleteError } = await supabase
      .from('stream_members')
      .delete()
      .eq('stream_id', stream.id)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('[DELETE /api/streams/[id]/members] Error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/streams/[id]/members] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

