/**
 * Following Assets Hook
 * 
 * Provides infinite scrolling functionality for assets from followed users
 * using cursor-based pagination.
 * 
 * Usage:
 * ```tsx
 * const { assets, loadMore, hasMore, loading, error } = useFollowingAssets();
 * ```
 */

"use client";

import { useState, useCallback, useEffect } from "react";

interface Asset {
  id: string;
  title: string;
  type: string;
  url: string;
  thumbnail_url?: string;
  medium_url?: string;
  uploader_id: string;
  width?: number;
  height?: number;
  dominant_color?: string;
  color_palette?: string[];
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface UseFollowingAssetsReturn {
  assets: Asset[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
}

export function useFollowingAssets(): UseFollowingAssetsReturn {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || (!hasMore && cursor !== null)) return;
    
    setLoading(true);
    setError(null);

    try {
      const url = new URL('/api/assets/following', window.location.origin);
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }
      url.searchParams.set('limit', '20');

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error('Failed to fetch following assets');
      }

      const data = await response.json();
      
      setAssets((prev) => [...prev, ...(data.assets || [])]);
      setHasMore(data.hasMore || false);
      setCursor(data.cursor || null);
    } catch (err) {
      console.error("[useFollowingAssets] Error loading assets:", err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, hasMore]);

  return { assets, loadMore, hasMore, loading, error };
}

