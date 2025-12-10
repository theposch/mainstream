/**
 * Backfill Video Thumbnails Script
 * 
 * This script generates thumbnails for existing WebM videos that are missing them.
 * 
 * Requirements:
 * - FFmpeg installed on the system
 * - Environment variables set (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * 
 * Usage:
 *   npx tsx scripts/backfill-video-thumbnails.ts
 * 
 * Options:
 *   --dry-run    Show what would be processed without making changes
 *   --limit=N    Limit to processing N videos
 */

// Load environment variables from .env.local
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';
import { randomUUID } from 'crypto';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Paths
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Extracts video metadata using ffprobe
 */
async function extractVideoMetadata(videoPath: string): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
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
      });
    });
  });
}

/**
 * Generates thumbnail from a video file
 */
async function generateVideoThumbnail(
  videoPath: string,
  timestamp: number = 1
): Promise<Buffer> {
  const tempDir = path.join(os.tmpdir(), `video-thumb-${randomUUID()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const tempOutputPath = path.join(tempDir, 'thumbnail.jpg');

  try {
    // Get video metadata to determine safe timestamp
    const metadata = await extractVideoMetadata(videoPath);
    const safeTimestamp = Math.min(
      Math.max(0.1, timestamp),
      Math.max(0.1, metadata.duration - 0.1)
    );

    // Extract frame using ffmpeg
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(safeTimestamp)
        .frames(1)
        .outputOptions([
          '-vf', 'scale=800:-1',
          '-q:v', '2',
        ])
        .output(tempOutputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .run();
    });

    return fs.readFileSync(tempOutputPath);
  } finally {
    try {
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Saves a buffer to the uploads directory
 */
function saveToUploads(
  buffer: Buffer,
  filename: string,
  size: 'full' | 'medium' | 'thumbnails',
  extension: string
): string {
  const dir = path.join(UPLOAD_DIR, size);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const baseName = path.parse(filename).name;
  const finalFilename = `${baseName}${extension}`;
  const filePath = path.join(dir, finalFilename);

  fs.writeFileSync(filePath, buffer);
  return `/uploads/${size}/${finalFilename}`;
}

/**
 * Checks if a URL points to a video file (not an image thumbnail)
 */
function needsThumbnail(thumbnailUrl: string | null): boolean {
  if (!thumbnailUrl) return true;
  // If thumbnail URL ends with .webm, it needs a proper image thumbnail
  return thumbnailUrl.endsWith('.webm');
}

/**
 * Main backfill function
 */
async function backfillVideoThumbnails() {
  console.log('🎬 Video Thumbnail Backfill Script');
  console.log('==================================');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Check if FFmpeg is available
  const ffmpegAvailable = await new Promise<boolean>((resolve) => {
    ffmpeg.getAvailableFormats((err) => resolve(!err));
  });

  if (!ffmpegAvailable) {
    console.error('❌ FFmpeg is not installed or not accessible');
    console.error('   Please install FFmpeg: brew install ffmpeg');
    process.exit(1);
  }
  console.log('✅ FFmpeg is available\n');

  // Fetch videos that need thumbnail generation
  let query = supabase
    .from('assets')
    .select('id, title, url, medium_url, thumbnail_url, width, height')
    .eq('asset_type', 'video')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: videos, error } = await query;

  if (error) {
    console.error('❌ Failed to fetch videos:', error);
    process.exit(1);
  }

  if (!videos || videos.length === 0) {
    console.log('✅ No videos found in the database');
    return;
  }

  console.log(`📹 Found ${videos.length} video(s)\n`);

  // Filter to only videos that need thumbnails
  const videosNeedingThumbnails = videos.filter(v => needsThumbnail(v.thumbnail_url));
  
  console.log(`🔧 ${videosNeedingThumbnails.length} video(s) need thumbnail generation\n`);

  if (videosNeedingThumbnails.length === 0) {
    console.log('✅ All videos already have proper thumbnails!');
    return;
  }

  let processed = 0;
  let failed = 0;

  for (const video of videosNeedingThumbnails) {
    console.log(`Processing: ${video.title || video.id}`);
    console.log(`  URL: ${video.url}`);

    // Extract filename from URL
    const urlPath = video.url.replace(/^\/uploads\/full\//, '');
    const videoPath = path.join(UPLOAD_DIR, 'full', urlPath);

    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      console.log(`  ⚠️  Video file not found: ${videoPath}`);
      failed++;
      continue;
    }

    if (isDryRun) {
      console.log(`  🔍 Would generate thumbnails for this video`);
      processed++;
      continue;
    }

    try {
      // Generate base thumbnail
      const baseThumbnail = await generateVideoThumbnail(videoPath, 1);
      
      // Get video metadata
      const videoMeta = await extractVideoMetadata(videoPath);

      // Generate different sizes using Sharp
      const [medium, thumbnail] = await Promise.all([
        sharp(baseThumbnail)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer(),
        sharp(baseThumbnail)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80, progressive: true })
          .toBuffer(),
      ]);

      // Save thumbnails
      const mediumUrl = saveToUploads(medium, urlPath, 'medium', '.jpg');
      const thumbnailUrl = saveToUploads(thumbnail, urlPath, 'thumbnails', '.jpg');

      // Update database
      const { error: updateError } = await supabase
        .from('assets')
        .update({
          medium_url: mediumUrl,
          thumbnail_url: thumbnailUrl,
          width: videoMeta.width || video.width,
          height: videoMeta.height || video.height,
        })
        .eq('id', video.id);

      if (updateError) {
        console.log(`  ❌ Failed to update database: ${updateError.message}`);
        failed++;
      } else {
        console.log(`  ✅ Thumbnails generated:`);
        console.log(`     Medium: ${mediumUrl}`);
        console.log(`     Thumbnail: ${thumbnailUrl}`);
        processed++;
      }
    } catch (err) {
      console.log(`  ❌ Failed to process: ${err instanceof Error ? err.message : err}`);
      failed++;
    }

    console.log('');
  }

  console.log('==================================');
  console.log(`📊 Summary:`);
  console.log(`   Processed: ${processed}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Skipped: ${videos.length - videosNeedingThumbnails.length}`);
  
  if (isDryRun) {
    console.log('\n🔍 This was a dry run. Run without --dry-run to apply changes.');
  }
}

// Run the script
backfillVideoThumbnails().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});

