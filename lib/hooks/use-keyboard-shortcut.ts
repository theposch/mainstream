import { useEffect, useCallback } from "react";

/**
 * Keyboard shortcut hook
 * Listens for keyboard shortcuts and executes a callback
 * 
 * @param keys - Array of keys to listen for (e.g., ['Meta', 'k'] for Cmd+K)
 * @param callback - Function to execute when shortcut is pressed
 * @param options - Optional configuration
 * 
 * @example
 * useKeyboardShortcut(['Meta', 'k'], () => {
 *   searchInputRef.current?.focus();
 * }, { preventDefault: true });
 */
export function useKeyboardShortcut(
  keys: string[],
  callback: () => void,
  options: {
    preventDefault?: boolean;
    enableOnFormTags?: boolean;
  } = {}
) {
  const { preventDefault = true, enableOnFormTags = false } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea (unless explicitly enabled)
      if (!enableOnFormTags) {
        const target = event.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      // Check if all keys in the combination are pressed
      const keysPressed = keys.every((key) => {
        if (key === "Meta") return event.metaKey;
        if (key === "Control") return event.ctrlKey;
        if (key === "Alt") return event.altKey;
        if (key === "Shift") return event.shiftKey;
        return event.key.toLowerCase() === key.toLowerCase();
      });

      if (keysPressed) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback();
      }
    },
    [keys, callback, preventDefault, enableOnFormTags]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}



