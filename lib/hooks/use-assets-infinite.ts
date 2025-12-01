/**
 * Infinite Scroll Hook for Assets
 * 
 * Provides infinite scrolling functionality with cursor-based pagination
 * using Supabase's `lt()` (less than) method for efficient queries.
 * 
 * Usage:
 * ```tsx
 * const { assets, loadMore, hasMore, loading } = useAssetsInfinite(initialAssets);
 * ```
 */

"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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
  created_at: string;
  updated_at: string;
  uploader?: {
    id: string;
    username: string;
    display_name: string;
    email: string;
    avatar_url?: string;
    job_title?: string;
  };
}

interface UseAssetsInfiniteReturn {
  assets: Asset[];
  loadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
}

const PAGE_SIZE = 20;

export function useAssetsInfinite(
  initialAssets: Asset[]
): UseAssetsInfiniteReturn {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialAssets.length >= PAGE_SIZE);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);

    try {
      const lastAsset = assets[assets.length - 1];
      if (!lastAsset) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const supabase = createClient();

      const { data, error } = await supabase
        .from("assets")
        .select(`
          *,
          uploader:users!uploader_id(*)
        `)
        .order("created_at", { ascending: false })
        .lt("created_at", lastAsset.created_at)
        .limit(PAGE_SIZE);

      if (error) {
        console.error("[useAssetsInfinite] Error loading more assets:", error);
        setLoading(false);
        return;
      }

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setAssets((prev) => [...prev, ...(data || [])]);
    } catch (error) {
      console.error("[useAssetsInfinite] Unexpected error:", error);
    } finally {
      setLoading(false);
    }
  }, [assets, loading, hasMore]);

  return { assets, loadMore, hasMore, loading };
}



