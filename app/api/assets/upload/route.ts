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
} from '@/lib/utils/image-processing';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
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
    
    console.log('[POST /api/assets/upload] 📤 Starting upload...');
    console.log(`  - User: ${user.username} (${user.id})`);

    // Parse multipart/form-data
    const formData = await request.formData();
    console.log('[POST /api/assets/upload] Form data received');
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    
    // Parse streamIds from JSON string
    const streamIdsRaw = formData.get('streamIds');
    let streamIds: string[] = [];
    if (streamIdsRaw) {
      try {
        streamIds = JSON.parse(streamIdsRaw as string);
      } catch (error) {
        console.warn('[POST /api/assets/upload] Failed to parse streamIds, defaulting to empty array');
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
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
        console.error('[POST /api/assets/upload] Error validating streams:', streamError);
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

    // Validate it's a real image
    if (!await isValidImage(buffer)) {
      return NextResponse.json(
        { error: 'Invalid image file' },
        { status: 400 }
      );
    }

    // Extract metadata
    const metadata = await extractImageMetadata(buffer);

    // Generate unique filename
    const uniqueFilename = generateUniqueFilename(file.name);

    // Process and save images in all three sizes
    const [fullBuffer, mediumBuffer, thumbnailBuffer] = await Promise.all([
      optimizeImage(buffer, 90),
      generateMediumSize(buffer),
      generateThumbnail(buffer),
    ]);

    // Save to filesystem
    const [fullUrl, mediumUrl, thumbnailUrl] = await Promise.all([
      saveImageToPublic(fullBuffer, uniqueFilename, 'full'),
      saveImageToPublic(mediumBuffer, uniqueFilename, 'medium'),
      saveImageToPublic(thumbnailBuffer, uniqueFilename, 'thumbnails'),
    ]);

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
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        });

      if (userCreateError) {
        console.error('[POST /api/assets/upload] Failed to create user profile:', userCreateError);
      }
    }

    // Insert asset into database
    const { data: insertedAsset, error: insertError } = await supabase
      .from('assets')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        type: 'image',
        url: fullUrl,
        medium_url: mediumUrl,
        thumbnail_url: thumbnailUrl,
        uploader_id: user.id,
        width: metadata.width,
        height: metadata.height,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (insertError || !insertedAsset) {
      console.error('[POST /api/assets/upload] Database insert failed:', insertError);
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
        console.error('[POST /api/assets/upload] Failed to create stream associations:', streamError);
        // Don't fail the upload, just log the error
      }
    }
    
    console.log('[POST /api/assets/upload] ✅ Upload successful!');
    console.log(`  - Asset ID: ${insertedAsset.id}`);
    console.log(`  - Title: ${insertedAsset.title}`);
    console.log(`  - Full URL: ${insertedAsset.url}`);
    console.log(`  - Medium URL: ${insertedAsset.medium_url}`);
    console.log(`  - Thumbnail URL: ${insertedAsset.thumbnail_url}`);

    return NextResponse.json(
      { asset: insertedAsset },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error uploading asset:', error);
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
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    acceptedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxDimensions: {
      width: 8000,
      height: 8000,
    },
  });
}

