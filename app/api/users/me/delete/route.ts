/**
 * Account Deletion API Route
 * 
 * Handles permanent account deletion
 * 
 * DELETE /api/users/me/delete - Delete account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/users/me/delete
 * 
 * Permanently delete user account and all associated data
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to delete account' },
        { status: 400 }
      );
    }

    // Verify password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email!,
      password: password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 401 }
      );
    }

    // Use admin client to delete user data and auth account
    const adminSupabase = await createAdminClient();

    // Delete user's assets (this will cascade to likes, comments, etc. via RLS)
    const { error: assetsError } = await adminSupabase
      .from('assets')
      .delete()
      .eq('uploader_id', authUser.id);

    if (assetsError) {
      console.error('[DELETE /api/users/me/delete] Assets deletion error:', assetsError);
    }

    // Delete user's streams
    const { error: streamsError } = await adminSupabase
      .from('streams')
      .delete()
      .eq('owner_id', authUser.id);

    if (streamsError) {
      console.error('[DELETE /api/users/me/delete] Streams deletion error:', streamsError);
    }

    // Delete user's drops
    const { error: dropsError } = await adminSupabase
      .from('drops')
      .delete()
      .eq('created_by', authUser.id);

    if (dropsError) {
      console.error('[DELETE /api/users/me/delete] Drops deletion error:', dropsError);
    }

    // Delete user profile from users table
    const { error: profileError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', authUser.id);

    if (profileError) {
      console.error('[DELETE /api/users/me/delete] Profile deletion error:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // Delete auth user
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(authUser.id);

    if (deleteAuthError) {
      console.error('[DELETE /api/users/me/delete] Auth deletion error:', deleteAuthError);
      return NextResponse.json(
        { error: 'Failed to delete authentication account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/users/me/delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

