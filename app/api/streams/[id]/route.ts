import { NextRequest, NextResponse } from 'next/server';
import { streams, Stream, STREAM_VALIDATION, getStreamMembers, getStreamResources } from '@/lib/mock-data/streams';
import { getAssetsForStream } from '@/lib/mock-data/migration-helpers';
import { assets } from '@/lib/mock-data/assets';
import { sanitizeInput } from '@/lib/utils/image';
import { requireAuth, canUserModifyResource } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/streams/:id
 * 
 * Fetches a single stream by ID with its resources and members
 * 
 * Response:
 * {
 *   "stream": { ... stream object ... },
 *   "members": [ ... array of stream members ... ],
 *   "resources": [ ... array of stream resources ... ],
 *   "assetsCount": number
 * }
 */
export const GET = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Find stream
    const stream = streams.find(s => s.id === id);

    if (!stream) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    if (stream.isPrivate) {
      // User must be owner or member of team
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

    // Get related data
    const members = getStreamMembers(id);
    const resources = getStreamResources(id);
    const streamAssets = getAssetsForStream(id, assets);

    return NextResponse.json(
      {
        stream,
        members,
        resources,
        assetsCount: streamAssets.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/streams/:id
 * 
 * Updates a stream
 * 
 * Request body (all fields optional):
 * {
 *   "name": "# Updated Stream Name",
 *   "description": "Updated description",
 *   "isPrivate": true
 * }
 * 
 * Response:
 * {
 *   "stream": { ... updated stream object ... }
 * }
 */
export const PUT = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Find stream
    const streamIndex = streams.findIndex(s => s.id === id);

    if (streamIndex === -1) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const stream = streams[streamIndex];

    // Authorization: user must be owner or have modify rights
    const canModify = 
      (stream.ownerType === 'user' && stream.ownerId === user.id) ||
      (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

    if (!canModify) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to modify this stream'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, isPrivate } = body;

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return NextResponse.json(
          { error: 'Stream name must be a string' },
          { status: 400 }
        );
      }

      const trimmedName = name.trim();

      if (trimmedName.length < STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Stream name must be at least ${STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH} characters` },
          { status: 400 }
        );
      }

      if (trimmedName.length > STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH) {
        return NextResponse.json(
          { error: `Stream name must be less than ${STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH} characters` },
          { status: 400 }
        );
      }

      // Check for duplicate stream name in same workspace
      const duplicateStream = streams.find(s => 
        s.id !== id &&
        s.name.toLowerCase() === trimmedName.toLowerCase() &&
        s.ownerId === stream.ownerId &&
        s.ownerType === stream.ownerType
      );

      if (duplicateStream) {
        return NextResponse.json(
          { error: 'A stream with this name already exists in your workspace' },
          { status: 409 }
        );
      }

      stream.name = sanitizeInput(trimmedName);
    }

    if (description !== undefined) {
      if (description && typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Description must be a string' },
          { status: 400 }
        );
      }

      if (description && description.length > STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH) {
        return NextResponse.json(
          { error: `Description must be less than ${STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH} characters` },
          { status: 400 }
        );
      }

      stream.description = description ? sanitizeInput(description) : undefined;
    }

    if (isPrivate !== undefined) {
      stream.isPrivate = Boolean(isPrivate);
    }

    // Update timestamp
    stream.updatedAt = new Date().toISOString();

    // Update in array (in-memory)
    // TODO: Replace with database UPDATE operation
    streams[streamIndex] = stream;

    return NextResponse.json(
      { stream },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/streams/:id
 * 
 * Deletes a stream (owner only)
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "Stream deleted successfully"
 * }
 */
export const DELETE = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Find stream
    const streamIndex = streams.findIndex(s => s.id === id);

    if (streamIndex === -1) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const stream = streams[streamIndex];

    // Authorization: only owner can delete
    const isOwner = 
      (stream.ownerType === 'user' && stream.ownerId === user.id) ||
      (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

    if (!isOwner) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'Only the stream owner can delete it'
        },
        { status: 403 }
      );
    }

    // Check if stream has assets
    const streamAssets = getAssetsForStream(id, assets);
    
    if (streamAssets.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete stream with assets',
          message: `This stream contains ${streamAssets.length} asset(s). Please remove them first or archive the stream instead.`,
          assetsCount: streamAssets.length
        },
        { status: 409 }
      );
    }

    // Remove from array (in-memory)
    // TODO: Replace with database DELETE operation
    // Also need to clean up stream_members and stream_resources tables
    streams.splice(streamIndex, 1);

    return NextResponse.json(
      { 
        success: true,
        message: 'Stream deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * PATCH /api/streams/:id
 * 
 * Archives or unarchives a stream
 * 
 * Request body:
 * {
 *   "status": "archived" | "active"
 * }
 * 
 * Response:
 * {
 *   "stream": { ... updated stream object ... }
 * }
 */
export const PATCH = requireAuth(async (request: NextRequest, user, context: RouteContext) => {
  try {
    const { id } = await context.params;

    // Find stream
    const streamIndex = streams.findIndex(s => s.id === id);

    if (streamIndex === -1) {
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }

    const stream = streams[streamIndex];

    // Authorization: user must be owner or have modify rights
    const canModify = 
      (stream.ownerType === 'user' && stream.ownerId === user.id) ||
      (stream.ownerType === 'team' && canUserModifyResource(user, stream.ownerId, 'team'));

    if (!canModify) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to modify this stream'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    // Validation
    if (!status || (status !== 'active' && status !== 'archived')) {
      return NextResponse.json(
        { error: 'Status must be "active" or "archived"' },
        { status: 400 }
      );
    }

    // Update status
    stream.status = status;
    stream.updatedAt = new Date().toISOString();

    // Update in array (in-memory)
    // TODO: Replace with database UPDATE operation
    streams[streamIndex] = stream;

    return NextResponse.json(
      { stream },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating stream status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update stream status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

