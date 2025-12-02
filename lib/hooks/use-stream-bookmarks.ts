/**
 * Stream Bookmarks Hook
 * 
 * Manages fetching and mutating stream bookmarks.
 * 
 * Usage:
 * ```tsx
 * const { bookmarks, addBookmark, deleteBookmark, loading, error } = useStreamBookmarks(streamId);
 * ```
 */

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { StreamBookmark } from "@/lib/types/database";

interface BookmarkWithCreator extends StreamBookmark {
  creator?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface UseStreamBookmarksReturn {
  bookmarks: BookmarkWithCreator[];
  addBookmark: (url: string, title?: string) => Promise<BookmarkWithCreator | null>;
  deleteBookmark: (bookmarkId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStreamBookmarks(streamId: string): UseStreamBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<BookmarkWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref to track current bookmarks for rollback without adding to callback dependencies
  const bookmarksRef = useRef<BookmarkWithCreator[]>([]);
  bookmarksRef.current = bookmarks;

  // Fetch bookmarks from API
  const fetchBookmarks = useCallback(async () => {
    if (!streamId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/streams/${streamId}/bookmarks`);
      
      if (response.ok) {
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        console.error('[useStreamBookmarks] API error:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('[useStreamBookmarks] Error fetching bookmarks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const addBookmark = useCallback(async (url: string, title?: string): Promise<BookmarkWithCreator | null> => {
    if (!streamId) return null;
    
    try {
      const response = await fetch(`/api/streams/${streamId}/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, title }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add bookmark');
      }

      const { bookmark } = await response.json();
      
      // Add to local state
      setBookmarks(prev => [...prev, bookmark]);
      
      return bookmark;
    } catch (err) {
      console.error('[useStreamBookmarks] Error adding bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to add bookmark');
      return null;
    }
  }, [streamId]);

  const deleteBookmark = useCallback(async (bookmarkId: string): Promise<boolean> => {
    if (!streamId) return false;
    
    // Capture current state for rollback using ref (avoids dependency on bookmarks)
    const previousBookmarks = bookmarksRef.current;
    
    // Optimistic update
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    
    try {
      const response = await fetch(`/api/streams/${streamId}/bookmarks/${bookmarkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bookmark');
      }

      return true;
    } catch (err) {
      console.error('[useStreamBookmarks] Error deleting bookmark:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete bookmark');
      
      // Rollback optimistic update
      setBookmarks(previousBookmarks);
      return false;
    }
  }, [streamId]);

  // Memoize return object to prevent unnecessary re-renders
  return useMemo(() => ({
    bookmarks,
    addBookmark,
    deleteBookmark,
    loading,
    error,
    refetch: fetchBookmarks,
  }), [bookmarks, addBookmark, deleteBookmark, loading, error, fetchBookmarks]);
}

/**
 * Helper function to extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * Helper function to get favicon URL for a domain
 */
export function getFaviconUrl(url: string, size: number = 16): string {
  const domain = extractDomain(url);
  return `https://www.google.com/s2/favicons?sz=${size}&domain=${domain}`;
}

