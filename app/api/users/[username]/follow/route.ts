/**
 * User Follow API Route
 * 
 * Handles following/unfollowing users
 * 
 * POST /api/users/[username]/follow - Follow a user
 * DELETE /api/users/[username]/follow - Unfollow a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shouldCreateNotification } from '@/lib/notifications/check-preferences';

interface RouteContext {
  params: Promise<{
    username: string;
  }>;
}

/**
 * POST /api/users/[username]/follow
 * 
 * Follows a user and creates a notification
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Can't follow yourself
    if (targetUser.id === currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Insert follow relationship
    const { error: followError } = await supabase
      .from('user_follows')
      .insert({
        follower_id: currentUser.id,
        following_id: targetUser.id,
      });

    // If already following, return success
    if (followError?.code === '23505') {
      return NextResponse.json({ message: 'Already following' });
    }

    if (followError) {
      console.error('[POST /api/users/[username]/follow] Error:', followError);
      return NextResponse.json(
        { error: 'Failed to follow user' },
        { status: 500 }
      );
    }

    // Create notification if recipient has notifications enabled for follows
    const shouldNotify = await shouldCreateNotification(supabase, targetUser.id, 'follow');
    
    if (shouldNotify) {
      const { error: notificationError } = await supabase.from('notifications').insert({
        type: 'follow',
        recipient_id: targetUser.id,
        actor_id: currentUser.id,
        resource_id: currentUser.id,
        resource_type: 'user',
      });

      if (notificationError) {
        console.warn('[POST /api/users/[username]/follow] Failed to create notification:', notificationError);
        // Continue anyway - follow was successful
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[POST /api/users/[username]/follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[username]/follow
 * 
 * Unfollows a user
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { username } = await context.params;
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get target user
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete follow relationship
    const { error: unfollowError } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetUser.id);

    if (unfollowError) {
      console.error('[DELETE /api/users/[username]/follow] Error:', unfollowError);
      return NextResponse.json(
        { error: 'Failed to unfollow user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/users/[username]/follow] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



