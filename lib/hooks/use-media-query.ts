"use client";

/**
 * Shared Media Query Hook
 * 
 * Provides efficient, shared media query detection across the application.
 * 
 * Key optimizations:
 * 1. Shared listeners - same query across components uses ONE browser listener
 * 2. Cached values - query results cached to prevent re-evaluation
 * 3. SSR safe - returns false during server render, hydrates on client
 * 
 * Architecture:
 * - Module-level Map stores active listeners by query string
 * - Module-level Map caches current values by query string
 * - Components using same query share the listener
 * - Cleanup removes listener only when no components are listening
 * 
 * Usage:
 * ```tsx
 * const isMobile = useIsMobile();
 * const isLarge = useMediaQuery('(min-width: 1024px)');
 * ```
 */

import { useState, useEffect, useCallback } from "react";

// Module-level cache and listener management
const listenersByQuery = new Map<string, Set<() => void>>();
const valueCache = new Map<string, boolean>();
const mqlCache = new Map<string, MediaQueryList>();

/**
 * Generic media query hook with shared listener optimization
 * 
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR: return false (will hydrate to correct value)
    if (typeof window === "undefined") return false;
    
    // Check cache first
    if (valueCache.has(query)) {
      return valueCache.get(query)!;
    }
    
    // Initialize from browser
    const mql = window.matchMedia(query);
    const initialValue = mql.matches;
    valueCache.set(query, initialValue);
    return initialValue;
  });

  useEffect(() => {
    // Verify we're in browser
    if (typeof window === "undefined") return;

    // Get or create MediaQueryList for this query
    let mql = mqlCache.get(query);
    if (!mql) {
      mql = window.matchMedia(query);
      mqlCache.set(query, mql);
    }

    // Update function for this component
    const updateMatches = () => {
      setMatches(mql!.matches);
    };

    // Initialize listeners set for this query if needed
    if (!listenersByQuery.has(query)) {
      listenersByQuery.set(query, new Set());
      
      // Create the shared handler that updates all listeners
      const sharedHandler = () => {
        const newValue = mql!.matches;
        valueCache.set(query, newValue);
        
        // Notify all components listening to this query
        listenersByQuery.get(query)?.forEach((listener) => listener());
      };
      
      // Attach the single listener to the MediaQueryList
      mql.addEventListener("change", sharedHandler);
      
      // Store cleanup reference on the Set itself
      (listenersByQuery.get(query) as Set<() => void> & { cleanup?: () => void }).cleanup = () => {
        mql!.removeEventListener("change", sharedHandler);
        mqlCache.delete(query);
        valueCache.delete(query);
      };
    }

    // Register this component's update function
    listenersByQuery.get(query)!.add(updateMatches);
    
    // Sync initial value (handles hydration mismatch)
    updateMatches();

    return () => {
      const listeners = listenersByQuery.get(query);
      if (listeners) {
        listeners.delete(updateMatches);
        
        // If no more listeners, clean up the shared listener
        if (listeners.size === 0) {
          const cleanup = (listeners as Set<() => void> & { cleanup?: () => void }).cleanup;
          cleanup?.();
          listenersByQuery.delete(query);
        }
      }
    };
  }, [query]);

  return matches;
}

// Pre-defined breakpoint queries for convenience
const BREAKPOINTS = {
  mobile: "(max-width: 767px)",
  tablet: "(min-width: 768px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px)",
  largeDesktop: "(min-width: 1280px)",
} as const;

/**
 * Check if current viewport is mobile (< 768px)
 * Most common use case, optimized with pre-defined query
 */
export function useIsMobile(): boolean {
  return useMediaQuery(BREAKPOINTS.mobile);
}

/**
 * Check if current viewport is tablet (768px - 1023px)
 */
export function useIsTablet(): boolean {
  return useMediaQuery(BREAKPOINTS.tablet);
}

/**
 * Check if current viewport is desktop (>= 1024px)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.desktop);
}

/**
 * Check if current viewport is large desktop (>= 1280px)
 */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery(BREAKPOINTS.largeDesktop);
}

/**
 * Check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Check if user prefers dark color scheme
 * Useful for detecting system theme preference
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

