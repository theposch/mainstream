import * as React from "react";

interface Stream {
  id: string;
  name: string;
  description?: string;
  status: string;
  owner_type: string;
  owner_id: string;
}

interface DropdownOption extends Stream {
  isNew?: boolean;
}

/**
 * Shared hook for stream dropdown logic
 * Used by both StreamMentionDropdown and StreamPicker
 * Provides filtering, validation, and "create option" logic
 */
export function useStreamDropdownOptions(
  query: string,
  streams: Stream[],
  options: {
    maxResults?: number;
    includeInactive?: boolean;
  } = {}
) {
  const { maxResults = 10, includeInactive = false } = options;

  // Validate stream name format (same as useStreamMentions)
  const isValidStreamName = React.useCallback((name: string): boolean => {
    const slug = name.toLowerCase().trim();
    if (slug.length < 2 || slug.length > 50) return false;
    // Match alphanumeric + hyphens (must start/end with alphanumeric)
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }, []);

  // Filter active streams only (unless includeInactive)
  const activeStreams = React.useMemo(() => 
    includeInactive 
      ? streams 
      : streams.filter(s => s.status === 'active'),
    [streams, includeInactive]
  );

  // Filter streams by search query
  const filteredStreams = React.useMemo(() => {
    if (!query.trim()) {
      // No query - return first N streams
      return activeStreams.slice(0, maxResults);
    }
    
    const lowerQuery = query.toLowerCase();
    return activeStreams
      .filter(s =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.description?.toLowerCase().includes(lowerQuery)
      )
      .slice(0, maxResults);
  }, [activeStreams, query, maxResults]);

  // Normalize query (lowercase, trimmed)
  const normalizedQuery = React.useMemo(() => 
    query.toLowerCase().trim(),
    [query]
  );

  // Check if query matches any existing stream exactly
  const exactMatch = React.useMemo(() => {
    return filteredStreams.some(s => s.name === normalizedQuery);
  }, [filteredStreams, normalizedQuery]);

  // Show create option if query is valid and doesn't match exactly
  const showCreateOption = React.useMemo(() => {
    return normalizedQuery.length >= 2 && 
           !exactMatch && 
           isValidStreamName(normalizedQuery);
  }, [normalizedQuery, exactMatch, isValidStreamName]);

  // Combined list: existing streams + create option
  const allOptions = React.useMemo<DropdownOption[]>(() => [
    ...filteredStreams,
    ...(showCreateOption ? [{
      id: '__create__',
      name: normalizedQuery,
      description: undefined,
      status: 'pending' as const,
      owner_type: 'user',
      owner_id: '',
      isNew: true,
    }] : [])
  ], [filteredStreams, showCreateOption, normalizedQuery]);

  return {
    // Filtered results
    filteredStreams,
    allOptions,
    
    // Query info
    normalizedQuery,
    exactMatch,
    showCreateOption,
    
    // Utilities
    isValidStreamName,
  };
}

