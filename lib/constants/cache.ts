/**
 * Centralized Cache and Timing Constants
 * 
 * Single source of truth for all timing-related values in the application.
 * Eliminates magic numbers scattered across codebase.
 * 
 * Organization:
 * - CACHE_TIMES: React Query and data freshness
 * - PAGE_SIZES: Pagination and infinite scroll
 * - REALTIME: Debounce, throttle, animations
 * - UI: User interface timing
 */

/**
 * Data caching configuration for React Query and similar patterns
 */
export const CACHE_TIMES = {
  /** Data considered fresh - no refetch (5 minutes) */
  STALE_TIME: 5 * 60 * 1000,
  
  /** Data kept in memory after unmount (30 minutes) */
  GC_TIME: 30 * 60 * 1000,
  
  /** Short cache for frequently changing data (1 minute) */
  SHORT_STALE_TIME: 1 * 60 * 1000,
  
  /** Long cache for stable data (1 hour) */
  LONG_STALE_TIME: 60 * 60 * 1000,
} as const;

/**
 * Pagination and infinite scroll configuration
 */
export const PAGE_SIZES = {
  /** Server-side initial load for home feed */
  SSR_INITIAL: 50,
  
  /** Client-side infinite scroll page size */
  CLIENT_PAGE: 20,
  
  /** Maximum allowed per request (safety limit) */
  MAX_LIMIT: 50,
  
  /** Comments per page */
  COMMENTS_PAGE: 50,
  
  /** Notifications per load */
  NOTIFICATIONS_PAGE: 20,
  
  /** Search results per page */
  SEARCH_PAGE: 20,
} as const;

/**
 * Real-time and event handling configuration
 */
export const REALTIME = {
  /** Debounce for resize handlers (ms) */
  RESIZE_DEBOUNCE_MS: 100,
  
  /** Debounce for search input (ms) */
  SEARCH_DEBOUNCE_MS: 300,
  
  /** Subscription reconnect delay (ms) */
  RECONNECT_DELAY_MS: 1000,
  
  /** Typing indicator timeout (ms) */
  TYPING_TIMEOUT_MS: 3000,
  
  /** Throttle for scroll handlers (ms) */
  SCROLL_THROTTLE_MS: 100,
} as const;

/**
 * UI timing and animation configuration
 */
export const UI_TIMING = {
  /** Prefetch hover delay before triggering (ms) */
  PREFETCH_DELAY_MS: 150,
  
  /** Comment highlight duration after navigation (ms) */
  HIGHLIGHT_DURATION_MS: 2000,
  
  /** Toast notification duration (ms) */
  TOAST_DURATION_MS: 4000,
  
  /** Modal close animation duration (ms) */
  MODAL_CLOSE_MS: 200,
  
  /** Tooltip show delay (ms) */
  TOOLTIP_DELAY_MS: 300,
  
  /** Image preload idle timeout (ms) */
  IMAGE_PRELOAD_TIMEOUT_MS: 2000,
  
  /** Animation debounce for scroll events (ms) */
  ANIMATION_DEBOUNCE_MS: 16, // ~60fps
} as const;

/**
 * Virtualization configuration
 */
export const VIRTUALIZATION = {
  /** Threshold for enabling comment virtualization */
  COMMENT_THRESHOLD: 30,
  
  /** Base height estimate for a comment (px) */
  COMMENT_BASE_HEIGHT: 80,
  
  /** Height estimate for a reply (px) */
  REPLY_HEIGHT: 72,
  
  /** Overscan count for virtual lists */
  OVERSCAN: 5,
} as const;

