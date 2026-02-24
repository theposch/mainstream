/**
 * File Storage Utilities — Supabase Storage
 *
 * Uploads image/video buffers to the Supabase Storage `assets` bucket.
 * Files are organised by uploader and size variant:
 *
 *   assets/{userId}/full/{filename}
 *   assets/{userId}/medium/{filename}
 *   assets/{userId}/thumbnails/{filename}
 *
 * Backward-compatible with legacy local-filesystem URLs (/uploads/…) that
 * may still exist in the database: those are left untouched on deletion.
 */

import path from 'path';
import { randomUUID } from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

const ASSETS_BUCKET = 'assets';

/** Maps file extensions to MIME types for the Content-Type header. */
const CONTENT_TYPES: Record<string, string> = {
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
};

/**
 * No-op kept for API compatibility.
 * Supabase Storage buckets are configured via migration 044.
 */
export function ensureUploadDirectories(): void {
  // No-op: buckets are pre-configured in the database migration.
}

/**
 * Generates a unique filename with timestamp and short UUID segment.
 * Format: {timestamp}-{uuid-segment}{extension}
 * Example: 1732545678901-a3f4b5c6.jpg
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const uuid = randomUUID().split('-')[0];
  return `${timestamp}-${uuid}${ext}`;
}

/**
 * Uploads an image/video buffer to Supabase Storage and returns the public URL.
 *
 * Storage path: assets/{userId}/{size}/{finalFilename}
 * When no userId is provided (e.g. embed thumbnails), the folder `system` is used.
 *
 * @param buffer           - Processed image/video buffer
 * @param filename         - Unique filename (from generateUniqueFilename)
 * @param size             - Size variant ('full' | 'medium' | 'thumbnails')
 * @param overrideExtension - Optional extension override (e.g. '.jpg' for GIF thumbnails)
 * @param userId           - Uploader user ID; defaults to 'system' if omitted
 * @returns Public CDN URL of the uploaded file
 */
export async function saveImageToPublic(
  buffer: Buffer,
  filename: string,
  size: 'full' | 'medium' | 'thumbnails',
  overrideExtension?: string,
  userId?: string
): Promise<string> {
  let finalFilename = filename;
  if (overrideExtension) {
    const baseName = path.parse(filename).name;
    finalFilename = `${baseName}${overrideExtension}`;
  }

  const folder = userId ?? 'system';
  const storagePath = `${folder}/${size}/${finalFilename}`;

  const ext = path.extname(finalFilename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream';

  const adminClient = await createAdminClient();

  const { error } = await adminClient.storage
    .from(ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      cacheControl: '31536000', // 1 year
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage upload failed for ${storagePath}: ${error.message}`);
  }

  const { data: { publicUrl } } = adminClient.storage
    .from(ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  return publicUrl;
}

/**
 * Deletes all size variants of an uploaded asset from storage.
 *
 * Accepts the full asset URL as stored in the database.
 *
 * - Legacy local URLs (/uploads/…) are skipped silently for backward compatibility.
 * - Supabase Storage URLs are parsed and all three size variants are removed.
 *   Both the original extension AND .jpg are attempted for medium/thumbnails so
 *   that WebM videos (whose thumbnails are JPEG) are cleaned up correctly.
 *
 * @param assetUrl - The `url` field value from the `assets` table
 */
export async function deleteUploadedFiles(assetUrl: string): Promise<void> {
  if (!assetUrl) return;

  // Legacy local-filesystem path — leave on disk (backward compatibility)
  if (assetUrl.startsWith('/uploads/')) return;

  // Parse the storage path from the public URL
  // Format: {supabaseUrl}/storage/v1/object/public/assets/{path}
  const MARKER = '/storage/v1/object/public/assets/';
  const markerIdx = assetUrl.indexOf(MARKER);
  if (markerIdx === -1) return; // Unknown URL format — skip

  const storagePath = assetUrl.slice(markerIdx + MARKER.length);
  if (!storagePath) return;

  // storagePath: {userId}/{size}/{filename}
  const parts = storagePath.split('/');
  if (parts.length < 3) {
    // Non-standard path — delete only this file
    const adminClient = await createAdminClient();
    await adminClient.storage.from(ASSETS_BUCKET).remove([storagePath]);
    return;
  }

  const [userId, , filename] = parts;
  const base = path.parse(filename).name;
  const ext  = path.extname(filename);

  // Build candidate paths for all three size variants.
  // We try both the original extension and .jpg because:
  //   - Images: all variants share the same extension
  //   - Videos:  full is .webm; medium + thumbnails are .jpg (FFmpeg frames)
  const pathsToDelete = Array.from(new Set([
    `${userId}/full/${filename}`,
    `${userId}/medium/${filename}`,
    ...(ext !== '.jpg' ? [`${userId}/medium/${base}.jpg`] : []),
    `${userId}/thumbnails/${filename}`,
    ...(ext !== '.jpg' ? [`${userId}/thumbnails/${base}.jpg`] : []),
  ]));

  const adminClient = await createAdminClient();
  const { error } = await adminClient.storage
    .from(ASSETS_BUCKET)
    .remove(pathsToDelete);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Returns the filename without its extension.
 * Used to auto-populate asset titles from uploaded filenames.
 */
export function getFilenameWithoutExtension(filename: string): string {
  return path.parse(filename).name;
}
