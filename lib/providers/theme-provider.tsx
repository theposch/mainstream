"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * Theme Provider
 * 
 * Wraps the application with next-themes for light/dark mode support.
 * - Default theme: dark
 * - Supports: light, dark, system
 * - Persists preference in localStorage
 * - Adds theme class to <html> element
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}

