/**
 * Asset Upload API Route
 * 
 * Handles image uploads with local file storage and persistent JSON storage.
 * 
 * Flow:
 * 1. Authenticate user (requireAuth middleware)
 * 2. Rate limit check (20 uploads/minute)
 * 3. Parse multipart/form-data
 * 4. Validate file type, size, and image integrity
 * 5. Process image in parallel (3 sizes with Sharp)
 * 6. Save files to public/uploads/
 * 7. Extract color palette
 * 8. Save metadata to data/assets.json
 * 9. Return asset object with all URLs
 * 
 * TODO: DATABASE MIGRATION
 * Replace `addAsset()` call with database INSERT:
 * 
 * ```typescript
 * const [insertedAsset] = await db.insert(assets).values({
 *   id: assetId,
 *   title: sanitizedTitle,
 *   description: sanitizedDescription,
 *   type: 'image',
 *   url: fullUrl,
 *   mediumUrl,
 *   thumbnailUrl,
 *   projectId: projectId || null,
 *   uploaderId: user.id,
 *   width: metadata.width,
 *   height: metadata.height,
 *   fileSize: metadata.size,
 *   mimeType: file.type,
 *   dominantColor,
 *   colorPalette,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * }).returning();
 * ```
 * 
 * TODO: CLOUD STORAGE MIGRATION
 * Replace saveImageToPublic() with cloud upload:
 * - Use S3/R2/Cloudflare SDK
 * - Return CDN URLs instead of local paths
 * - Consider direct client-to-cloud uploads (signed URLs)
 * 
 * @see /docs/IMAGE_UPLOAD.md for complete migration guide
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, rateLimit, canUserModifyResource } from '@/lib/auth/middleware';
import { addAsset } from '@/lib/utils/assets-storage';
import { projects } from '@/lib/mock-data/projects';
import type { Asset } from '@/lib/mock-data/assets';
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
 * - projectId: Project ID (optional)
 * 
 * Response:
 * {
 *   "asset": { ... asset object with URLs for all sizes ... }
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    console.log('[POST /api/assets/upload] 📤 Starting upload...');
    console.log(`  - User: ${user.username} (${user.id})`);
    
    // Rate limiting: max 20 uploads per minute
    const rateLimitResult = await rateLimit(20, 60000)(request, user);
    if (rateLimitResult) return rateLimitResult;

    // Parse multipart/form-data
    const formData = await request.formData();
    console.log('[POST /api/assets/upload] Form data received');
    const file = formData.get('file') as File | null;
    let title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const projectId = formData.get('projectId') as string | null;

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

    // Project ID is optional - if provided, verify it exists and user has access
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Verify user has permission to add assets to this project
      if (!canUserModifyResource(user, project.ownerId, project.ownerType)) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'You do not have permission to add assets to this project'
          },
          { status: 403 }
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

    // Extract colors from medium-sized image (better performance)
    let colorPalette: string[] | undefined;
    let dominantColor: string | undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const colorResponse = await fetch(`${request.nextUrl.origin}/api/extract-colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: mediumUrl,
          colorCount: 5,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (colorResponse.ok) {
        const colorData = await colorResponse.json();
        colorPalette = colorData.colors;
        dominantColor = colorData.dominantColor;
      } else {
        console.warn('Failed to extract colors, continuing without color palette');
      }
    } catch (colorError) {
      console.warn('Error extracting colors:', colorError);
      // Continue without color palette
    }

    // Generate unique asset ID
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new asset
    const newAsset: Asset = {
      id: assetId,
      title: title.trim(),
      description: description?.trim() || undefined,
      type: 'image',
      url: fullUrl,
      mediumUrl,
      thumbnailUrl,
      projectId: projectId || undefined,
      uploaderId: user.id,
      createdAt: new Date().toISOString(),
      width: metadata.width,
      height: metadata.height,
      dominantColor,
      colorPalette,
    };

    // Add to persistent storage (JSON file)
    // TODO: Replace with database INSERT operation
    addAsset(newAsset);
    
    console.log('[POST /api/assets/upload] ✅ Upload successful!');
    console.log(`  - Asset ID: ${newAsset.id}`);
    console.log(`  - Title: ${newAsset.title}`);
    console.log(`  - Full URL: ${newAsset.url}`);
    console.log(`  - Medium URL: ${newAsset.mediumUrl}`);
    console.log(`  - Thumbnail URL: ${newAsset.thumbnailUrl}`);

    return NextResponse.json(
      { asset: newAsset },
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
});

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

