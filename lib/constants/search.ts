/**
 * Search constants
 * Centralized configuration for search functionality
 */

export const SEARCH_CONSTANTS = {
  // Number of items to show in autocomplete suggestions
  MAX_ASSET_SUGGESTIONS: 5,
  MAX_PROJECT_SUGGESTIONS: 3,
  MAX_USER_SUGGESTIONS: 2,
  MAX_TEAM_SUGGESTIONS: 2,
  MAX_RECENT_SEARCHES_SHOWN: 5,
  
  // UI constants
  MAX_DROPDOWN_HEIGHT: 500, // px
  DEBOUNCE_DELAY: 300, // ms
  
  // Storage
  RECENT_SEARCHES_STORAGE_KEY: "cosmos-recent-searches",
  MAX_RECENT_SEARCHES_STORED: 10,
} as const;



