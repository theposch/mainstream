/**
 * Admin Single User API Route
 * 
 * PATCH /api/admin/users/[id] - Update user role
 * DELETE /api/admin/users/[id] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminUser, isOwner } from '@/lib/auth/require-admin';
import type { PlatformRole } from '@/lib/auth/get-user';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/users/[id]
 * 
 * Update a user's platform role
 * Only owners can change roles (admins cannot promote/demote)
 * 
 * Body: { platform_role: 'user' | 'admin' | 'owner' }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Only owners can change roles
    if (!isOwner(admin.platformRole)) {
      return NextResponse.json(
        { error: 'Only the platform owner can change user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const newRole = body.platform_role as PlatformRole;

    // Validate role
    if (!['user', 'admin', 'owner'].includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be user, admin, or owner' },
        { status: 400 }
      );
    }

    // Get target user
    const supabase = await createAdminClient();
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, platform_role')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent demoting the owner
    if (targetUser.platform_role === 'owner' && newRole !== 'owner') {
      return NextResponse.json(
        { error: 'Cannot demote the platform owner. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // If promoting someone to owner, demote current owner to admin
    if (newRole === 'owner' && targetUser.platform_role !== 'owner') {
      // Demote current owner to admin
      const { error: demoteError } = await supabase
        .from('users')
        .update({ platform_role: 'admin' })
        .eq('id', admin.id);

      if (demoteError) {
        console.error('[PATCH /api/admin/users] Error demoting owner:', demoteError);
        return NextResponse.json(
          { error: 'Failed to transfer ownership' },
          { status: 500 }
        );
      }
    }

    // Update target user's role
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ platform_role: newRole })
      .eq('id', targetUserId)
      .select('id, username, display_name, email, avatar_url, platform_role, created_at')
      .single();

    if (updateError) {
      console.error('[PATCH /api/admin/users] Error updating user:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('[PATCH /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 
 * Delete a user account
 * Admins can delete regular users, owner can delete anyone except themselves
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: targetUserId } = await params;
    
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Cannot delete yourself
    if (targetUserId === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account from admin panel' },
        { status: 400 }
      );
    }

    // Get target user
    const supabase = await createAdminClient();
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('id, platform_role, username')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot delete the owner
    if (targetUser.platform_role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot delete the platform owner' },
        { status: 400 }
      );
    }

    // Admins can only delete regular users, not other admins
    if (!isOwner(admin.platformRole) && targetUser.platform_role === 'admin') {
      return NextResponse.json(
        { error: 'Only the owner can delete admin accounts' },
        { status: 403 }
      );
    }

    // Delete the user from public.users (will cascade to related data)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUserId);

    if (deleteError) {
      console.error('[DELETE /api/admin/users] Error deleting user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      );
    }

    // Also delete from auth.users using admin client
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(targetUserId);

    if (authDeleteError) {
      console.error('[DELETE /api/admin/users] Error deleting auth user:', authDeleteError);
      // User is already deleted from public.users, so we just log the error
    }

    return NextResponse.json({ 
      success: true, 
      message: `User ${targetUser.username} has been deleted` 
    });
  } catch (error) {
    console.error('[DELETE /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

