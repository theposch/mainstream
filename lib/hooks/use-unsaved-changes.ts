"use client";

import { useEffect } from "react";

/**
 * Hook to warn users about unsaved changes when navigating away from a page.
 * Shows a browser confirmation dialog when the user tries to close or navigate away
 * while there are pending changes.
 * 
 * @param hasPendingChanges - Whether there are unsaved changes
 */
export function useUnsavedChanges(hasPendingChanges: boolean): void {
  useEffect(() => {
    if (!hasPendingChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard way to show the confirmation dialog
      e.preventDefault();
      // For older browsers, we need to return a string
      // Modern browsers ignore the custom message and show their own
      return "You have unsaved changes. Are you sure you want to leave?";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasPendingChanges]);
}

