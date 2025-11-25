/**
 * File Storage Utilities for Local Filesystem Operations
 * 
 * This module handles saving uploaded images to the local filesystem
 * in the public/uploads/ directory. Images are organized by size:
 * - full/ - Optimized original images
 * - medium/ - 800px max dimension
 * - thumbnails/ - 300px max dimension
 * 
 * TODO: CLOUD STORAGE MIGRATION
 * When ready to use cloud storage (S3, R2, Cloudflare, etc.), replace
 * these functions with cloud SDK calls. The function signatures can
 * remain the same, but implementation changes to upload to cloud.
 * 
 * Example S3 Migration:
 * ```typescript
 * import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
 * 
 * const s3Client = new S3Client({ 
 *   region: process.env.AWS_REGION,
 *   credentials: {
 *     accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
 *     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
 *   }
 * });
 * 
 * export async function saveImageToCloud(
 *   buffer: Buffer,
 *   filename: string,
 *   size: 'full' | 'medium' | 'thumbnails'
 * ): Promise<string> {
 *   const key = `uploads/${size}/${filename}`;
 *   
 *   await s3Client.send(new PutObjectCommand({
 *     Bucket: process.env.S3_BUCKET_NAME!,
 *     Key: key,
 *     Body: buffer,
 *     ContentType: 'image/jpeg',
 *     CacheControl: 'public, max-age=31536000',
 *   }));
 *   
 *   // Return CDN URL instead of local URL
 *   return `${process.env.CDN_URL}/${key}`;
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
 * TODO: Not needed with cloud storage (buckets are pre-configured)
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
 * TODO: Replace with cloud storage upload:
 * - Use S3 PutObject or equivalent
 * - Return CDN URL instead of local path
 * - Consider streaming large files instead of buffer
 * - Add retry logic for network failures
 * 
 * @param buffer - Image buffer from Sharp processing
 * @param filename - Unique filename (from generateUniqueFilename)
 * @param size - Size variant directory ('full', 'medium', or 'thumbnails')
 * @returns Public URL path (e.g., "/uploads/full/1234567890-abc123.jpg")
 */
export async function saveImageToPublic(
  buffer: Buffer,
  filename: string,
  size: 'full' | 'medium' | 'thumbnails'
): Promise<string> {
  ensureUploadDirectories();
  
  const filePath = path.join(UPLOAD_DIR, size, filename);
  
  // Write file synchronously for simplicity
  // TODO: Consider async writeFile for better performance
  fs.writeFileSync(filePath, buffer);
  
  // Return public URL path (served by Next.js from public/ directory)
  return `/uploads/${size}/${filename}`;
}

/**
 * Deletes uploaded files for an asset (all size variants)
 * 
 * When deleting an asset, call this function to clean up all three
 * image files (full, medium, thumbnail). Safe to call even if files
 * don't exist (silently skips missing files).
 * 
 * TODO: Replace with cloud storage deletion:
 * ```typescript
 * await s3Client.send(new DeleteObjectsCommand({
 *   Bucket: process.env.S3_BUCKET_NAME!,
 *   Delete: {
 *     Objects: [
 *       { Key: `uploads/full/${filename}` },
 *       { Key: `uploads/medium/${filename}` },
 *       { Key: `uploads/thumbnails/${filename}` },
 *     ],
 *   },
 * }));
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

