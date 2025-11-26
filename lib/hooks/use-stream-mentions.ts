import * as React from "react";
import { Stream } from "@/lib/mock-data/streams";
import { sanitizeToSlug } from "@/lib/utils/slug";
import { getStreams, addStream, getStreamById } from "@/lib/utils/stream-storage";

/**
 * Hook to extract and sync stream hashtags from text
 * Parses all #streamname patterns and syncs with streamIds array
 */
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void
) {
  // Parse all hashtags from text and convert to valid slugs
  const parseHashtags = React.useCallback((content: string): string[] => {
    // Match hashtags: lowercase, numbers, hyphens (must start/end with alphanumeric)
    const hashtagRegex = /#([a-z0-9]+(?:-[a-z0-9]+)*)/g;
    const matches = content.matchAll(hashtagRegex);
    const hashtags: string[] = [];
    
    for (const match of matches) {
      const tag = match[1]; // Already lowercase from regex
      // Ensure minimum length of 2 characters
      if (tag.length >= 2) {
        hashtags.push(tag);
      }
    }
    
    return [...new Set(hashtags)]; // Remove duplicates
  }, []);

  // Find or create stream by slug
  const findOrCreateStream = React.useCallback(async (streamSlug: string): Promise<string | null> => {
    // Sanitize to valid slug format
    const slug = sanitizeToSlug(streamSlug);
    
    if (!slug || slug.length < 2) {
      return null; // Invalid slug
    }
    
    // Check if stream exists by slug (use storage utils to include persisted streams)
    const allStreams = getStreams();
    const existing = allStreams.find(s => s.name === slug);
    
    if (existing) {
      return existing.id;
    }

    // Create new stream via API with slug as name
    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slug, // Use slug directly
          ownerType: 'user',
          isPrivate: false,
        }),
      });

      if (!response.ok) {
        console.error('Failed to create stream:', await response.text());
        return null;
      }

      const { stream } = await response.json();
      // Add to localStorage for immediate availability
      addStream(stream);
      return stream.id;
    } catch (error) {
      console.error('Error creating stream:', error);
      return null;
    }
  }, []);

  // Track processed hashtags to prevent infinite loops
  const processedHashtagsRef = React.useRef<Set<string>>(new Set());

  // Sync hashtags with streamIds
  const syncStreams = React.useCallback(async () => {
    const hashtags = parseHashtags(text);
    
    if (hashtags.length === 0) {
      // No hashtags in text - clear processed set
      processedHashtagsRef.current.clear();
      return;
    }

    // Filter out already processed hashtags
    const newHashtags = hashtags.filter(tag => !processedHashtagsRef.current.has(tag));
    
    if (newHashtags.length === 0) {
      return; // All hashtags already processed
    }

    // Get stream IDs for new hashtags only
    const streamIdsPromises = newHashtags.map(tag => findOrCreateStream(tag));
    const streamIds = (await Promise.all(streamIdsPromises)).filter((id): id is string => id !== null);

    if (streamIds.length > 0) {
      // Mark hashtags as processed
      newHashtags.forEach(tag => processedHashtagsRef.current.add(tag));
      
      // Merge with existing selections
      const newStreamIds = [...new Set([...selectedStreamIds, ...streamIds])];
      onStreamsChange(newStreamIds);
    }
  }, [text, parseHashtags, findOrCreateStream, selectedStreamIds, onStreamsChange]);

  // Debounced sync (wait for user to stop typing)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncStreams();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]); // Only depend on text to avoid infinite loops

  return {
    parseHashtags,
    findOrCreateStream,
  };
}

