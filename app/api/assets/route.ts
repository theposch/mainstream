/**
 * Assets API Route
 * 
 * Provides endpoints for fetching assets. Currently reads from persistent
 * JSON file storage (data/assets.json).
 * 
 * TODO: DATABASE MIGRATION
 * Replace `readAssets()` with database queries:
 * 
 * ```typescript
 * // Basic query
 * const assets = await db
 *   .select()
 *   .from(assetsTable)
 *   .orderBy(desc(assetsTable.createdAt))
 *   .limit(100);
 * 
 * // With pagination
 * const page = parseInt(searchParams.get('page') || '1');
 * const limit = parseInt(searchParams.get('limit') || '50');
 * const offset = (page - 1) * limit;
 * 
 * const assets = await db
 *   .select()
 *   .from(assetsTable)
 *   .orderBy(desc(assetsTable.createdAt))
 *   .limit(limit)
 *   .offset(offset);
 * 
 * // With filters
 * const where = [];
 * if (streamId) {
 *   // Join with asset_streams table for many-to-many relationship
 *   const assetIds = await db.select({ assetId: assetStreamsTable.assetId })
 *     .from(assetStreamsTable)
 *     .where(eq(assetStreamsTable.streamId, streamId));
 *   where.push(inArray(assetsTable.id, assetIds.map(a => a.assetId)));
 * }
 * if (uploaderId) where.push(eq(assetsTable.uploaderId, uploaderId));
 * 
 * const assets = await db
 *   .select()
 *   .from(assetsTable)
 *   .where(and(...where))
 *   .orderBy(desc(assetsTable.createdAt));
 * ```
 * 
 * @see /docs/IMAGE_UPLOAD.md for complete database schema
 */

import { NextResponse } from 'next/server';
import { readAssets } from '@/lib/utils/assets-storage';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/assets
 * 
 * Fetches all assets from persistent storage, sorted by creation date
 * (newest first). Returns complete asset objects including all image
 * URLs, metadata, and color information.
 * 
 * TODO: Add query parameters:
 * - ?page=1&limit=50 - Pagination
 * - ?streamId=xyz - Filter by stream (via many-to-many relationship)
 * - ?uploaderId=xyz - Filter by uploader
 * - ?type=image - Filter by asset type
 * - ?search=query - Full-text search
 * 
 * Response:
 * {
 *   "assets": [...],
 *   "total": 123,      // TODO: Add total count
 *   "page": 1,         // TODO: Add pagination meta
 *   "hasMore": true    // TODO: Add hasMore flag
 * }
 */
export async function GET() {
  try {
    console.log('[GET /api/assets] Fetching assets from persistent storage...');
    
    // Read assets from JSON file storage (persists between requests)
    const assets = readAssets();
    
    console.log(`[GET /api/assets] Found ${assets.length} total assets`);
    
    // Sort assets by createdAt date (newest first)
    const sortedAssets = [...assets].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });
    
    console.log('[GET /api/assets] Top 3 assets (newest):');
    sortedAssets.slice(0, 3).forEach((asset, i) => {
      console.log(`  ${i + 1}. ${asset.title} (${asset.id}) - ${asset.createdAt}`);
    });
    
    return NextResponse.json(
      { assets: sortedAssets },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error) {
    console.error('[GET /api/assets] Error fetching assets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

