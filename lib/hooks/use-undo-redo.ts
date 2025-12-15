"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcut } from "./use-keyboard-shortcut";

interface UseUndoRedoOptions {
  maxHistorySize?: number;
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

/**
 * Hook to manage undo/redo functionality for any state.
 * Maintains a history stack and provides keyboard shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z).
 * 
 * @param initialState - The initial state value
 * @param options - Configuration options
 * @returns Object with state, setState, undo, redo, and status flags
 */
export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions = {}
): UseUndoRedoReturn<T> {
  const { maxHistorySize = 50 } = options;
  
  // History stack: past states (most recent at the end)
  const [past, setPast] = useState<T[]>([]);
  // Current state
  const [present, setPresent] = useState<T>(initialState);
  // Future states for redo (most recent at the beginning)
  const [future, setFuture] = useState<T[]>([]);
  
  // Ref to track if we're in the middle of an undo/redo operation
  const isUndoRedoRef = useRef(false);
  
  // Debounce timer for grouping rapid changes
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<T | null>(null);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Update state and manage history
  const setState = useCallback((newState: T, skipHistory = false) => {
    if (skipHistory || isUndoRedoRef.current) {
      // Just update the present without affecting history
      setPresent(newState);
      return;
    }

    // Store the pending state
    pendingStateRef.current = newState;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce history updates to group rapid changes (like typing)
    debounceTimerRef.current = setTimeout(() => {
      setPresent((currentPresent) => {
        // Only add to history if there's actually a change
        if (pendingStateRef.current !== null) {
          setPast((currentPast) => {
            const newPast = [...currentPast, currentPresent];
            // Limit history size
            if (newPast.length > maxHistorySize) {
              return newPast.slice(newPast.length - maxHistorySize);
            }
            return newPast;
          });
          // Clear future when making a new change
          setFuture([]);
        }
        return pendingStateRef.current as T;
      });
      pendingStateRef.current = null;
    }, 300);

    // Immediately update the present state for responsive UI
    setPresent(newState);
  }, [maxHistorySize]);

  // Undo - go back one step
  const undo = useCallback(() => {
    if (!canUndo) return;

    isUndoRedoRef.current = true;
    
    setPast((currentPast) => {
      const newPast = [...currentPast];
      const previous = newPast.pop();
      
      if (previous !== undefined) {
        setFuture((currentFuture) => [present, ...currentFuture]);
        setPresent(previous);
      }
      
      return newPast;
    });

    // Reset the flag after state updates
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [canUndo, present]);

  // Redo - go forward one step
  const redo = useCallback(() => {
    if (!canRedo) return;

    isUndoRedoRef.current = true;
    
    setFuture((currentFuture) => {
      const newFuture = [...currentFuture];
      const next = newFuture.shift();
      
      if (next !== undefined) {
        setPast((currentPast) => [...currentPast, present]);
        setPresent(next);
      }
      
      return newFuture;
    });

    // Reset the flag after state updates
    setTimeout(() => {
      isUndoRedoRef.current = false;
    }, 0);
  }, [canRedo, present]);

  // Clear all history
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  // Register keyboard shortcuts
  // Cmd/Ctrl+Z for undo
  useKeyboardShortcut(["Meta", "z"], undo, { enableOnFormTags: true });
  // Cmd/Ctrl+Shift+Z for redo
  useKeyboardShortcut(["Meta", "Shift", "z"], redo, { enableOnFormTags: true });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync with external state changes (like from server)
  useEffect(() => {
    // If the initial state changes externally, update present
    // This is useful when the parent component receives new data
    if (!isUndoRedoRef.current && initialState !== present) {
      // Only sync if it's not from our own state management
      // This check prevents infinite loops
    }
  }, [initialState]);

  return {
    state: present,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}

