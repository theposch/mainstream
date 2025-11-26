import { NextRequest, NextResponse } from 'next/server';
import { streams, getStreamBySlug } from '@/lib/mock-data/streams';
import { assets } from '@/lib/mock-data/assets';
import { getAssetsForStream, addAssetToStream, removeAssetFromStream, validateAssetStreams } from '@/lib/mock-data/migration-helpers';
import { requireAuth, canUserModifyResource } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/:id/assets
 * 
 * Fetches all assets in a specific stream
 * 
 * Query parameters:
 * - limit: number of assets to return (optional)
 * - offset: pagination offset (optional)
 * 
 * Response:
 * {
 *   "assets": [ ... array of asset objects ... ],
 *   "total": number,
 *   "limit": number,
 *   "offset": number
 * }
 */
export const GET = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id: streamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Find stream by slug first, fallback to ID for backward compatibility
    const stream = getStreamBySlug(streamId) || streams.find(s => s.id === streamId);

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (stream.isPrivate) {
      const hasAccess = 
        (stream.ownerType === 'user' && stream.ownerId === user.id) ||
        (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Forbidden', message: 'You do not have access to this stream' },
          { status: 403 }
        );
      }
    }

    // Get assets for this stream
    let streamAssets = getAssetsForStream(streamId, assets);

    // Sort by most recent
    streamAssets.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const total = streamAssets.length;

    // Apply pagination
    let offsetNum = 0;
    let limitNum = 50; // Default limit

    if (offset) {
      offsetNum = parseInt(offset, 10);
      if (isNaN(offsetNum) || offsetNum < 0) offsetNum = 0;
    }

    if (limit) {
      limitNum = parseInt(limit, 10);
      if (isNaN(limitNum) || limitNum < 1) limitNum = 50;
      if (limitNum > 100) limitNum = 100; // Max limit
    }

    streamAssets = streamAssets.slice(offsetNum, offsetNum + limitNum);

    return NextResponse.json(
      {
        assets: streamAssets,
        total,
        limit: limitNum,
        offset: offsetNum,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching stream assets:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stream assets',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/streams/:id/assets
 * 
 * Adds an asset to a stream (tags it)
 * 
 * Request body:
 * {
 *   "assetId": "asset-123"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Asset added to stream",
 *   "asset": { ... asset object with updated streamIds ... }
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id: streamId } = await context.params;

    // Find stream by slug first, fallback to ID for backward compatibility
    const stream = getStreamBySlug(streamId) || streams.find(s => s.id === streamId);

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Authorization: user must have modify rights
    const canModify = 
      (stream.ownerType === 'user' && stream.ownerId === user.id) ||
      (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

    if (!canModify) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to add assets to this stream'
        },
        { status: 403 }
      );
    }

    // Cannot add to archived streams
    if (stream.status === 'archived') {
      return NextResponse.json(
        { error: 'Cannot add assets to archived streams' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { assetId } = body;

    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Find asset
    const asset = assets.find(a => a.id === assetId);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Check if asset already belongs to this stream
    if (asset.streamIds && asset.streamIds.includes(streamId)) {
      return NextResponse.json(
        { error: 'Asset already belongs to this stream' },
        { status: 409 }
      );
    }

    // Add stream to asset's streamIds
    if (!asset.streamIds) {
      asset.streamIds = [];
    }

    const newStreamIds = [...asset.streamIds, streamId];

    // Validate stream count
    const validation = validateAssetStreams(newStreamIds);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    asset.streamIds = newStreamIds;

    // Add to junction table
    addAssetToStream(assetId, streamId, user.id);

    // Update timestamp on stream
    stream.updatedAt = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message: 'Asset added to stream',
        asset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error adding asset to stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add asset to stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/streams/:id/assets/:assetId
 * 
 * Removes an asset from a stream (untags it)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Asset removed from stream"
 * }
 */
export const DELETE = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id: streamId } = await context.params;
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        { error: 'Asset ID is required' },
        { status: 400 }
      );
    }

    // Find stream by slug first, fallback to ID for backward compatibility
    const stream = getStreamBySlug(streamId) || streams.find(s => s.id === streamId);

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Authorization: user must have modify rights
    const canModify = 
      (stream.ownerType === 'user' && stream.ownerId === user.id) ||
      (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

    if (!canModify) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to remove assets from this stream'
        },
        { status: 403 }
      );
    }

    // Find asset
    const asset = assets.find(a => a.id === assetId);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Check if asset belongs to this stream
    if (!asset.streamIds || !asset.streamIds.includes(streamId)) {
      return NextResponse.json(
        { error: 'Asset does not belong to this stream' },
        { status: 404 }
      );
    }

    // Remove stream from asset's streamIds
    asset.streamIds = asset.streamIds.filter(id => id !== streamId);

    // Validate that asset still belongs to at least one stream
    if (asset.streamIds.length === 0) {
      return NextResponse.json(
        { 
          error: 'Cannot remove asset from its only stream',
          message: 'Asset must belong to at least one stream. Add it to another stream first.'
        },
        { status: 400 }
      );
    }

    // Remove from junction table
    removeAssetFromStream(assetId, streamId);

    // Update timestamp on stream
    stream.updatedAt = new Date().toISOString();

    return NextResponse.json(
      {
        success: true,
        message: 'Asset removed from stream',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing asset from stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to remove asset from stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

