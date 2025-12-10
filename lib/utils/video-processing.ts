/**
 * Video Processing Utilities using FFmpeg
 * 
 * This module handles video thumbnail generation using FFmpeg.
 * Requires FFmpeg to be installed on the system.
 * 
 * Key Features:
 * - Extract thumbnail frame from video at specific timestamp
 * - Generate multiple thumbnail sizes
 * - Support for WebM and other video formats
 * 
 * Dependencies:
 * - fluent-ffmpeg (npm install fluent-ffmpeg)
 * - ffmpeg (system installation required)
 * 
 * @see https://ffmpeg.org/ for FFmpeg documentation
 */

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

/**
 * Video metadata structure
 */
export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  format: string;
}

/**
 * Extracts metadata from a video file
 * 
 * @param videoPath - Path to the video file
 * @returns Video metadata (dimensions, duration, format)
 */
export async function extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      
      resolve({
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        duration: metadata.format.duration || 0,
        format: metadata.format.format_name || 'unknown',
      });
    });
  });
}

/**
 * Generates a thumbnail from a video buffer
 * 
 * Extracts a frame at the specified timestamp (default: 1 second)
 * and converts it to a JPEG thumbnail.
 * 
 * @param videoBuffer - Video file buffer
 * @param timestamp - Time in seconds to extract frame (default: 1)
 * @returns Object with thumbnail buffer and video metadata
 */
export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  timestamp: number = 1
): Promise<{ thumbnail: Buffer; metadata: VideoMetadata }> {
  // Create temp directory for processing
  const tempDir = path.join(os.tmpdir(), `video-thumb-${randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // Use generic extension - ffmpeg auto-detects format from content
  const tempVideoPath = path.join(tempDir, 'input.video');
  const tempOutputPath = path.join(tempDir, 'thumbnail.jpg');

  try {
    // Write buffer to temp file (ffmpeg needs a file path)
    fs.writeFileSync(tempVideoPath, videoBuffer);

    // Get video metadata first
    const metadata = await extractVideoMetadata(tempVideoPath);

    // Determine the timestamp to use (at least 0.1s, but not beyond video duration)
    const safeTimestamp = Math.min(
      Math.max(0.1, timestamp),
      Math.max(0.1, metadata.duration - 0.1)
    );

    // Extract frame using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempVideoPath)
        .seekInput(safeTimestamp)
        .frames(1)
        .outputOptions([
          '-vf', 'scale=800:-1', // Scale to 800px width, maintain aspect ratio
          '-q:v', '2', // High quality JPEG
        ])
        .output(tempOutputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    // Read the generated thumbnail
    const thumbnailBuffer = fs.readFileSync(tempOutputPath);

    return {
      thumbnail: thumbnailBuffer,
      metadata,
    };
  } finally {
    // Cleanup temp files
    try {
      if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Generates multiple thumbnail sizes from a video buffer
 * 
 * Creates two sizes for video thumbnails:
 * - Medium: 800px max dimension (for detail views)
 * - Thumbnail: 300px max dimension (for grids/cards)
 * 
 * Note: Unlike images, we don't store a "full" thumbnail since
 * the original video file serves that purpose.
 * 
 * @param videoBuffer - Video file buffer
 * @param timestamp - Time in seconds to extract frame (default: 1)
 * @returns Object with buffers for medium and thumbnail sizes, plus video metadata
 */
export async function generateVideoThumbnails(
  videoBuffer: Buffer,
  timestamp: number = 1
): Promise<{
  medium: Buffer;
  thumbnail: Buffer;
  metadata: VideoMetadata;
}> {
  // Get the base thumbnail first
  const { thumbnail: baseThumbnail, metadata } = await generateVideoThumbnail(
    videoBuffer,
    timestamp
  );

  // Generate different sizes using Sharp (same as image processing)
  const [medium, thumbnail] = await Promise.all([
    // Medium: 800px max
    sharp(baseThumbnail)
      .resize(800, 800, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer(),
    
    // Thumbnail: 300px max
    sharp(baseThumbnail)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer(),
  ]);

  return {
    medium,
    thumbnail,
    metadata,
  };
}

/**
 * Cached FFmpeg availability status (checked once per process)
 */
let ffmpegAvailableCache: boolean | null = null;

/**
 * Checks if FFmpeg is available on the system
 * 
 * Results are cached since FFmpeg availability won't change during runtime.
 * 
 * @returns True if FFmpeg is installed and accessible
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailableCache !== null) {
    return ffmpegAvailableCache;
  }
  
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      ffmpegAvailableCache = !err;
      resolve(ffmpegAvailableCache);
    });
  });
}

