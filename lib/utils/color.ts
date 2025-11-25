/**
 * Color utility functions for color search and matching
 */

import { assets } from "@/lib/mock-data/assets";

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

/**
 * Find assets with colors similar to the target color, sorted by closest match
 * @param targetColor - Hex color to search for
 * @param threshold - Maximum distance to consider similar (default: 60)
 * @returns Array of asset IDs sorted by color similarity (closest first)
 */
export function findAssetsByColor(
  targetColor: string,
  threshold: number = COLOR_MATCH_THRESHOLD
): string[] {
  interface AssetMatch {
    id: string;
    distance: number;
  }
  
  const matches: AssetMatch[] = [];
  
  for (const asset of assets) {
    let closestDistance = Infinity;
    
    // Check dominant color
    if (asset.dominantColor) {
      const distance = colorDistance(targetColor, asset.dominantColor);
      if (distance < closestDistance) {
        closestDistance = distance;
      }
    }
    
    // Check color palette
    if (asset.colorPalette) {
      for (const color of asset.colorPalette) {
        const distance = colorDistance(targetColor, color);
        if (distance < closestDistance) {
          closestDistance = distance;
        }
      }
    }
    
    // Add to matches if within threshold
    if (closestDistance <= threshold) {
      matches.push({
        id: asset.id,
        distance: closestDistance,
      });
    }
  }
  
  // Sort by distance (closest first)
  matches.sort((a, b) => a.distance - b.distance);
  
  // Return just the IDs in sorted order
  return matches.map(match => match.id);
}

/**
 * Get the most popular colors from all assets (for suggestions)
 * @param limit - Maximum number of colors to return (default: 12)
 * @returns Array of hex colors sorted by frequency
 */
export function getPopularColors(limit: number = 12): string[] {
  const colorCounts = new Map<string, number>();
  
  // Count color occurrences across all assets
  for (const asset of assets) {
    if (asset.dominantColor) {
      colorCounts.set(
        asset.dominantColor,
        (colorCounts.get(asset.dominantColor) || 0) + 2 // Weight dominant color more
      );
    }
    
    if (asset.colorPalette) {
      for (const color of asset.colorPalette) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }
  }
  
  // Sort by frequency and return top N
  return Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color]) => color);
}

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

