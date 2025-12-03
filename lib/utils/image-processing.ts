/**
 * Image Processing Utilities using Sharp
 * 
 * This module handles all image optimization and resizing operations.
 * Sharp is a high-performance Node.js image processing library that
 * supports various formats (JPEG, PNG, WebP, AVIF, GIF, etc.).
 * 
 * Key Features:
 * - Fast processing (10-20x faster than ImageMagick)
 * - Memory efficient (streaming)
 * - Progressive JPEG encoding
 * - Smart compression (format-specific)
 * - Maintains aspect ratios
 * - No image enlargement
 * - **Animated GIF support** (preserves animation)
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
  format: string; // 'jpeg', 'png', 'webp', 'gif', etc.
  size: number;   // File size in bytes
  isAnimated: boolean; // True if GIF has multiple frames
  pages?: number; // Number of frames for animated GIFs
}

/**
 * Extracts metadata from an image buffer
 * 
 * Uses Sharp to read image dimensions, format, and other properties
 * without fully decoding the image. Fast and memory efficient.
 * 
 * For GIFs, also detects if the image is animated (has multiple frames).
 * 
 * @param buffer - Image buffer from file upload
 * @returns Image metadata (dimensions, format, size, animation info)
 */
export async function extractImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const metadata = await sharp(buffer).metadata();
  
  // Detect animated GIF: format is 'gif' and has multiple pages (frames)
  const isAnimated = metadata.format === 'gif' && (metadata.pages ?? 1) > 1;
  
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    isAnimated,
    pages: metadata.pages,
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

// ============================================================================
// Animated GIF Support
// ============================================================================

/**
 * Checks if an image buffer is an animated GIF
 * 
 * Animated GIFs have multiple "pages" (frames). This function reads
 * the metadata to determine if there's more than one frame.
 * 
 * @param buffer - Image buffer to check
 * @returns True if animated GIF, false otherwise
 */
export async function isAnimatedGif(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format === 'gif' && (metadata.pages ?? 1) > 1;
  } catch {
    return false;
  }
}

/**
 * Optimizes an animated GIF while preserving all frames
 * 
 * Resizes the GIF if it exceeds max dimensions, but keeps all frames
 * intact for smooth animation playback.
 * 
 * Options:
 * - animated: true - Process all frames, not just the first
 * - fit: 'inside' - Maintains aspect ratio within bounds
 * - withoutEnlargement: true - Never upscales small GIFs
 * 
 * Note: Animated GIFs are typically larger than static images.
 * Consider file size limits when uploading.
 * 
 * @param buffer - Original animated GIF buffer
 * @param maxWidth - Maximum width (default: 1200px)
 * @param maxHeight - Maximum height (default: 1200px)
 * @returns Optimized animated GIF buffer
 */
export async function optimizeAnimatedGif(
  buffer: Buffer,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<Buffer> {
  return await sharp(buffer, { animated: true })
    .resize(maxWidth, maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .gif({
      // Use reasonable compression without losing too much quality
      effort: 7, // 1-10, higher = smaller file, slower
    })
    .toBuffer();
}

/**
 * Generates a medium-sized animated GIF (800px max)
 * 
 * Creates a smaller version of the animated GIF for detail views
 * while preserving all frames for smooth playback.
 * 
 * @param buffer - Original animated GIF buffer
 * @returns Medium-sized animated GIF buffer (max 800x800px)
 */
export async function generateAnimatedMedium(buffer: Buffer): Promise<Buffer> {
  return await sharp(buffer, { animated: true })
    .resize(800, 800, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .gif({ effort: 7 })
    .toBuffer();
}

/**
 * Generates a static thumbnail from the first frame of a GIF
 * 
 * Extracts the first frame of an animated GIF and creates a static
 * JPEG thumbnail. This is much smaller than an animated thumbnail
 * and loads faster in image grids.
 * 
 * The user sees the static thumbnail, then can click to view the
 * animated version in the detail view.
 * 
 * @param buffer - Animated GIF buffer
 * @returns Static JPEG thumbnail (max 300x300px)
 */
export async function generateGifThumbnail(buffer: Buffer): Promise<Buffer> {
  // Sharp with animated: false (default) only reads the first frame
  return await sharp(buffer, { animated: false })
    .resize(300, 300, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, progressive: true })
    .toBuffer();
}

