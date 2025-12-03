"use client";

import * as React from "react";
import type { Stream } from "@/lib/types/database";

export interface UseStreamSelectionOptions {
  initialStreamIds?: string[];
  initialPendingNames?: string[];
}

export interface UseStreamSelectionReturn {
  // State
  streamIds: string[];
  pendingStreamNames: string[];
  excludedStreamNames: string[];
  allStreams: Stream[];
  
  // Setters
  setStreamIds: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingStreamNames: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludedStreamNames: React.Dispatch<React.SetStateAction<string[]>>;
  
  // Actions
  createPendingStreams: () => Promise<{ created: string[]; failed: string[] }>;
  reset: (options?: { streamIds?: string[]; pendingNames?: string[] }) => void;
  
  // Loading
  isLoadingStreams: boolean;
}

/**
 * Shared hook for managing stream selection state.
 * Used by both upload-dialog and edit-asset-dialog.
 * 
 * Handles:
 * - Stream fetching from API
 * - Selected stream IDs state
 * - Pending stream names (to be created on submit)
 * - Excluded stream names (user removed, prevents auto-sync re-adding)
 * - Creating pending streams via API
 */
export function useStreamSelection(
  options: UseStreamSelectionOptions = {}
): UseStreamSelectionReturn {
  const { initialStreamIds = [], initialPendingNames = [] } = options;
  
  // Stream state
  const [streamIds, setStreamIds] = React.useState<string[]>(initialStreamIds);
  const [pendingStreamNames, setPendingStreamNames] = React.useState<string[]>(initialPendingNames);
  const [excludedStreamNames, setExcludedStreamNames] = React.useState<string[]>([]);
  
  // All available streams (fetched from API)
  const [allStreams, setAllStreams] = React.useState<Stream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = React.useState(false);
  
  // Fetch streams from API
  const fetchStreams = React.useCallback(async () => {
    setIsLoadingStreams(true);
    try {
      const res = await fetch('/api/streams');
      if (res.ok) {
        const data = await res.json();
        setAllStreams(data.streams || []);
      }
    } catch (error) {
      console.error('[useStreamSelection] Failed to fetch streams:', error);
    } finally {
      setIsLoadingStreams(false);
    }
  }, []);
  
  // Fetch streams on mount
  React.useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);
  
  // Create pending streams via API
  const createPendingStreams = React.useCallback(async (): Promise<{ created: string[]; failed: string[] }> => {
    if (pendingStreamNames.length === 0) {
      return { created: [], failed: [] };
    }
    
    const createPromises = pendingStreamNames.map(async (name) => {
      try {
        const response = await fetch('/api/streams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            owner_type: 'user',
            is_private: false,
          }),
        });

        if (response.ok) {
          const { stream } = await response.json();
          return { success: true, id: stream.id, name };
        } else {
          return { success: false, id: '', name };
        }
      } catch {
        return { success: false, id: '', name };
      }
    });

    const results = await Promise.all(createPromises);
    const created = results.filter(r => r.success).map(r => r.id);
    const failed = results.filter(r => !r.success).map(r => r.name);
    
    if (failed.length > 0) {
      console.warn('[useStreamSelection] Failed to create some streams:', failed);
    }
    
    return { created, failed };
  }, [pendingStreamNames]);
  
  // Reset state
  const reset = React.useCallback((resetOptions?: { streamIds?: string[]; pendingNames?: string[] }) => {
    setStreamIds(resetOptions?.streamIds ?? initialStreamIds);
    setPendingStreamNames(resetOptions?.pendingNames ?? initialPendingNames);
    setExcludedStreamNames([]);
  }, [initialStreamIds, initialPendingNames]);
  
  return {
    // State
    streamIds,
    pendingStreamNames,
    excludedStreamNames,
    allStreams,
    
    // Setters
    setStreamIds,
    setPendingStreamNames,
    setExcludedStreamNames,
    
    // Actions
    createPendingStreams,
    reset,
    
    // Loading
    isLoadingStreams,
  };
}

