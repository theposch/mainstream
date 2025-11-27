/**
 * Assets API Route
 * 
 * Provides endpoints for fetching assets from Supabase database.
 * 
 * @see /docs/IMAGE_UPLOAD.md for implementation details
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/assets
 * 
 * Fetches all assets from Supabase database, sorted by creation date
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
    console.log('[GET /api/assets] Fetching assets from Supabase...');
    
    const supabase = await createClient();
    
    // Query assets from Supabase with uploader information
    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        uploader:users!uploader_id(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[GET /api/assets] Database error:', error);
      return NextResponse.json(
        { 
          error: 'Failed to fetch assets from database',
          details: error.message
        },
        { status: 500 }
      );
    }
    
    console.log(`[GET /api/assets] Found ${assets?.length || 0} total assets`);
    
    if (assets && assets.length > 0) {
    console.log('[GET /api/assets] Top 3 assets (newest):');
      assets.slice(0, 3).forEach((asset, i) => {
        console.log(`  ${i + 1}. ${asset.title} (${asset.id}) - ${asset.created_at}`);
    });
    }
    
    return NextResponse.json(
      { assets: assets || [] },
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

