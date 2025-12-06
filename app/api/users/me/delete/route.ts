/**
 * Account Deletion API Route
 * 
 * Handles permanent account deletion
 * 
 * DELETE /api/users/me/delete - Delete account
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

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

    // Collect errors - we need all data deletions to succeed before removing the account
    const deletionErrors: string[] = [];

    // Delete user's assets (this will cascade to likes, comments, etc. via RLS)
    const { error: assetsError } = await adminSupabase
      .from('assets')
      .delete()
      .eq('uploader_id', authUser.id);

    if (assetsError) {
      console.error('[DELETE /api/users/me/delete] Assets deletion error:', assetsError);
      deletionErrors.push('assets');
    }

    // Delete user's streams
    const { error: streamsError } = await adminSupabase
      .from('streams')
      .delete()
      .eq('owner_id', authUser.id);

    if (streamsError) {
      console.error('[DELETE /api/users/me/delete] Streams deletion error:', streamsError);
      deletionErrors.push('streams');
    }

    // Delete user's drops
    const { error: dropsError } = await adminSupabase
      .from('drops')
      .delete()
      .eq('created_by', authUser.id);

    if (dropsError) {
      console.error('[DELETE /api/users/me/delete] Drops deletion error:', dropsError);
      deletionErrors.push('drops');
    }

    // If any data deletion failed, abort to prevent orphaned data
    if (deletionErrors.length > 0) {
      console.error('[DELETE /api/users/me/delete] Aborting - failed to delete:', deletionErrors.join(', '));
      return NextResponse.json(
        { error: `Failed to delete account data (${deletionErrors.join(', ')}). Please try again or contact support.` },
        { status: 500 }
      );
    }

    // Cleanup uploaded avatar file if it exists
    const { data: userProfile } = await adminSupabase
      .from('users')
      .select('avatar_url')
      .eq('id', authUser.id)
      .single();

    if (userProfile?.avatar_url?.startsWith('/uploads/avatars/')) {
      try {
        const relativePath = userProfile.avatar_url.slice(1); // Strip leading slash
        const filepath = path.join(process.cwd(), 'public', relativePath);
        if (existsSync(filepath)) {
          await unlink(filepath);
        }
      } catch (e) {
        // Non-critical: log but continue with deletion
        console.error('[DELETE /api/users/me/delete] Failed to delete avatar file:', e);
      }
    }

    // Delete user profile from users table
    const { error: profileError } = await adminSupabase
      .from('users')
      .delete()
      .eq('id', authUser.id);

    if (profileError) {
      console.error('[DELETE /api/users/me/delete] Profile deletion error:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete account profile. Please try again or contact support.' },
        { status: 500 }
      );
    }

    // Delete auth user - only after all data is successfully removed
    const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(authUser.id);

    if (deleteAuthError) {
      console.error('[DELETE /api/users/me/delete] Auth deletion error:', deleteAuthError);
      // Note: At this point, user data is deleted but auth remains
      // This is a safer failure mode - user can still log in and retry
      return NextResponse.json(
        { error: 'Failed to complete account deletion. Please try again or contact support.' },
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

