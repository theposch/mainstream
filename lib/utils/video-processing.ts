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

  const tempVideoPath = path.join(tempDir, 'input.webm');
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
 * Creates three sizes matching the image processing pipeline:
 * - Full: Original extracted frame (optimized)
 * - Medium: 800px max dimension
 * - Thumbnail: 300px max dimension
 * 
 * @param videoBuffer - Video file buffer
 * @param timestamp - Time in seconds to extract frame (default: 1)
 * @returns Object with buffers for each size and video metadata
 */
export async function generateVideoThumbnails(
  videoBuffer: Buffer,
  timestamp: number = 1
): Promise<{
  full: Buffer;
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
  const [full, medium, thumbnail] = await Promise.all([
    // Full: Just optimize the extracted frame
    sharp(baseThumbnail)
      .jpeg({ quality: 90, progressive: true, mozjpeg: true })
      .toBuffer(),
    
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
    full,
    medium,
    thumbnail,
    metadata,
  };
}

/**
 * Checks if FFmpeg is available on the system
 * 
 * @returns True if FFmpeg is installed and accessible
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
}

