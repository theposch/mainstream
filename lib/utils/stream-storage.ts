/**
 * Stream Storage Utilities
 * 
 * Provides localStorage persistence layer for streams.
 * Merges mock data with user-created streams stored in localStorage.
 */

import { Stream, streams as mockStreams } from '@/lib/mock-data/streams';

const STORAGE_KEY = 'cosmos_user_streams';

/**
 * Check if we're in a browser environment
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Get persisted streams from localStorage
 */
function getPersistedStreams(): Stream[] {
  if (!isBrowser) return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[stream-storage] Failed to parse persisted streams:', error);
    return [];
  }
}

/**
 * Save streams to localStorage
 */
function savePersistedStreams(streams: Stream[]): void {
  if (!isBrowser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streams));
    // Dispatch event to notify other components
    window.dispatchEvent(new Event('streams-updated'));
  } catch (error) {
    console.error('[stream-storage] Failed to save streams:', error);
  }
}

/**
 * Get all streams (mock + persisted)
 * Returns a merged list with persisted streams taking precedence
 */
export function getStreams(): Stream[] {
  const persisted = getPersistedStreams();
  const merged = [...mockStreams];
  
  // Add persisted streams that don't exist in mock data
  for (const stream of persisted) {
    const exists = merged.some(s => s.id === stream.id || s.name === stream.name);
    if (!exists) {
      merged.push(stream);
    }
  }
  
  // Sort by most recently updated
  return merged.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Add a new stream to localStorage
 */
export function addStream(stream: Stream): Stream[] {
  const persisted = getPersistedStreams();
  
  // Check if stream already exists (by id or name)
  const exists = persisted.some(s => s.id === stream.id || s.name === stream.name);
  
  if (!exists) {
    persisted.push(stream);
    savePersistedStreams(persisted);
  }
  
  return getStreams();
}

/**
 * Update an existing stream in localStorage
 */
export function updateStream(streamId: string, updates: Partial<Stream>): Stream[] {
  const persisted = getPersistedStreams();
  const index = persisted.findIndex(s => s.id === streamId);
  
  if (index !== -1) {
    persisted[index] = {
      ...persisted[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    savePersistedStreams(persisted);
  }
  
  return getStreams();
}

/**
 * Get stream by slug (checks both mock and persisted)
 */
export function getStreamBySlug(slug: string): Stream | undefined {
  const allStreams = getStreams();
  return allStreams.find(s => s.name === slug);
}

/**
 * Get stream by ID (checks both mock and persisted)
 */
export function getStreamById(id: string): Stream | undefined {
  const allStreams = getStreams();
  return allStreams.find(s => s.id === id);
}

/**
 * Check if a stream name (slug) is available
 */
export function isStreamNameAvailable(name: string): boolean {
  const allStreams = getStreams();
  return !allStreams.some(s => s.name.toLowerCase() === name.toLowerCase());
}

/**
 * Clear all persisted streams (for testing/debugging)
 */
export function clearPersistedStreams(): void {
  if (!isBrowser) return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('streams-updated'));
    console.log('[stream-storage] Cleared all persisted streams');
  } catch (error) {
    console.error('[stream-storage] Failed to clear streams:', error);
  }
}

/**
 * Listen for stream updates across tabs/components
 */
export function onStreamsUpdated(callback: () => void): () => void {
  if (!isBrowser) return () => {};
  
  const handler = () => callback();
  window.addEventListener('streams-updated', handler);
  
  // Return cleanup function
  return () => window.removeEventListener('streams-updated', handler);
}

/**
 * Get count of persisted streams (user-created)
 */
export function getPersistedStreamCount(): number {
  return getPersistedStreams().length;
}

