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

    // Immediately update present for responsive UI
    setHistory(prev => ({ ...prev, present: newState }));

    // Debounce adding to history (groups rapid changes like typing)
    debounceTimerRef.current = setTimeout(() => {
      setHistory(prev => {
        // Add current state to history
        const newPast = [...prev.past, prev.present];
        
        return {
          past: newPast.length > maxHistorySize 
            ? newPast.slice(newPast.length - maxHistorySize) 
            : newPast,
          present: newState,
          future: [], // Clear redo stack on new change
        };
      });
    }, debounceMs);
  }, [maxHistorySize, debounceMs]);

  // Undo - go back one step
  const undo = useCallback(() => {
    // Clear any pending debounce first
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    isUndoRedoRef.current = true;
    
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
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
    setHistory(prev => ({
      past: [],
      present: prev.present,
      future: [],
    }));
  }, []);

  // Register keyboard shortcuts (only when NOT in form fields)
  useKeyboardShortcut(["Meta", "z"], undo, { enableOnFormTags: false });
  useKeyboardShortcut(["Meta", "Shift", "z"], redo, { enableOnFormTags: false });

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
