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
 * Now supports pending streams that aren't created until post time
 */
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  pendingStreamNames: string[],
  onPendingStreamsChange: (names: string[]) => void
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

  // Find stream or mark as pending (don't create yet)
  const findOrMarkPending = React.useCallback((streamSlug: string): { id?: string; pending?: string } | null => {
    // Sanitize to valid slug format
    const slug = sanitizeToSlug(streamSlug);
    
    if (!slug || slug.length < 2) {
      return null; // Invalid slug
    }
    
    // Check if stream exists in the provided streams list
    const existing = streams.find(s => s.name === slug);
    
    if (existing) {
      return { id: existing.id }; // Real stream
    }

    // Mark as pending (will be created on post)
    return { pending: slug };
  }, [streams]);

  // Track processed hashtags to prevent infinite loops
  const processedHashtagsRef = React.useRef<Set<string>>(new Set());

  // Sync hashtags with streamIds and pending streams
  const syncStreams = React.useCallback(() => {
    const hashtags = parseHashtags(text);
    
    if (hashtags.length === 0) {
      // No hashtags in text - clear all
      processedHashtagsRef.current.clear();
      onStreamsChange([]);
      onPendingStreamsChange([]);
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

    // Separate real streams from pending streams
    const results = newHashtags.map(tag => findOrMarkPending(tag)).filter(r => r !== null);
    
    const newStreamIds = results.filter(r => r!.id).map(r => r!.id!);
    const newPendingNames = results.filter(r => r!.pending).map(r => r!.pending!);

    // Mark hashtags as processed
    newHashtags.forEach(tag => processedHashtagsRef.current.add(tag));
    
    // Merge with existing selections
    if (newStreamIds.length > 0) {
      const updatedStreamIds = [...new Set([...selectedStreamIds, ...newStreamIds])];
      onStreamsChange(updatedStreamIds);
    }
    
    if (newPendingNames.length > 0) {
      const updatedPending = [...new Set([...pendingStreamNames, ...newPendingNames])];
      onPendingStreamsChange(updatedPending);
    }

    // Remove streams/pending that are no longer in text
    const hashtagSet = new Set(hashtagsToProcess);
    
    // Check if any selected streams should be removed (hashtag deleted from text)
    const streamsToKeep = selectedStreamIds.filter(id => {
      const stream = streams.find(s => s.id === id);
      return stream && hashtagSet.has(stream.name);
    });
    
    if (streamsToKeep.length !== selectedStreamIds.length) {
      onStreamsChange(streamsToKeep);
      // Clear processed set for removed streams
      selectedStreamIds.forEach(id => {
        const stream = streams.find(s => s.id === id);
        if (stream && !hashtagSet.has(stream.name)) {
          processedHashtagsRef.current.delete(stream.name);
        }
      });
    }
    
    // Check if any pending streams should be removed (hashtag deleted from text)
    const pendingToKeep = pendingStreamNames.filter(name => hashtagSet.has(name));
    
    if (pendingToKeep.length !== pendingStreamNames.length) {
      onPendingStreamsChange(pendingToKeep);
      // Clear processed set for removed pending
      pendingStreamNames.forEach(name => {
        if (!hashtagSet.has(name)) {
          processedHashtagsRef.current.delete(name);
        }
      });
    }
  }, [text, parseHashtags, findOrMarkPending, selectedStreamIds, pendingStreamNames, onStreamsChange, onPendingStreamsChange, streams]);

  // Debounced sync (wait for user to stop typing)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncStreams();
    }, 1500); // 1500ms debounce - increased to prevent partial stream creation

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]); // Only depend on text to avoid infinite loops

}

