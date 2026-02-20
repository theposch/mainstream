/**
 * Asset Upload API Route
 * 
 * Handles image uploads with Supabase database integration.
 * 
 * Flow:
 * 1. Authenticate user (Supabase Auth)
 * 2. Parse multipart/form-data
 * 3. Validate file type, size, and image integrity
 * 4. Process image in parallel (3 sizes with Sharp)
 * 5. Save files to public/uploads/
 * 6. Insert asset into database
 * 7. Create stream associations
 * 8. Return asset object with all URLs
 * 
 * @see /docs/IMAGE_UPLOAD.md for implementation details
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniqueFilename,
  saveImageToPublic,
  getFilenameWithoutExtension,
} from '@/lib/utils/file-storage';
import {
  extractImageMetadata,
  optimizeImage,
  generateThumbnail,
  generateMediumSize,
  isValidImage,
  optimizeAnimatedGif,
  generateAnimatedMedium,
  generateGifThumbnail,
} from '@/lib/utils/image-processing';
import {
  generateVideoThumbnails,
  isFFmpegAvailable,
} from '@/lib/utils/video-processing';
import { createClient } from '@/lib/supabase/server';
import { createScopedLogger } from '@/lib/logger';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/middleware/rate-limit';

const log = createScopedLogger('UploadRoute');

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds for large uploads

// Note: Body size limit is configured in next.config.ts via middlewareClientMaxBodySize

/**
 * POST /api/assets/upload
 * 
 * Uploads a new asset (image) with local file storage
 * 
 * Request body (multipart/form-data):
 * - file: Image file
 * - title: Asset title (optional, will use filename if not provided)
 * - description: Asset description (optional)
 * - streamIds: Array of stream IDs (optional, many-to-many relationship)
 * 
 * Response:
 * {
 *   "asset": { ... asset object with URLs for all sizes ... }
 * }
 */
export async function POST(request: NextRequest) {
  const start = Date.now();

  // Rate limit before doing any auth or processing
  const rl = checkRateLimit(request, RATE_LIMITS.upload);
  if (!rl.success) {
    log.warn('Rate limit exceeded', { remaining: rl.remaining, reset: rl.reset });
    return rateLimitResponse(rl);
  }

  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      log.request('POST', '/api/assets/upload', 401, Date.now() - start);
      return NextResponse.json(
        { error: 'Authentication required', message: 'You must be logged in to upload assets' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const user = userProfile ? {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.display_name,
      email: userProfile.email,
    } : {
      id: authUser.id,
      username: authUser.email?.split('@')[0] || 'user',
      displayName: authUser.email?.split('@')[0] || 'User',
      email: authUser.email || '',
    };
    
    // Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError) {
      log.error('Failed to parse form data', formError instanceof Error ? formError : new Error(String(formError)));
      return NextResponse.json(
        { error: 'Failed to parse upload. File may be too large.' },
        { status: 413 }
      );
    }
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    
    // Parse visibility (public = appears in feed, unlisted = drop-only)
    const visibilityRaw = formData.get('visibility') as string | null;
    const visibility = visibilityRaw === 'unlisted' ? 'unlisted' : 'public';
    
    // Parse streamIds from JSON string
    const streamIdsRaw = formData.get('streamIds');
    let streamIds: string[] = [];
    if (streamIdsRaw) {
      try {
        streamIds = JSON.parse(streamIdsRaw as string);
      } catch {
        log.warn('Failed to parse streamIds, defaulting to empty array');
        streamIds = [];
      }
    }

    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    log.info('File received', { name: file.name, sizeMb: (file.size / 1024 / 1024).toFixed(2), type: file.type });

    // Validate file type (images and WebM videos)
    const isImage = file.type.startsWith('image/');
    const isWebM = file.type === 'video/webm';
    
    if (!isImage && !isWebM) {
      return NextResponse.json(
        { error: 'File must be an image or WebM video' },
        { status: 400 }
      );
    }

    // Validate file size (10MB for images, 50MB for videos)
    const maxSize = isWebM ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File size must be less than ${isWebM ? '50MB' : '10MB'}` },
        { status: 400 }
      );
    }

    // If no title provided, use filename without extension
    if (!title || title.trim() === '') {
      title = getFilenameWithoutExtension(file.name);
    }

    // Stream IDs are optional - if provided, verify they exist
    if (streamIds && streamIds.length > 0) {
      const { data: streams, error: streamError } = await supabase
        .from('streams')
        .select('id')
        .eq('status', 'active')
        .in('id', streamIds);
      
      if (streamError) {
        log.error('Error validating streams', new Error(streamError.message));
        return NextResponse.json(
          { error: 'Failed to validate streams' },
          { status: 500 }
        );
      }
      
      // Check all stream IDs are valid
      const validStreamIds = streams?.map(s => s.id) || [];
      const invalidStreamIds = streamIds.filter(id => !validStreamIds.includes(id));
      
      if (invalidStreamIds.length > 0) {
        return NextResponse.json(
          { error: `Invalid stream IDs: ${invalidStreamIds.join(', ')}` },
          { status: 404 }
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);

    let fullUrl: string;
    let mediumUrl: string;
    let thumbnailUrl: string;
    let metadata: { width?: number; height?: number; isAnimated?: boolean; pages?: number } = {};

    if (isWebM) {
      // WebM video: save video + generate thumbnail images
      log.info('Processing WebM video', { sizeMb: (file.size / 1024 / 1024).toFixed(2) });
      
      // Check if FFmpeg is available for thumbnail generation
      const ffmpegAvailable = await isFFmpegAvailable();
      
      // Save the WebM file directly (no transcoding needed)
      fullUrl = await saveImageToPublic(buffer, uniqueFilename, 'full', '.webm');
      
      if (ffmpegAvailable) {
        try {
          // Generate thumbnail images from video (extract frame at 1 second)
          log.info('Generating video thumbnails');
          const { medium, thumbnail, metadata: videoMeta } = await generateVideoThumbnails(buffer, 1);
          
          // Save thumbnail images (JPEG format)
          [mediumUrl, thumbnailUrl] = await Promise.all([
            saveImageToPublic(medium, uniqueFilename, 'medium', '.jpg'),
            saveImageToPublic(thumbnail, uniqueFilename, 'thumbnails', '.jpg'),
          ]);
          
          // Use video metadata for dimensions
          metadata = {
            width: videoMeta.width,
            height: videoMeta.height,
            isAnimated: true,
          };
          
          log.info('Video thumbnails generated successfully');
        } catch (thumbError) {
          log.error('Failed to generate video thumbnails', thumbError instanceof Error ? thumbError : new Error(String(thumbError)));
          // Fall back to video URL (better than failing the upload)
          mediumUrl = fullUrl;
          thumbnailUrl = fullUrl;
          metadata = { isAnimated: true };
        }
      } else {
        log.warn('FFmpeg not available, skipping video thumbnail generation');
        // Use video URL as fallback
        mediumUrl = fullUrl;
        thumbnailUrl = fullUrl;
        metadata = { isAnimated: true };
      }
    } else {
      // Image processing
      // Validate it's a real image
      if (!await isValidImage(buffer)) {
        return NextResponse.json(
          { error: 'Invalid image file' },
          { status: 400 }
        );
      }

      // Extract metadata (includes animation detection for GIFs)
      metadata = await extractImageMetadata(buffer);

      // Process images differently based on whether it's an animated GIF
      let fullBuffer: Buffer;
      let mediumBuffer: Buffer;
      let thumbnailBuffer: Buffer;

      if (metadata.isAnimated) {
        // Animated GIF: preserve animation for full and medium, static thumbnail
        log.info('Processing animated GIF', { frames: metadata.pages });
        [fullBuffer, mediumBuffer, thumbnailBuffer] = await Promise.all([
          optimizeAnimatedGif(buffer),      // Animated - all frames preserved
          generateAnimatedMedium(buffer),   // Animated - smaller size
          generateGifThumbnail(buffer),     // Static - first frame only (faster loading)
        ]);
      } else {
        // Static image (JPEG, PNG, WebP, or static GIF): convert to optimized JPEG
        [fullBuffer, mediumBuffer, thumbnailBuffer] = await Promise.all([
          optimizeImage(buffer, 90),
          generateMediumSize(buffer),
          generateThumbnail(buffer),
        ]);
      }

      // Save to filesystem
      // Note: For animated GIFs, thumbnails are JPEG (static first frame), so override extension
      [fullUrl, mediumUrl, thumbnailUrl] = await Promise.all([
        saveImageToPublic(fullBuffer, uniqueFilename, 'full'),
        saveImageToPublic(mediumBuffer, uniqueFilename, 'medium'),
        saveImageToPublic(
          thumbnailBuffer, 
          uniqueFilename, 
          'thumbnails',
          metadata.isAnimated ? '.jpg' : undefined  // GIF thumbnails are JPEG
        ),
      ]);
    }

    // Ensure user profile exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user profile if it doesn't exist
      const { error: userCreateError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          username: user.username,
          display_name: user.displayName,
          email: user.email,
          avatar_url: `https://avatar.vercel.sh/${user.username}.png`,
        });

      if (userCreateError) {
        log.error('Failed to create user profile', new Error(userCreateError.message));
      }
    }

    // Insert asset into database
    const { data: insertedAsset, error: insertError } = await supabase
      .from('assets')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        type: isWebM ? 'video' : 'image',
        asset_type: isWebM ? 'video' : 'image',
        url: fullUrl,
        medium_url: mediumUrl,
        thumbnail_url: thumbnailUrl,
        uploader_id: user.id,
        width: metadata.width,
        height: metadata.height,
        file_size: file.size,
        mime_type: file.type,
        visibility, // 'public' or 'unlisted'
      })
      .select()
      .single();

    if (insertError || !insertedAsset) {
      log.error('Database insert failed', insertError ? new Error(insertError.message) : new Error('No asset returned'));
      return NextResponse.json(
        { error: 'Failed to save asset to database', details: insertError?.message },
        { status: 500 }
      );
    }

    // Create stream associations if provided
    if (streamIds && streamIds.length > 0) {
      const streamAssociations = streamIds.map(streamId => ({
        asset_id: insertedAsset.id,
        stream_id: streamId,
        added_by: user.id,
      }));

      const { error: streamError } = await supabase
        .from('asset_streams')
        .insert(streamAssociations);

      if (streamError) {
        log.error('Failed to create stream associations', new Error(streamError.message));
        // Don't fail the upload, just log the error
      }
    }
    
    log.request('POST', '/api/assets/upload', 201, Date.now() - start);
    return NextResponse.json(
      { asset: insertedAsset },
      { status: 201 }
    );
  } catch (error) {
    log.error('Unexpected error uploading asset', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { 
        error: 'Failed to upload asset',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/assets/upload
 * 
 * Returns information about upload requirements and limits
 */
export async function GET() {
  return NextResponse.json({
    maxFileSize: {
      image: 10 * 1024 * 1024, // 10 MB for images
      video: 50 * 1024 * 1024, // 50 MB for videos
    },
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/webm'],
    maxDimensions: {
      width: 8000,
      height: 8000,
    },
  });
}

