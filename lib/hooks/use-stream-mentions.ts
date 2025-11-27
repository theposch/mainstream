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
 * Pills are independent from text - only removed via X button
 */
export function useStreamMentions(
  text: string,
  streams: Stream[],
  selectedStreamIds: string[],
  onStreamsChange: (streamIds: string[]) => void,
  pendingStreamNames: string[],
  onPendingStreamsChange: (names: string[]) => void,
  excludedStreamNames: string[]
) {
  // Parse all hashtags from text and convert to valid slugs
  const parseHashtags = React.useCallback((content: string): string[] => {
    // Match hashtags: any case (a-zA-Z), numbers, hyphens (must start/end with alphanumeric)
    const hashtagRegex = /#([a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)/gi;
    const matches = content.matchAll(hashtagRegex);
    const hashtags: string[] = [];
    
    for (const match of matches) {
      const tag = match[1].toLowerCase(); // Convert to lowercase for storage
      
      // Validate length (2-50 chars per database constraint)
      if (tag.length >= 2 && tag.length <= 50) {
        hashtags.push(tag);
      } else if (tag.length > 50) {
        console.warn(`[useStreamMentions] Hashtag too long (${tag.length} chars), ignoring: #${tag.substring(0, 20)}...`);
      }
      // Tags < 2 chars silently skipped (like #a or #x)
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
  // Auto-sync ONLY ADDS pills, never removes them (removal only via X button)
  const syncStreams = React.useCallback(() => {
    const hashtags = parseHashtags(text);
    
    if (hashtags.length === 0) {
      // No hashtags - do nothing (pills stay independent)
      return;
    }

    // Filter out hashtags that are at the end of text (user might still be typing)
    // Also filter out excluded streams (user removed via X button)
    const hashtagsToProcess = hashtags.filter(tag => {
      // Skip if user explicitly removed this stream
      if (excludedStreamNames.includes(tag)) {
        return false;
      }
      
      // If hashtag is at the very end of text, skip it (user still typing)
      const hashtagPattern = `#${tag}`;
      const isAtEnd = text.endsWith(hashtagPattern);
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

    // ✨ SIMPLIFIED: No text-deletion sync - pills are independent!
    // Pills only removed via X button, which adds to excludedStreamNames
  }, [text, parseHashtags, findOrMarkPending, selectedStreamIds, pendingStreamNames, onStreamsChange, onPendingStreamsChange, streams, excludedStreamNames]);

  // Debounced sync (wait for user to stop typing)
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      syncStreams();
    }, 1500); // 1500ms debounce - increased to prevent partial stream creation

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]); // Only depend on text to avoid infinite loops

}

