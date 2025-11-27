/**
 * Color utility functions for color search and matching
 */

// Color matching threshold (lower = more strict, higher = more lenient)
// Increased to 60 for more results while maintaining relevance
export const COLOR_MATCH_THRESHOLD = 60;

// Maximum recent colors to store
export const MAX_RECENT_COLORS = 10;

// LocalStorage key for recent color searches
export const RECENT_COLORS_STORAGE_KEY = "cosmos_recent_color_searches";

/**
 * RGB color interface
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., "#ff5733" or "ff5733")
 * @returns RGB object with r, g, b values (0-255)
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Parse hex string to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Calculate Euclidean distance between two colors in RGB space
 * @param color1 - First color (hex string or RGB object)
 * @param color2 - Second color (hex string or RGB object)
 * @returns Distance value (0 = identical, ~442 = max distance)
 */
export function colorDistance(
  color1: string | RGB,
  color2: string | RGB
): number {
  const rgb1 = typeof color1 === "string" ? hexToRgb(color1) : color1;
  const rgb2 = typeof color2 === "string" ? hexToRgb(color2) : color2;
  
  // Euclidean distance formula: sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)
  const distance = Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
  
  return distance;
}

/**
 * Check if two colors are similar within a threshold
 * @param color1 - First color (hex string)
 * @param color2 - Second color (hex string)
 * @param threshold - Maximum distance to consider similar (default: 30)
 * @returns True if colors are similar
 */
export function areColorsSimilar(
  color1: string,
  color2: string,
  threshold: number = COLOR_MATCH_THRESHOLD
): boolean {
  return colorDistance(color1, color2) <= threshold;
}

// Note: findAssetsByColor() and getPopularColors() removed
// Color search is now handled server-side by /api/search endpoint
// See components/search/search-results.tsx for implementation

/**
 * Get recent color searches from localStorage
 * @returns Array of hex colors
 */
export function getRecentColors(): string[] {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to load recent colors:", error);
    return [];
  }
}

/**
 * Add a color to recent searches
 * @param color - Hex color to add
 */
export function addRecentColor(color: string): void {
  if (typeof window === "undefined") return;
  
  try {
    const recent = getRecentColors();
    
    // Remove if already exists (to move to front)
    const filtered = recent.filter(c => c.toLowerCase() !== color.toLowerCase());
    
    // Add to front and limit to max
    const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
    
    localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save recent color:", error);
  }
}

/**
 * Clear recent color searches
 */
export function clearRecentColors(): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.removeItem(RECENT_COLORS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear recent colors:", error);
  }
}

/**
 * Validate hex color format
 * @param hex - Hex color string
 * @returns True if valid hex color
 */
export function isValidHex(hex: string): boolean {
  return /^#?[0-9A-F]{6}$/i.test(hex);
}

/**
 * Ensure hex color has # prefix
 * @param hex - Hex color string
 * @returns Hex color with # prefix
 */
export function normalizeHex(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

