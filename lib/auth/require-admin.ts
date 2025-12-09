/**
 * Admin Authorization Utilities
 * 
 * Server-side utilities to check admin status and protect admin routes
 */

import { createClient } from "@/lib/supabase/server";
import type { PlatformRole } from "@/lib/types/database";

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  platformRole: PlatformRole;
}

/**
 * Check if user is an admin or owner
 */
export function isAdmin(role: PlatformRole | undefined): boolean {
  return role === 'admin' || role === 'owner';
}

/**
 * Check if user is the platform owner
 */
export function isOwner(role: PlatformRole | undefined): boolean {
  return role === 'owner';
}

/**
 * Get the current admin user or null if not admin
 * Returns user data if authenticated and has admin/owner role
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  try {
    const supabase = await createClient();
    
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return null;
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, username, display_name, email, platform_role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      return null;
    }

    // Check if user has admin role
    if (!isAdmin(userProfile.platform_role)) {
      return null;
    }

    return {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.display_name,
      email: userProfile.email,
      platformRole: userProfile.platform_role || 'user',
    };
  } catch (error) {
    console.error('Error checking admin status:', error);
    return null;
  }
}

/**
 * Require admin access - throws if not admin
 * Use this in API routes that require admin access
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  
  if (!admin) {
    throw new Error('Admin access required');
  }
  
  return admin;
}

