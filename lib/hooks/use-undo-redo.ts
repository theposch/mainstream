"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcut } from "./use-keyboard-shortcut";

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  debounceMs?: number;
}

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (newState: T, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Hook to manage undo/redo functionality for any state.
 * Uses a single state object to avoid race conditions.
 * Groups rapid changes (like typing) into single history entries.
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50, debounceMs = 300 } = options;
  
  // Single state object to batch all updates
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });
  
  // Debounce timer for grouping rapid changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Track if we're in undo/redo to skip adding to history
  const isUndoRedoRef = useRef(false);
  // Track if we're in a change "burst" (rapid successive changes)
  const inBurstRef = useRef(false);
  // Capture the state at the START of a burst (the "before" state)
  const burstStartStateRef = useRef<T | null>(null);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // Update state and manage history
  const setState = useCallback((newState: T, skipHistory = false) => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (skipHistory || isUndoRedoRef.current) {
      // Just update present without affecting history
      setHistory(prev => ({ ...prev, present: newState }));
      return;
    }

    // Check if this is the start of a new burst (BEFORE async setHistory)
    const isNewBurst = !inBurstRef.current;
    if (isNewBurst) {
      inBurstRef.current = true;
    }

    // Update present immediately for responsive UI
    // Also capture the "before" state on first change of a burst
    setHistory(prev => {
      if (isNewBurst) {
        burstStartStateRef.current = prev.present;
      }
      return { ...prev, present: newState };
    });

    // Debounce adding to history (groups rapid changes like typing)
    debounceTimerRef.current = setTimeout(() => {
      const stateBeforeChanges = burstStartStateRef.current;
      
      // Reset burst tracking
      inBurstRef.current = false;
      burstStartStateRef.current = null;
      
      if (stateBeforeChanges !== null) {
        setHistory(prev => {
          const newPast = [...prev.past, stateBeforeChanges];
          return {
            past: newPast.length > maxHistorySize 
              ? newPast.slice(newPast.length - maxHistorySize) 
              : newPast,
            present: prev.present,
            future: [], // Clear redo stack on new change
          };
        });
      }
    }, debounceMs);
  }, [maxHistorySize, debounceMs]);

  // Undo - go back one step
  const undo = useCallback(() => {
    // Clear any pending debounce first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // If we're in a burst, we need to save the burst start state first
    // so the user can redo back to current state
    const hadPendingBurst = inBurstRef.current && burstStartStateRef.current !== null;
    
    // Reset burst tracking
    inBurstRef.current = false;
    const burstStartState = burstStartStateRef.current;
    burstStartStateRef.current = null;

    isUndoRedoRef.current = true;
    
    setHistory(prev => {
      // If there was a pending burst, save it to history first
      let currentPast = prev.past;
      const currentPresent = prev.present;
      
      if (hadPendingBurst && burstStartState !== null) {
        // Add the burst start state to past, then undo from current
        currentPast = [...prev.past, burstStartState];
      }
      
      if (currentPast.length === 0) return prev;
      
      const newPast = [...currentPast];
      const previous = newPast.pop()!;
      
      return {
        past: newPast,
        present: previous,
        future: [currentPresent, ...prev.future],
      };
    });

    // Reset flag after React processes the update
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, []);

  // Redo - go forward one step
  const redo = useCallback(() => {
    // Clear any pending debounce first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    // Reset burst tracking
    inBurstRef.current = false;
    burstStartStateRef.current = null;

    isUndoRedoRef.current = true;
    
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const [next, ...newFuture] = prev.future;
      
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });

    // Reset flag after React processes the update
    requestAnimationFrame(() => {
      isUndoRedoRef.current = false;
    });
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    inBurstRef.current = false;
    burstStartStateRef.current = null;
    setHistory(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  // Register keyboard shortcuts (only when NOT in form fields)
  // Mac: Cmd+Z / Cmd+Shift+Z
  useKeyboardShortcut(["Meta", "z"], undo, { enableOnFormTags: false });
  useKeyboardShortcut(["Meta", "Shift", "z"], redo, { enableOnFormTags: false });
  // Windows/Linux: Ctrl+Z / Ctrl+Shift+Z
  useKeyboardShortcut(["Control", "z"], undo, { enableOnFormTags: false });
  useKeyboardShortcut(["Control", "Shift", "z"], redo, { enableOnFormTags: false });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
