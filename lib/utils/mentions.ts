/**
 * Mention Utilities
 * 
 * Utilities for parsing and handling @mentions in comments.
 * 
 * Pattern: @username (alphanumeric, underscore, hyphen, 3-30 chars)
 */

/**
 * Regex pattern for matching @mentions
 * Matches @username where username follows the database constraint:
 * - 3-30 characters
 * - alphanumeric, underscore, hyphen only
 */
export const MENTION_PATTERN = /@([a-zA-Z0-9_-]{3,30})(?=\s|$|[.,!?;:])/g;

/**
 * Extract all @username mentions from text
 * Returns unique, lowercased usernames (database stores lowercase)
 */
export function extractMentions(text: string): string[] {
  const mentions: Set<string> = new Set();
  const matches = text.matchAll(MENTION_PATTERN);
  
  for (const match of matches) {
    // Username is in capture group 1, normalize to lowercase
    mentions.add(match[1].toLowerCase());
  }
  
  return Array.from(mentions);
}

/**
 * Check if text contains any mentions
 */
export function hasMentions(text: string): boolean {
  // Create new regex instance to avoid global state issues
  const regex = new RegExp(MENTION_PATTERN.source);
  return regex.test(text);
}

/**
 * Split text into segments of plain text and mentions
 * Used for rendering mentions as links
 */
export interface TextSegment {
  type: 'text' | 'mention';
  content: string;
  username?: string; // Only for mention type
}

export function parseTextWithMentions(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  
  // Reset regex state (global regex maintains state)
  const regex = new RegExp(MENTION_PATTERN.source, 'g');
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    // Add text before this mention
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }
    
    // Add the mention
    segments.push({
      type: 'mention',
      content: match[0], // Full match including @
      username: match[1].toLowerCase(),
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last mention
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }
  
  // If no mentions found, return entire text as single segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: text,
    });
  }
  
  return segments;
}

