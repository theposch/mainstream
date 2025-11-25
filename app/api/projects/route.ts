import { NextRequest, NextResponse } from 'next/server';
import { projects } from '@/lib/mock-data/projects';
import { Project } from '@/lib/mock-data/projects';
import { sanitizeInput } from '@/lib/utils/image';
import { requireAuth, canUserModifyResource, rateLimit } from '@/lib/auth/middleware';

export const runtime = 'nodejs';

/**
 * POST /api/projects
 * 
 * Creates a new project
 * 
 * Request body:
 * {
 *   "name": "Project Name",
 *   "description": "Optional description",
 *   "isPrivate": false,
 *   "ownerType": "user" | "team",
 *   "ownerId": "user-id or team-id"
 * }
 * 
 * Response:
 * {
 *   "project": { ... project object ... }
 * }
 */
export const POST = requireAuth(async (request: NextRequest, user) => {
  try {
    // Rate limiting: max 10 projects per minute
    const rateLimitResult = await rateLimit(10, 60000)(request, user);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { name, description, isPrivate = false, ownerType = 'user', ownerId } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name cannot be empty' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Project name must be less than 100 characters' },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: 'Description must be less than 500 characters' },
        { status: 400 }
      );
    }

    if (ownerType !== 'user' && ownerType !== 'team') {
      return NextResponse.json(
        { error: 'Owner type must be "user" or "team"' },
        { status: 400 }
      );
    }

    const finalOwnerId = ownerId || user.id;

    // Authorization: verify user can create project for this owner
    if (!canUserModifyResource(user, finalOwnerId, ownerType)) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You do not have permission to create projects for this workspace'
        },
        { status: 403 }
      );
    }

    // Generate unique ID
    const projectId = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create new project
    const newProject: Project = {
      id: projectId,
      name: sanitizeInput(name),
      description: description ? sanitizeInput(description) : undefined,
      isPrivate: Boolean(isPrivate),
      ownerType,
      ownerId: finalOwnerId,
      createdAt: new Date().toISOString(),
    };

    // Add to mock projects array (in-memory)
    // TODO: Replace with database INSERT operation
    projects.push(newProject);

    return NextResponse.json(
      { project: newProject },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * GET /api/projects
 * 
 * Fetches projects for the current user/workspace
 * 
 * Query parameters:
 * - workspace: user-id or team-id (optional)
 * - limit: number of projects to return (optional)
 * 
 * Response:
 * {
 *   "projects": [ ... array of projects ... ]
 * }
 */
export const GET = requireAuth(async (request: NextRequest, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const workspace = searchParams.get('workspace');
    const limit = searchParams.get('limit');

    // TODO: In production, fetch from database with proper filtering and permissions
    
    let filteredProjects = projects;

    // Filter by workspace if provided
    if (workspace) {
      filteredProjects = projects.filter(p => p.ownerId === workspace);
    } else {
      // If no workspace specified, show user's accessible projects
      // (owned by user or teams they're in)
      filteredProjects = projects.filter(p => {
        if (p.ownerType === 'user' && p.ownerId === user.id) return true;
        if (p.ownerType === 'team') {
          return canUserModifyResource(user, p.ownerId, 'team');
        }
        return false;
      });
    }

    // Apply limit if provided
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        filteredProjects = filteredProjects.slice(0, limitNum);
      }
    }

    return NextResponse.json(
      { projects: filteredProjects },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

