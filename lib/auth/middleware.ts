/**
 * Authentication middleware for API routes
 * 
 * TODO: Replace with real authentication provider (NextAuth.js, Clerk, Supabase Auth)
 * This is a mock implementation for development
 */

import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@/lib/mock-data/users';
import { teams, Team } from '@/lib/mock-data/teams';

export interface AuthenticatedRequest extends NextRequest {
  user?: typeof currentUser;
}

/**
 * Mock authentication check
 * In production, this would:
 * 1. Check session cookie/token
 * 2. Verify with auth provider
 * 3. Return user data
 * 
 * @returns User object if authenticated, null otherwise
 */
export function getCurrentUser(): typeof currentUser | null {
  // TODO: Replace with real auth check
  // Example with NextAuth:
  // const session = await getServerSession(authOptions);
  // return session?.user || null;
  
  // For development, always return currentUser
  return currentUser;
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 * Supports dynamic route parameters by passing context as third argument
 */
export function requireAuth<TContext = unknown>(
  handler: (req: NextRequest, user: typeof currentUser, context: TContext) => Promise<Response>
) {
  return async (req: NextRequest, context: TContext): Promise<Response> => {
    const user = getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'You must be logged in to perform this action'
        },
        { status: 401 }
      );
    }

    return handler(req, user, context);
  };
}

/**
 * Middleware to require authentication (for routes without params)
 * Returns 401 if user is not authenticated
 */
export function requireAuthNoParams(
  handler: (req: NextRequest, user: typeof currentUser) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const user = getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'You must be logged in to perform this action'
        },
        { status: 401 }
      );
    }

    return handler(req, user);
  };
}

/**
 * Check if user has permission to modify a resource
 */
export function canUserModifyResource(
  user: typeof currentUser,
  resourceOwnerId: string,
  resourceOwnerType: 'user' | 'team'
): boolean {
  // If user owns the resource directly
  if (resourceOwnerType === 'user' && user.id === resourceOwnerId) {
    return true;
  }

  // If resource is owned by a team, check membership
  if (resourceOwnerType === 'team') {
    // TODO: Check team membership from database
    // For now, using mock data
    const team = teams.find((t: Team) => t.id === resourceOwnerId);
    return team?.memberIds?.includes(user.id) || false;
  }

  return false;
}

/**
 * Rate limiting middleware (simple implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  limit: number = 10, // requests
  window: number = 60000 // 1 minute
) {
  return async (req: NextRequest, user: typeof currentUser): Promise<Response | null> => {
    const key = `${user.id}-${req.url}`;
    const now = Date.now();
    const record = requestCounts.get(key);

    // Clean up old records
    if (record && now > record.resetTime) {
      requestCounts.delete(key);
    }

    const current = requestCounts.get(key) || { count: 0, resetTime: now + window };

    if (current.count >= limit) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((current.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((current.resetTime - now) / 1000))
          }
        }
      );
    }

    current.count++;
    requestCounts.set(key, current);

    return null; // Continue to handler
  };
}



