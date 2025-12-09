/**
 * Get Current Authenticated User
 * 
 * Server-side utility to get the currently logged-in user's profile data.
 * Uses Supabase Auth session + database query.
 */

import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import type { PlatformRole } from "@/lib/types/database";

// Re-export for backwards compatibility
export type { PlatformRole };

export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  jobTitle?: string;
  location?: string;
  teamId?: string;
  createdAt: string;
  platformRole?: PlatformRole;
}

/**
 * Get the current authenticated user
 * This function is cached per request to avoid multiple database calls
 * 
 * @returns User object if authenticated, null otherwise
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authUser) {
      return null;
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      // User is authenticated but doesn't have a profile yet
      // This can happen right after signup before the trigger creates the profile
      return {
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'user',
        displayName: authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatarUrl: `https://avatar.vercel.sh/${authUser.email}.png`,
        bio: undefined,
        jobTitle: undefined,
        teamId: undefined,
        createdAt: authUser.created_at,
        platformRole: 'user',
      };
    }

    // Map database columns to User interface
    return {
      id: userProfile.id,
      username: userProfile.username,
      displayName: userProfile.display_name,
    email: userProfile.email,
    avatarUrl: userProfile.avatar_url,
    bio: userProfile.bio,
    jobTitle: userProfile.job_title,
      location: userProfile.location,
      teamId: userProfile.team_id,
      createdAt: userProfile.created_at,
      platformRole: userProfile.platform_role || 'user',
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
});

/**
 * Require authentication - throws error if not authenticated
 * Use this in Server Components/Actions that require auth
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

