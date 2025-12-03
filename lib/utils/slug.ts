/**
 * Slug validation and formatting utilities for stream names
 * Streams use Slack-style channel names: lowercase, hyphens, alphanumeric only
 */

// Regex: lowercase letters, numbers, hyphens (must start/end with alphanumeric)
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 50;
export const SLUG_MIN_LENGTH = 2;

/**
 * Validates if a string is a valid slug format
 * - Must be lowercase letters, numbers, and hyphens only
 * - Must start and end with alphanumeric character
 * - Must be between 2 and 50 characters
 */
export function isValidSlug(slug: string): boolean {
  return (
    SLUG_REGEX.test(slug) && 
    slug.length >= SLUG_MIN_LENGTH && 
    slug.length <= SLUG_MAX_LENGTH
  );
}

/**
 * Sanitizes text to a valid slug format
 * - Converts to lowercase
 * - Removes leading # and spaces
 * - Replaces invalid characters with hyphens
 * - Collapses multiple hyphens
 * - Removes leading/trailing hyphens
 */
export function sanitizeToSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/^#\s*/, '')          // Remove leading # and spaces
    .replace(/[^a-z0-9-]/g, '-')   // Replace invalid chars with hyphen
    .replace(/-+/g, '-')           // Collapse multiple hyphens
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
}

/**
 * Formats a slug for display
 * In Slack-style, we display the slug as-is (no prettification)
 */
export function formatSlugForDisplay(slug: string): string {
  // For UI display, just return slug as-is (no prettification)
  return slug;
}





