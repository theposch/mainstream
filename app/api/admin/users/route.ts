/**
 * Admin Users API Route
 * 
 * GET /api/admin/users - List all users with roles (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminUser } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * 
 * List all users with their platform roles
 * Only accessible by admins and owners
 * 
 * Query params:
 * - limit: number of users per page (default: 50)
 * - offset: pagination offset (default: 0)
 * - search: optional search query
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const admin = await getAdminUser();
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const search = searchParams.get('search') || '';

    // Build query for users with platform_role
    let usersQuery = supabase
      .from('users')
      .select('id, username, display_name, email, avatar_url, platform_role, created_at', { count: 'exact' })
      .order('created_at', { ascending: true }); // Oldest first to show owner at top

    // Add search filter if provided
    if (search) {
      const sanitizedSearch = search
        .replace(/[%_\\]/g, '\\$&')
        .replace(/['"]/g, '');
      usersQuery = usersQuery.or(
        `username.ilike.%${sanitizedSearch}%,display_name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`
      );
    }

    // Apply pagination
    usersQuery = usersQuery.range(offset, offset + limit - 1);

    const { data: users, error: usersError, count } = await usersQuery;

    if (usersError) {
      console.error('[GET /api/admin/users] Error fetching users:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      hasMore: (offset + limit) < (count || 0),
    });
  } catch (error) {
    console.error('[GET /api/admin/users] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

