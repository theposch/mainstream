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

export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = async () => {
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
        })
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch user')
        setLoading(false)
      }
    }

  useEffect(() => {
    fetchUser()

    // Subscribe to auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser()
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error, refetch: fetchUser }
}

