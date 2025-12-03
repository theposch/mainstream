/**
 * File Storage Utilities for Local Filesystem Operations
 * 
 * This module handles saving uploaded images to the local filesystem
 * in the public/uploads/ directory. Images are organized by size:
 * - full/ - Optimized original images
 * - medium/ - 800px max dimension
 * - thumbnails/ - 300px max dimension
 * 
 * TODO: SUPABASE STORAGE MIGRATION
 * When ready to scale, migrate to Supabase Storage (built on S3).
 * Benefits: CDN, better performance, automatic backups, scalability.
 * 
 * Example Supabase Storage Migration:
 * ```typescript
 * import { createClient } from '@supabase/supabase-js';
 * 
 * const supabase = createClient(
 *   process.env.NEXT_PUBLIC_SUPABASE_URL!,
 *   process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
 * );
 * 
 * export async function saveImageToSupabase(
 *   buffer: Buffer,
 *   filename: string,
 *   size: 'full' | 'medium' | 'thumbnails'
 * ): Promise<string> {
 *   const path = `uploads/${size}/${filename}`;
 *   
 *   const { data, error } = await supabase.storage
 *     .from('assets') // Create 'assets' bucket in Supabase
 *     .upload(path, buffer, {
 *       contentType: 'image/jpeg',
 *       cacheControl: '31536000', // 1 year
 *       upsert: false
 *     });
 *   
 *   if (error) throw error;
 *   
 *   // Return public URL (CDN-backed)
 *   const { data: { publicUrl } } = supabase.storage
 *     .from('assets')
 *     .getPublicUrl(path);
 *   
 *   return publicUrl;
 * }
 * ```
 * 
 * @see /docs/IMAGE_UPLOAD.md for complete cloud storage migration guide
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Local upload directory (public/uploads/)
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Ensures that all required upload directories exist
 * 
 * Creates the directory structure:
 * public/uploads/full/
 * public/uploads/medium/
 * public/uploads/thumbnails/
 * 
 * Called automatically by saveImageToPublic() to ensure directories
 * exist before attempting to write files.
 * 
 * TODO: Not needed with Supabase Storage (buckets are pre-configured in dashboard)
 */
export function ensureUploadDirectories(): void {
  const dirs = [
    path.join(UPLOAD_DIR, 'full'),
    path.join(UPLOAD_DIR, 'medium'),
    path.join(UPLOAD_DIR, 'thumbnails'),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Generates a unique filename with timestamp and UUID
 * 
 * Format: {timestamp}-{uuid}.{extension}
 * Example: 1732545678901-a3f4b5c6.jpg
 * 
 * This prevents filename collisions and provides chronological ordering.
 * The UUID segment ensures uniqueness even if multiple uploads happen
 * in the same millisecond.
 * 
 * @param originalFilename - Original file name with extension
 * @returns Unique filename with extension (safe for filesystem and URLs)
 */
export function generateUniqueFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const uuid = randomUUID().split('-')[0]; // Use first segment of UUID for brevity
  return `${timestamp}-${uuid}${ext}`;
}

/**
 * Saves an image buffer to the public/uploads directory
 * 
 * Writes the buffer to disk and returns a public URL path that can be
 * used in <img> tags or Next.js <Image> components.
 * 
 * TODO: Replace with Supabase Storage upload:
 * - Use supabase.storage.from('assets').upload()
 * - Return CDN URL (automatically provided by Supabase)
 * - Supports files up to 50MB by default
 * - Add retry logic for network failures
 * 
 * @param buffer - Image buffer from Sharp processing
 * @param filename - Unique filename (from generateUniqueFilename)
 * @param size - Size variant directory ('full', 'medium', or 'thumbnails')
 * @param overrideExtension - Optional: override the file extension (e.g., '.jpg' for GIF thumbnails)
 * @returns Public URL path (e.g., "/uploads/full/1234567890-abc123.jpg")
 */
export async function saveImageToPublic(
  buffer: Buffer,
  filename: string,
  size: 'full' | 'medium' | 'thumbnails',
  overrideExtension?: string
): Promise<string> {
  ensureUploadDirectories();
  
  // Allow overriding extension (useful for GIF thumbnails which are converted to JPEG)
  let finalFilename = filename;
  if (overrideExtension) {
    const baseName = path.parse(filename).name;
    finalFilename = `${baseName}${overrideExtension}`;
  }
  
  const filePath = path.join(UPLOAD_DIR, size, finalFilename);
  
  // Write file synchronously for simplicity
  // TODO: Consider async writeFile for better performance
  fs.writeFileSync(filePath, buffer);
  
  // Return public URL path (served by Next.js from public/ directory)
  return `/uploads/${size}/${finalFilename}`;
}

/**
 * Deletes uploaded files for an asset (all size variants)
 * 
 * When deleting an asset, call this function to clean up all three
 * image files (full, medium, thumbnail). Safe to call even if files
 * don't exist (silently skips missing files).
 * 
 * TODO: Replace with Supabase Storage deletion:
 * ```typescript
 * await supabase.storage
 *   .from('assets')
 *   .remove([
 *     `uploads/full/${filename}`,
 *     `uploads/medium/${filename}`,
 *     `uploads/thumbnails/${filename}`,
 *   ]);
 * ```
 * 
 * @param filename - Base filename (same name used in all three sizes)
 */
export async function deleteUploadedFiles(filename: string): Promise<void> {
  const sizes: Array<'full' | 'medium' | 'thumbnails'> = ['full', 'medium', 'thumbnails'];
  
  sizes.forEach((size) => {
    const filePath = path.join(UPLOAD_DIR, size, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

/**
 * Extracts the filename without extension
 * 
 * Used to auto-populate the asset title from the uploaded filename.
 * Example: "my-image.jpg" → "my-image"
 * 
 * @param filename - Full filename with extension
 * @returns Filename without extension
 */
export function getFilenameWithoutExtension(filename: string): string {
  return path.parse(filename).name;
}

