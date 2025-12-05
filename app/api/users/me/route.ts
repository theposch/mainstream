/**
 * Current User API Route
 * 
 * Handles fetching and updating the authenticated user's profile
 * 
 * GET /api/users/me - Fetch current user profile
 * PUT /api/users/me - Update profile settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/me
 * 
 * Fetches the authenticated user's profile
 */
export async function GET() {
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

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[GET /api/users/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/me
 * 
 * Updates the authenticated user's profile settings
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body (handle both camelCase and snake_case)
    const body = await request.json();
    const { 
      displayName, 
      display_name, 
      username, 
      email, 
      bio,
      jobTitle,
      job_title,
      location,
      avatarUrl,
      avatar_url,
    } = body;
    
    // Use camelCase if provided, otherwise fall back to snake_case
    const finalDisplayName = displayName || display_name;
    const finalJobTitle = jobTitle || job_title;
    const finalAvatarUrl = avatarUrl || avatar_url;

    // Validation
    if (username) {
      // Username format validation
      const usernameRegex = /^[a-z0-9_-]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 3-20 characters, lowercase alphanumeric with hyphens/underscores' },
          { status: 400 }
        );
      }

      // Check username uniqueness (if changed)
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', authUser.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 409 }
        );
      }
    }

    // Email validation
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Bio length validation
    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Location length validation
    if (location && location.length > 100) {
      return NextResponse.json(
        { error: 'Location must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Job title length validation
    if (finalJobTitle && finalJobTitle.length > 100) {
      return NextResponse.json(
        { error: 'Job title must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: Record<string, any> = {};
    if (finalDisplayName !== undefined) updateData.display_name = finalDisplayName;
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (finalJobTitle !== undefined) updateData.job_title = finalJobTitle;
    if (location !== undefined) updateData.location = location;
    if (finalAvatarUrl !== undefined) updateData.avatar_url = finalAvatarUrl;

    // Update user profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('[PUT /api/users/me] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update profile', details: updateError.message, code: updateError.code },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      user: updatedUser 
    });
  } catch (error) {
    console.error('[PUT /api/users/me] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

