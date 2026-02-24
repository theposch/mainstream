/**
 * Avatar Upload API Route
 *
 * Handles uploading and updating user profile pictures via Supabase Storage.
 *
 * POST   /api/users/me/avatar — Upload a new avatar
 * DELETE /api/users/me/avatar — Remove avatar (reset to default)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const AVATAR_SIZE     = 256;             // Output px (square)
const AVATARS_BUCKET  = 'avatars';
const ALLOWED_TYPES   = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Extracts the storage path from a Supabase Storage avatar URL.
 * Returns null for non-storage URLs (legacy local paths, Vercel Avatar, etc.).
 */
function avatarStoragePath(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  const MARKER = `/storage/v1/object/public/${AVATARS_BUCKET}/`;
  const idx = avatarUrl.indexOf(MARKER);
  if (idx === -1) return null;
  return avatarUrl.slice(idx + MARKER.length) || null;
}

/**
 * POST /api/users/me/avatar
 *
 * Upload a new avatar image. The old avatar is deleted from storage if it was
 * previously uploaded (i.e. it is a Supabase Storage URL in the avatars bucket).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }
    if (file.size > AVATAR_MAX_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      );
    }

    // Resize and optimise to a 256×256 JPEG
    const bytes = await file.arrayBuffer();
    const processedImage = await sharp(Buffer.from(bytes))
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Fetch the current avatar so we can clean it up after a successful upload
    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', authUser.id)
      .single();

    // Upload to Supabase Storage: avatars/{userId}/{timestamp}.jpg
    const filename    = `${Date.now()}.jpg`;
    const storagePath = `${authUser.id}/${filename}`;

    const adminClient = await createAdminClient();

    const { error: uploadError } = await adminClient.storage
      .from(AVATARS_BUCKET)
      .upload(storagePath, processedImage, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('[POST /api/users/me/avatar] Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }

    const { data: { publicUrl: avatarUrl } } = adminClient.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(storagePath);

    // Persist the new URL in the users table
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('[POST /api/users/me/avatar] DB update error:', updateError);
      // Roll back the uploaded file since the DB update failed
      await adminClient.storage.from(AVATARS_BUCKET).remove([storagePath]);
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    // Delete old avatar from storage (best-effort)
    const oldPath = avatarStoragePath(currentUser?.avatar_url);
    if (oldPath && oldPath !== storagePath) {
      await adminClient.storage.from(AVATARS_BUCKET).remove([oldPath]).catch(() => {});
    }

    return NextResponse.json({ success: true, avatarUrl, user: updatedUser });
  } catch (error) {
    console.error('[POST /api/users/me/avatar] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/users/me/avatar
 *
 * Remove avatar and reset to the default Vercel Avatar URL.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('avatar_url, email')
      .eq('id', authUser.id)
      .single();

    // Reset to default avatar (Vercel Avatar)
    const defaultAvatar = `https://avatar.vercel.sh/${currentUser?.email ?? authUser.id}.png`;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: defaultAvatar })
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError) {
      console.error('[DELETE /api/users/me/avatar] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to reset avatar' }, { status: 500 });
    }

    // Delete the old avatar from storage (best-effort, non-blocking)
    const oldPath = avatarStoragePath(currentUser?.avatar_url);
    if (oldPath) {
      const adminClient = await createAdminClient();
      await adminClient.storage.from(AVATARS_BUCKET).remove([oldPath]).catch(() => {});
    }

    return NextResponse.json({ success: true, avatarUrl: defaultAvatar, user: updatedUser });
  } catch (error) {
    console.error('[DELETE /api/users/me/avatar] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
