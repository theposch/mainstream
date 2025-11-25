import { NextRequest, NextResponse } from 'next/server';
import { streams, Stream, STREAM_VALIDATION } from '@/lib/mock-data/streams';
import { sanitizeInput } from '@/lib/utils/image';
import { requireAuth, canUserModifyResource, rateLimit } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

/**
 * POST /api/streams
 * 
 * Creates a new stream
 * 
 * Request body:
 * {
 *   "name": "# Stream Name",
 *   "description": "Optional description",
 *   "isPrivate": false,
 *   "ownerType": "user" | "team",
 *   "ownerId": "user-id or team-id",
 *   "status": "active" (optional, defaults to "active")
 * }
 * 
 * Response:
 * {
 *   "stream": { ... stream object ... }
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Rate limiting: max 10 streams per minute
    const rateLimitResult = await rateLimit(10, 60000)(request, user);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { 
      name, 
      description, 
      isPrivate = false, 
      ownerType = 'user', 
      ownerId,
      status = 'active'
    } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Stream name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Stream name cannot be empty' },
        { status: 400 }
      );
    }

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

    if (description && description.length > STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be less than ${STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (ownerType !== 'user' && ownerType !== 'team') {
      return NextResponse.json(
        { error: 'Owner type must be "user" or "team"' },
        { status: 400 }
      );
    }

    if (status !== 'active' && status !== 'archived') {
      return NextResponse.json(
        { error: 'Status must be "active" or "archived"' },
        { status: 400 }
      );
    }

    const finalOwnerId = ownerId || user.id;

    // Authorization: verify user can create stream for this owner
    if (!canUserModifyResource(user, finalOwnerId, ownerType)) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to create streams for this workspace'
        },
        { status: 403 }
      );
    }

    // Check for duplicate stream name in same workspace
    const duplicateStream = streams.find(s => 
      s.name.toLowerCase() === trimmedName.toLowerCase() &&
      s.ownerId === finalOwnerId &&
      s.ownerType === ownerType
    );

    if (duplicateStream) {
      return NextResponse.json(
        { error: 'A stream with this name already exists in your workspace' },
        { status: 409 }
      );
    }

    // Generate unique ID
    const streamId = `stream-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    // Create new stream
    const newStream: Stream = {
      id: streamId,
      name: sanitizeInput(trimmedName),
      description: description ? sanitizeInput(description) : undefined,
      isPrivate: Boolean(isPrivate),
      ownerType,
      ownerId: finalOwnerId,
      status,
      createdAt: now,
      updatedAt: now,
    };

    // Add to mock streams array (in-memory)
    // TODO: Replace with database INSERT operation
    streams.push(newStream);

    return NextResponse.json(
      { stream: newStream },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating stream:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create stream',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/streams
 * 
 * Fetches streams for the current user/workspace
 * 
 * Query parameters:
 * - workspace: user-id or team-id (optional)
 * - status: "active" | "archived" (optional, defaults to "active")
 * - limit: number of streams to return (optional)
 * 
 * Response:
 * {
 *   "streams": [ ... array of streams ... ]
 * }
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace');
    const status = searchParams.get('status') || 'active';
    const limit = searchParams.get('limit');

    // TODO: In production, fetch from database with proper filtering and permissions
    
    let filteredStreams = streams;

    // Filter by status
    if (status === 'active' || status === 'archived') {
      filteredStreams = filteredStreams.filter(s => s.status === status);
    }

    // Filter by workspace if provided
    if (workspace) {
      filteredStreams = filteredStreams.filter(s => s.ownerId === workspace);
    } else {
      // If no workspace specified, show user's accessible streams
      // (owned by user or teams they're in)
      filteredStreams = filteredStreams.filter(s => {
        // Always include public streams
        if (!s.isPrivate) return true;
        
        // Include private streams owned by user
        if (s.ownerType === 'user' && s.ownerId === user.id) return true;
        
        // Include private streams from user's teams
        if (s.ownerType === 'team') {
          return canUserModifyResource(user, s.ownerId, 'team');
        }
        
        return false;
      });
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredStreams = filteredStreams.slice(0, limitNum);
      }
    }

    // Sort by most recently updated
    filteredStreams.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json(
      { streams: filteredStreams },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching streams:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch streams',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

