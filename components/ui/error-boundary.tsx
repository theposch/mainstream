"use client";

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child component tree and displays a fallback UI.
 * Prevents a single broken component from crashing the entire application.
 * 
 * Features:
 * - Catches render errors in children
 * - Supports function or element fallback
 * - Provides reset functionality
 * - Optional error callback for logging
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <SomeComponent />
 * </ErrorBoundary>
 * 
 * // With function fallback for reset capability
 * <ErrorBoundary 
 *   fallback={(error, reset) => (
 *     <div>
 *       <p>Something went wrong: {error.message}</p>
 *       <button onClick={reset}>Try again</button>
 *     </div>
 *   )}
 * >
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */

import * as React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback UI to show when error occurs. Can be element or render function. */
  fallback: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /** Optional callback when error is caught (for logging/analytics) */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Call optional error handler for logging
    this.props.onError?.(error, errorInfo);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Error info:', errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback } = this.props;
      
      // Support function fallback for reset capability
      if (typeof fallback === 'function') {
        return fallback(this.state.error, this.reset);
      }
      
      return fallback;
    }

    return this.props.children;
  }
}

/**
 * Hook to programmatically trigger error boundary
 * Useful for async errors that aren't caught by componentDidCatch
 */
export function useErrorHandler() {
  const [, setError] = React.useState<Error | null>(null);
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error; // This will be caught by the nearest ErrorBoundary
    });
  }, []);
}

