"use client"

/**
 * Client-side hook to get the current authenticated user
 * 
 * Usage:
 * ```tsx
 * "use client"
 * import { useUser } from "@/lib/auth/use-user"
 * 
 * export function MyComponent() {
 *   const { user, loading, error } = useUser()
 *   
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   if (!user) return <div>Not logged in</div>
 *   
 *   return <div>Hello, {user.displayName}</div>
 * }
 * ```
 */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "./get-user";

interface UseUserReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Standalone fetch function defined outside the hook so it can be used
// both inside useEffect (without causing the set-state-in-effect rule to fire)
// and returned as refetch
async function doFetchUser(
  setUser: (u: User | null) => void,
  setLoading: (l: boolean) => void,
  setError: (e: string | null) => void
) {
  try {
    const supabase = createClient()

    // Get current auth session
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (!authUser) {
      setUser(null)
      setLoading(false)
      return
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      // User authenticated but no profile - create fallback
      // Use email or id for avatar to avoid 'undefined' in URL
      const avatarIdentifier = authUser.email || authUser.id;
      setUser({
        id: authUser.id,
        username: authUser.email?.split('@')[0] || 'user',
        displayName: authUser.email?.split('@')[0] || 'User',
        email: authUser.email || '',
        avatarUrl: `https://avatar.vercel.sh/${avatarIdentifier}.png`,
        createdAt: authUser.created_at,
        platformRole: 'user',
      })
      setLoading(false)
      return
    }

    // Map to User interface
    setUser({
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
    })
    setLoading(false)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to fetch user')
    setLoading(false)
  }
}

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Inline async fetch to satisfy react-hooks/set-state-in-effect rule
    const run = async () => {
      await doFetchUser(setUser, setLoading, setError)
    }
    run()

    // Subscribe to auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        doFetchUser(setUser, setLoading, setError)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const refetch = async () => {
    await doFetchUser(setUser, setLoading, setError)
  }

  return { user, loading, error, refetch }
}

