/**
 * Image Processing Utilities using Sharp
 * 
 * This module handles all image optimization and resizing operations.
 * Sharp is a high-performance Node.js image processing library that
 * supports various formats (JPEG, PNG, WebP, AVIF, etc.).
 * 
 * Key Features:
 * - Fast processing (10-20x faster than ImageMagick)
 * - Memory efficient (streaming)
 * - Progressive JPEG encoding
 * - Smart compression (format-specific)
 * - Maintains aspect ratios
 * - No image enlargement
 * 
 * Dependencies:
 * - sharp (npm install sharp)
 * 
 * TODO: FUTURE ENHANCEMENTS
 * - Add WebP conversion support (smaller files)
 * - Add AVIF support (even smaller)
 * - Add watermarking capability
 * - Add blur hash generation for placeholders
 * - Add EXIF data preservation option
 * - Add image cropping/rotation
 * - Add filters (grayscale, sepia, etc.)
 * 
 * @see https://sharp.pixelplumbing.com/ for Sharp documentation
 */

import sharp from 'sharp';

/**
 * Image metadata structure returned by extractImageMetadata()
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string; // 'jpeg', 'png', 'webp', etc.
  size: number;   // File size in bytes
}

/**
 * Extracts metadata from an image buffer
 * 
 * Uses Sharp to read image dimensions, format, and other properties
 * without fully decoding the image. Fast and memory efficient.
 * 
 * @param buffer - Image buffer from file upload
 * @returns Image metadata (dimensions, format, size)
 */
export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
  };
}

/**
 * Optimizes an image and returns the buffer
 * 
 * Applies format-specific optimization:
 * - JPEG: Progressive encoding, mozjpeg compression
 * - PNG: Maximum compression, adaptive filtering
 * - WebP: Smart quality compression
 * 
 * The image format is auto-detected from the input buffer.
 * Progressive JPEG enables gradual image loading (better UX).
 * 
 * @param buffer - Original image buffer
 * @param quality - JPEG quality setting (1-100, default: 90)
 *                  Higher = better quality, larger file
 * @returns Optimized image buffer (typically 40-60% smaller)
 */
export async function optimizeImage(buffer: Buffer, quality: number = 90): Promise<Buffer> {
  return await sharp(buffer)
    .jpeg({ quality, progressive: true, mozjpeg: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .webp({ quality })
    .toBuffer();
}

/**
 * Generates a thumbnail (300px max width/height, maintains aspect ratio)
 * 
 * Creates a small version of the image for fast loading in grids and
 * lists. Used for progressive loading (show thumbnail first, then
 * upgrade to full image).
 * 
 * Options:
 * - fit: 'inside' - Scales to fit within 300x300, maintains aspect ratio
 * - withoutEnlargement: true - Never makes small images larger
 * - quality: 80 - Good quality/size balance for thumbnails
 * 
 * Typical file size: 30-100KB
 * 
 * @param buffer - Original image buffer
 * @returns Thumbnail buffer (max 300x300px)
 */
export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(300, 300, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

/**
 * Generates a medium-sized image (800px max width/height, maintains aspect ratio)
 * 
 * Creates a medium version suitable for most desktop/mobile viewing.
 * This is typically the version shown in detail views, with the full
 * image loaded on demand (e.g., when user clicks to zoom).
 * 
 * Options:
 * - fit: 'inside' - Scales to fit within 800x800, maintains aspect ratio
 * - withoutEnlargement: true - Never makes small images larger
 * - quality: 85 - High quality for main viewing
 * 
 * Typical file size: 200-800KB (depending on complexity)
 * 
 * @param buffer - Original image buffer
 * @returns Medium-sized image buffer (max 800x800px)
 */
export async function generateMediumSize(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer)
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

/**
 * Validates if a buffer is a valid image
 * 
 * Uses Sharp to attempt reading the buffer metadata. If it fails,
 * the buffer is not a valid image or is corrupted.
 * 
 * This is more thorough than just checking MIME types, as it actually
 * attempts to parse the image data. Helps prevent attacks like file
 * upload with fake MIME types.
 * 
 * @param buffer - Buffer to validate
 * @returns True if valid image, false otherwise
 */
export async function isValidImage(buffer: Buffer): Promise<boolean> {
  try {
    await sharp(buffer).metadata();
    return true;
  } catch {
    return false;
  }
}

