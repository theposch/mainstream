/**
 * Avatar Upload API Route
 * 
 * Handles uploading and updating user profile pictures
 * 
 * POST /api/users/me/avatar - Upload a new avatar
 * DELETE /api/users/me/avatar - Remove avatar (reset to default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

// Avatar config
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const AVATAR_SIZE = 256; // Output size in pixels
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * POST /api/users/me/avatar
 * 
 * Upload a new avatar image
 */
export async function POST(request: NextRequest) {
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

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > AVATAR_MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      );
    }

    // Read file buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with Sharp - resize and optimize
    const processedImage = await sharp(buffer)
      .resize(AVATAR_SIZE, AVATAR_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Create avatars directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${authUser.id}-${Date.now()}.jpg`;
    const filepath = path.join(uploadsDir, filename);

    // Write file
    await writeFile(filepath, processedImage);

    // Get the old avatar to delete if it's a local file
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', authUser.id)
      .single();

    // Delete old avatar if it's a local file
    if (currentUser?.avatar_url?.startsWith('/uploads/avatars/')) {
      // Strip leading slash to avoid path.join treating it as absolute path
      const relativePath = currentUser.avatar_url.slice(1);
      const oldFilepath = path.join(process.cwd(), 'public', relativePath);
      if (existsSync(oldFilepath)) {
        try {
          await unlink(oldFilepath);
        } catch (e) {
          console.error('Failed to delete old avatar:', e);
        }
      }
    }

    // Update user with new avatar URL
    const avatarUrl = `/uploads/avatars/${filename}`;
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('[POST /api/users/me/avatar] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[POST /api/users/me/avatar] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/me/avatar
 * 
 * Remove avatar and reset to default
 */
export async function DELETE() {
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

    // Get the current avatar
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url, email')
      .eq('id', authUser.id)
      .single();

    // Delete old avatar if it's a local file
    if (currentUser?.avatar_url?.startsWith('/uploads/avatars/')) {
      // Strip leading slash to avoid path.join treating it as absolute path
      const relativePath = currentUser.avatar_url.slice(1);
      const filepath = path.join(process.cwd(), 'public', relativePath);
      if (existsSync(filepath)) {
        try {
          await unlink(filepath);
        } catch (e) {
          console.error('Failed to delete avatar:', e);
        }
      }
    }

    // Reset to default avatar (Vercel Avatar)
    const defaultAvatar = `https://avatar.vercel.sh/${currentUser?.email || authUser.id}.png`;
    
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: defaultAvatar })
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('[DELETE /api/users/me/avatar] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to reset avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatarUrl: defaultAvatar,
      user: updatedUser,
    });
  } catch (error) {
    console.error('[DELETE /api/users/me/avatar] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

