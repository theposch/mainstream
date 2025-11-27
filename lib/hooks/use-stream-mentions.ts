import * as React from "react";
import { sanitizeToSlug } from "@/lib/utils/slug";

interface Stream {
  id: string;
  name: string;
  description?: string;
  status: string;
  owner_type: string;
  owner_id: string;
}

/**
 * Hook to extract and sync stream hashtags from text
 * Parses all #streamname patterns and syncs with streamIds array
 */
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  onStreamCreated?: (stream: Stream) => void
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

  // Track in-flight stream creation requests to prevent duplicates
  const creatingStreamsRef = React.useRef<Set<string>>(new Set());

  // Find or create stream by slug
  const findOrCreateStream = React.useCallback(async (streamSlug: string): Promise<string | null> => {
    // Sanitize to valid slug format
    const slug = sanitizeToSlug(streamSlug);
    
    if (!slug || slug.length < 2) {
      return null; // Invalid slug
    }
    
    // Check if stream exists in the provided streams list
    const existing = streams.find(s => s.name === slug);
    
    if (existing) {
      return existing.id;
    }

    // Check if already creating this stream
    if (creatingStreamsRef.current.has(slug)) {
      console.log(`[useStreamMentions] Already creating stream: ${slug}`);
      return null;
    }

    // Mark as creating
    creatingStreamsRef.current.add(slug);

    // Create new stream via API with slug as name
    try {
      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slug, // Use slug directly
          owner_type: 'user',
          is_private: false,
        }),
      });

      if (!response.ok) {
        console.error('[useStreamMentions] Failed to create stream:', await response.text());
        creatingStreamsRef.current.delete(slug);
        return null;
      }

      const { stream } = await response.json();
      creatingStreamsRef.current.delete(slug);
      
      // Notify parent of newly created stream
      if (onStreamCreated) {
        onStreamCreated(stream);
      }
      
      return stream.id;
    } catch (error) {
      console.error('[useStreamMentions] Error creating stream:', error);
      creatingStreamsRef.current.delete(slug);
      return null;
    }
  }, [streams, onStreamCreated]);

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

    // Filter out hashtags that are at the end of text (user might still be typing)
    const hashtagsToProcess = hashtags.filter(tag => {
      // If hashtag is at the very end of text, skip it (user still typing)
      const hashtagPattern = `#${tag}`;
      const isAtEnd = text.endsWith(hashtagPattern); // Use original text, not trimmed
      // If there's only one hashtag and it's at the end, don't process yet
      if (isAtEnd && hashtags.length === 1) {
        return false;
      }
      return true;
    });

    // Filter out already processed hashtags
    const newHashtags = hashtagsToProcess.filter(tag => !processedHashtagsRef.current.has(tag));
    
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
    }, 1500); // 1500ms debounce - increased to prevent partial stream creation

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]); // Only depend on text to avoid infinite loops

  return {
    parseHashtags,
    findOrCreateStream,
  };
}

