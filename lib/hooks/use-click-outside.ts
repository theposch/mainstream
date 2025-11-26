import { useEffect, RefObject } from "react";

/**
 * Click outside hook
 * Detects clicks outside a specified element and executes a callback
 * 
 * @param ref - React ref to the element to detect clicks outside of
 * @param handler - Function to execute when click outside is detected
 * @param enabled - Whether the hook is enabled (default: true)
 * 
 * @example
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * useClickOutside(dropdownRef, () => {
 *   setIsOpen(false);
 * });
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      
      // Do nothing if clicking ref's element or descendent elements
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handler(event);
    };

    // Use capture phase to ensure we catch the event before it bubbles
    document.addEventListener("mousedown", listener, true);
    document.addEventListener("touchstart", listener, true);

    return () => {
      document.removeEventListener("mousedown", listener, true);
      document.removeEventListener("touchstart", listener, true);
    };
  }, [ref, handler, enabled]);
}



