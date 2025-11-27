/**
 * Stream Constants
 * 
 * Central location for stream-related validation rules and constants
 * Migrated from lib/mock-data/streams.ts to remove mock data dependencies
 */

export const STREAM_VALIDATION = {
  MIN_STREAM_NAME_LENGTH: 2,
  MAX_STREAM_NAME_LENGTH: 50,
  MIN_STREAM_DESCRIPTION_LENGTH: 0,
  MAX_STREAM_DESCRIPTION_LENGTH: 500,
  MIN_STREAMS_PER_ASSET: 1,
  MAX_STREAMS_PER_ASSET: 5,
  MAX_RECENT_SEARCHES_SHOWN: 5,
} as const;

export type StreamStatus = 'active' | 'archived';
export type StreamOwnerType = 'user' | 'team';

/**
 * Validates stream name format (slug)
 * - lowercase letters
 * - numbers
 * - hyphens (but not at start or end)
 * - minimum 2 characters
 */
export function isValidStreamName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const trimmed = name.trim();
  
  if (trimmed.length < STREAM_VALIDATION.MIN_STREAM_NAME_LENGTH) return false;
  if (trimmed.length > STREAM_VALIDATION.MAX_STREAM_NAME_LENGTH) return false;
  
  // Must match slug format
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmed);
}

/**
 * Validates stream description length
 */
export function isValidStreamDescription(description: string | null | undefined): boolean {
  if (!description) return true; // Description is optional
  
  return description.length <= STREAM_VALIDATION.MAX_STREAM_DESCRIPTION_LENGTH;
}

