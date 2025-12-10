/**
 * String Utility Functions
 * 
 * Pure functions for string manipulation used across the application.
 * Defined at module level for optimal performance (no closure recreation).
 */

/**
 * Get initials from a name string
 * 
 * Examples:
 * - "John Doe" → "JD"
 * - "Alice" → "A"
 * - "John Michael Doe" → "JM"
 * 
 * @param name - The name to extract initials from
 * @returns Uppercase initials (max 2 characters)
 */
export function getInitials(name: string): string {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate a string to a maximum length with ellipsis
 * 
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with '...' if needed
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize the first letter of a string
 * 
 * @param str - The string to capitalize
 * @returns String with first letter capitalized
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to title case
 * 
 * @param str - The string to convert
 * @returns String in title case
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Slugify a string for URL use
 * 
 * @param str - The string to slugify
 * @returns URL-safe slug
 */
export function slugify(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Pluralize a word based on count
 * 
 * @param word - The singular form of the word
 * @param count - The count to check
 * @param pluralForm - Optional custom plural form (defaults to word + 's')
 * @returns Pluralized word
 */
export function pluralize(word: string, count: number, pluralForm?: string): string {
  return count === 1 ? word : (pluralForm || `${word}s`);
}

